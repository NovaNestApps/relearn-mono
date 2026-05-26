// src/api/routes/flashcard.routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';

const generateFlashcardsSchema = z.object({
  pageId: z.string().uuid(),
  count: z.number().min(1).max(50).default(10),
});

const createFlashcardSchema = z.object({
  pageId: z.string().uuid(),
  question: z.string().min(1),
  answer: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

const updateFlashcardSchema = z.object({
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

export default async function flashcardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Generate flashcards from page (AI-powered)
  app.post('/generate', async (request, reply) => {
    const body = generateFlashcardsSchema.parse(request.body);
    const userId = request.user.userId;

    const page = await prisma.page.findUnique({
      where: { id: body.pageId },
    });

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    if (page.userId !== userId) {
      throw new ForbiddenError('You do not have access to this page');
    }

    const { flashcardQueue } = await import('../../llm/queue');
    const job = await flashcardQueue.add('generate-flashcards', {
      pageId: body.pageId,
      userId,
      pageContent: page.content,
      count: body.count,
    });

    return reply.status(202).send({
      message: 'Flashcard generation started',
      pageId: body.pageId,
      jobId: job.id,
      expectedCount: body.count,
    });
  });

  app.post('/', async (request, reply) => {
    const body = createFlashcardSchema.parse(request.body);
    const userId = request.user.userId;

    const page = await prisma.page.findUnique({
      where: { id: body.pageId },
    });

    if (!page || page.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const flashcard = await prisma.flashcard.create({
      data: {
        userId,
        pageId: body.pageId,
        question: body.question,
        answer: body.answer,
        difficulty: body.difficulty,
      },
    });

    return reply.status(201).send({ flashcard });
  });

  app.get('/page/:pageId', async (request, reply) => {
    const { pageId } = request.params as { pageId: string };
    const userId = request.user.userId;

    const flashcards = await prisma.flashcard.findMany({
      where: { pageId, userId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ flashcards, data: flashcards });
  });

  app.get('/', async (request, reply) => {
    const { pageId } = request.query as { pageId?: string };
    const userId = request.user.userId;

    if (!pageId) {
      throw new ValidationError('pageId is required');
    }

    const flashcards = await prisma.flashcard.findMany({
      where: { pageId, userId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ flashcards, data: flashcards });
  });

  app.get('/summary/:summaryId', async (request, reply) => {
    const { summaryId } = request.params as { summaryId: string };
    const userId = request.user.userId;

    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
      select: { id: true, pageId: true, userId: true },
    });

    if (!summary) {
      throw new NotFoundError('Summary not found');
    }

    if (summary.userId !== userId) {
      throw new ForbiddenError('You do not have access to this summary');
    }

    const flashcards = await prisma.flashcard.findMany({
      where: { pageId: summary.pageId, userId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ flashcards, data: flashcards });
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const flashcard = await prisma.flashcard.findUnique({
      where: { id },
    });

    if (!flashcard || flashcard.userId !== userId) {
      throw new NotFoundError('Flashcard not found');
    }

    return reply.send({ flashcard });
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateFlashcardSchema.parse(request.body);
    const userId = request.user.userId;

    const flashcard = await prisma.flashcard.update({
      where: { id, userId },
      data: body,
    });

    return reply.send({ flashcard });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    await prisma.flashcard.delete({
      where: { id, userId },
    });

    return reply.status(204).send();
  });

  app.post('/bulk-delete', async (request, reply) => {
    const { ids } = request.body as { ids: string[] };
    const userId = request.user.userId;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('ids must be a non-empty array');
    }

    const result = await prisma.flashcard.deleteMany({
      where: { id: { in: ids }, userId },
    });

    return reply.send({
      message: `Deleted ${result.count} flashcards`,
      count: result.count,
    });
  });
}
