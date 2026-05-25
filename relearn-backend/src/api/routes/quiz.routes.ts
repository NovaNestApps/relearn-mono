import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

export default async function quizRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

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
