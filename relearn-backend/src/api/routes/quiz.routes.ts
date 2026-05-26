import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { quizQueue } from '../../llm/queue';

const generateQuizSchema = z.object({
  pageId: z.string().uuid(),
  questionCount: z.number().min(1).max(50).default(10),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  title: z.string().min(1).max(200).optional(),
});

export default async function quizRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/', async (request, reply) => {
    const { pageId } = request.query as { pageId?: string };
    const userId = request.user.userId;

    const quizzes = await prisma.quiz.findMany({
      where: {
        userId,
        ...(pageId ? { pageId } : {}),
      },
      include: {
        questions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ quizzes, data: quizzes });
  });

  app.post('/generate', async (request, reply) => {
    const body = generateQuizSchema.parse(request.body);
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

    const job = await quizQueue.add('generate-quiz', {
      pageId: body.pageId,
      userId,
      pageContent: page.content,
      questionCount: body.questionCount,
      title: body.title,
    });

    return reply.status(202).send({
      message: 'Quiz generation started',
      pageId: body.pageId,
      jobId: job.id,
      expectedCount: body.questionCount,
    });
  });

  app.get('/job/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const userId = request.user.userId;

    const job = await quizQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    const state = await job.getState();
    const result = job.returnvalue as { quizId?: string } | undefined;
    const quizId = result?.quizId;
    const quiz = quizId
      ? await prisma.quiz.findFirst({
        where: { id: quizId, userId },
        include: { questions: true },
      })
      : null;

    return reply.send({
      jobId: job.id,
      state,
      progress: job.progress || 0,
      quiz: state === 'completed' ? quiz : null,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    });
  });

  // Create quiz
  app.post('/', async (request, reply) => {
    const { summaryId, questions } = request.body as {
      summaryId: string;
      questions: Array<{
        question: string;
        options: string[];
        correctAnswer: number;
        explanation?: string;
        points?: number;
      }>
    };
    const userId = request.user.userId;

    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
    });

    if (!summary || summary.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Create quiz with nested questions
    const quiz = await prisma.quiz.create({
      data: {
        userId,
        pageId: summary.pageId, // Use pageId from summary
        title: 'Quiz',
        questions: {
          create: questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer != null ? q.correctAnswer.toString() : '',
            explanation: q.explanation,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return reply.status(201).send({ quiz });
  });

  // Get quizzes for a summary (via pageId)
  app.get('/summary/:summaryId', async (request, reply) => {
    const { summaryId } = request.params as { summaryId: string };
    const userId = request.user.userId;

    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
    });

    if (!summary || summary.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        pageId: summary.pageId,
        userId
      },
      include: {
        questions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ quizzes, data: quizzes });
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    if (quiz.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return reply.send({ quiz });
  });

  // Delete quiz
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz || quiz.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.quiz.delete({ where: { id } });
    return reply.status(204).send();
  });
}
