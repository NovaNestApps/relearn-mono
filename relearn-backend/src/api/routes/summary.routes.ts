// src/api/routes/summary.routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { summaryQueue } from '../../llm/queue';

const createSummarySchema = z.object({
  pageId: z.string().uuid(),
  type: z.enum(['default', 'brief', 'detailed']).default('default'),
});

export default async function summaryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // ============================================
  // NEW: Get all summaries for authenticated user
  // ============================================
  app.get('/', async (request, reply) => {
    const userId = request.user.userId;

    // Parse query parameters
    const { page = '1', limit = '50' } = request.query as { page?: string; limit?: string };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch summaries with pagination
    const [summaries, total] = await Promise.all([
      prisma.summary.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip: skip,
        include: {
          page: {
            select: {
              id: true,
              url: true,
              title: true,
              extractedAt: true,
            },
          },
        },
      }),
      prisma.summary.count({
        where: { userId },
      }),
    ]);

    return reply.send({
      summaries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // Create summary (will be processed by LLM queue)
  app.post('/', async (request, reply) => {
    const body = createSummarySchema.parse(request.body);
    const userId = request.user.userId;

    // Verify page exists and user owns it
    const page = await prisma.page.findUnique({
      where: { id: body.pageId },
    });

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    if (page.userId !== userId) {
      throw new ForbiddenError('You do not have access to this page');
    }

    // Check if summary already exists for this type
    const existingSummary = await prisma.summary.findFirst({
      where: {
        pageId: body.pageId,
        type: body.type,
      },
    });

    if (existingSummary) {
      return reply.send({
        summary: existingSummary,
        message: 'Summary already exists',
      });
    }

    // Create placeholder summary
    const summary = await prisma.summary.create({
      data: {
        userId,
        pageId: body.pageId,
        content: 'Processing...', // Will be updated by background job
        type: body.type,
      },
    });

    // Add to job queue
    await summaryQueue.add('generate-summary', {
      summaryId: summary.id,
      pageContent: page.content,
      type: body.type,
    });

    return reply.status(201).send({
      summary,
      message: 'Summary generation started',
    });
  });

  // Get summaries for a page
  app.get('/page/:pageId', async (request, reply) => {
    const { pageId } = request.params as { pageId: string };
    const userId = request.user.userId;

    // Verify page exists and user owns it
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    if (page.userId !== userId) {
      throw new ForbiddenError('You do not have access to this page');
    }

    const summaries = await prisma.summary.findMany({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ summaries });
  });

  // Get single summary
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const summary = await prisma.summary.findUnique({
      where: { id },
      include: {
        page: {
          select: {
            id: true,
            title: true,
            url: true,
          },
        },
      },
    });

    if (!summary) {
      throw new NotFoundError('Summary not found');
    }

    if (summary.userId !== userId) {
      throw new ForbiddenError('You do not have access to this summary');
    }

    return reply.send({ summary });
  });

  // Delete summary
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const summary = await prisma.summary.findUnique({
      where: { id },
    });

    if (!summary) {
      throw new NotFoundError('Summary not found');
    }

    if (summary.userId !== userId) {
      throw new ForbiddenError('You do not have access to this summary');
    }

    await prisma.summary.delete({
      where: { id },
    });

    return reply.status(204).send();
  });

  // Add this to your summary.routes.ts

  // Get job status
  app.get('/job/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const userId = request.user.userId;

    try {
      // Get job from queue
      const job = await summaryQueue.getJob(jobId);

      if (!job) {
        throw new NotFoundError('Job not found');
      }

      // Get the summary associated with this job
      const summary = await prisma.summary.findUnique({
        where: { id: job.data.summaryId },
        include: {
          page: {
            select: {
              id: true,
              title: true,
              url: true,
            },
          },
        },
      });

      if (!summary) {
        throw new NotFoundError('Summary not found');
      }

      if (summary.userId !== userId) {
        throw new ForbiddenError('You do not have access to this summary');
      }

      // Get job state
      const state = await job.getState();

      // Get progress (it's a property, not a function)
      const progress = job.progress || 0;

      return reply.send({
        jobId: job.id,
        state, // 'waiting', 'active', 'completed', 'failed', 'delayed'
        progress,
        summary: state === 'completed' ? summary : null,
        createdAt: job.timestamp,
        processedAt: job.processedOn,
        finishedAt: job.finishedOn,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }

      // If job doesn't exist in queue anymore, check if summary is complete
      const summary = await prisma.summary.findFirst({
        where: {
          id: jobId, // Try using jobId as summaryId
          userId,
        },
        include: {
          page: {
            select: {
              id: true,
              title: true,
              url: true,
            },
          },
        },
      });

      if (summary && summary.content !== 'Processing...') {
        // Job completed and was cleaned up
        return reply.send({
          jobId,
          state: 'completed',
          progress: 100,
          summary,
        });
      }

      throw new NotFoundError('Job not found');
    }
  });

  // Create/save summary (no generation, just save)
app.post('/generate', async (request, reply) => {
  const { pageId, content } = request.body as { pageId: string; content: string };
  const userId = request.user.userId;

  // Verify page exists and user owns it
  const page = await prisma.page.findUnique({
    where: { id: pageId },
  });

  if (!page) {
    throw new NotFoundError('Page not found');
  }

  if (page.userId !== userId) {
    throw new ForbiddenError('You do not have access to this page');
  }

  // Return existing summary rather than creating a duplicate
  const existing = await prisma.summary.findFirst({
    where: { pageId, userId, type: 'default' },
  });

  if (existing) {
    return reply.send({ summary: existing, message: 'Summary already exists' });
  }

  // Create summary directly (no job)
  const summary = await prisma.summary.create({
    data: {
      userId,
      pageId,
      content,
      type: 'default',
    },
  });

  return reply.status(201).send({
    summary,
    message: 'Summary saved',
  });
});
}