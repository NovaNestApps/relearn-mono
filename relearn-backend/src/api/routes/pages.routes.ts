// src/api/routes/pages.routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';

// Validation schemas
const createPageSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(1000),
  content: z.string().min(1),
  images: z.array(z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(1000).optional(),
  content: z.string().min(1).optional(),
  images: z.array(z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const querySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
  search: z.string().optional(),
});

export default async function pageRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authMiddleware);

  // Create page
  app.post('/', async (request, reply) => {
    const body = createPageSchema.parse(request.body);
    const userId = request.user.userId;

    const page = await prisma.page.create({
      data: {
        userId,
        url: body.url,
        title: body.title,
        content: body.content,
        images: body.images as any,
        metadata: body.metadata as any,
      },
    });

    // Enqueue concept extraction (fire-and-forget)
    const { conceptQueue } = await import('../../llm/queue');
    conceptQueue.add('extract-concepts', {
      pageId: page.id,
      userId: page.userId,
      content: page.content,
      title: page.title,
    }).catch(() => { /* non-blocking */ });

    return reply.status(201).send({ page });
  });

  // Get all pages for user (with pagination)
  app.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query);
    const userId = request.user.userId;

    const skip = (query.page - 1) * query.limit;

    // Build where clause
    const where: any = { userId };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { url: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get pages and total count
    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          url: true,
          title: true,
          content: false, // Don't return full content in list
          images: true,
          metadata: true,
          extractedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.page.count({ where }),
    ]);

    return reply.send({
      pages,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  // Get single page by ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        summaries: {
          orderBy: { createdAt: 'desc' },
        },
        flashcards: {
          orderBy: { createdAt: 'desc' },
        },
        quizzes: {
          include: {
            questions: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Check ownership
    if (page.userId !== userId) {
      throw new ForbiddenError('You do not have access to this page');
    }

    return reply.send({ page });
  });

  // Update page
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updatePageSchema.parse(request.body);
    const userId = request.user.userId;

    // Check if page exists and user owns it
    const existingPage = await prisma.page.findUnique({
      where: { id },
    });

    if (!existingPage) {
      throw new NotFoundError('Page not found');
    }

    if (existingPage.userId !== userId) {
      throw new ForbiddenError('You do not have access to this page');
    }

    // Update page
    const page = await prisma.page.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.content && { content: body.content }),
        ...(body.images && { images: body.images as any }),
        ...(body.metadata && { metadata: body.metadata as any }),
      },
    });

    return reply.send({ page });
  });

  // Delete page
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    // Check if page exists and user owns it
    const existingPage = await prisma.page.findUnique({
      where: { id },
    });

    if (!existingPage) {
      throw new NotFoundError('Page not found');
    }

    if (existingPage.userId !== userId) {
      throw new ForbiddenError('You do not have access to this page');
    }

    // Delete page (cascades to summaries, flashcards, quizzes)
    await prisma.page.delete({
      where: { id },
    });

    return reply.status(204).send();
  });

  // Bulk delete pages
  app.post('/bulk-delete', async (request, reply) => {
    const { ids } = request.body as { ids: string[] };
    const userId = request.user.userId;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('ids must be a non-empty array');
    }

    // Delete only pages owned by the user
    const result = await prisma.page.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return reply.send({
      message: `Deleted ${result.count} pages`,
      count: result.count,
    });
  });
}