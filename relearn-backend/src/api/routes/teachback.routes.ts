import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { evaluateTeachBack } from '../../llm/processors/teachback-evaluator';

const submitSchema = z.object({
  attemptText: z.string().min(30, 'Explanation must be at least 30 characters'),
});

export default async function teachbackRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/:pageId/teachback', async (request, reply) => {
    const { pageId } = request.params as { pageId: string };
    let body: z.infer<typeof submitSchema>;
    try {
      body = submitSchema.parse(request.body);
    } catch (err: unknown) {
      const zodErr = err as { errors?: Array<{ message: string }> };
      throw new ValidationError(zodErr.errors?.[0]?.message ?? 'Invalid input');
    }
    const userId = request.user.userId;

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundError('Page not found');
    if (page.userId !== userId) throw new ForbiddenError('Access denied');

    const result = await evaluateTeachBack(page.content, body.attemptText);

    const attempt = await prisma.teachBackAttempt.create({
      data: {
        userId,
        pageId,
        attemptText: body.attemptText,
        gaps: result.gaps,
        score: result.score,
        feedback: result.feedback,
      },
    });

    return reply.send({
      attemptId: attempt.id,
      score: result.score,
      feedback: result.feedback,
      gaps: result.gaps,
      followUpQuestions: result.followUpQuestions,
    });
  });

  app.get('/:pageId/teachback', async (request, reply) => {
    const { pageId } = request.params as { pageId: string };
    const userId = request.user.userId;

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page || page.userId !== userId) throw new ForbiddenError('Access denied');

    const attempts = await prisma.teachBackAttempt.findMany({
      where: { pageId, userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, score: true, gaps: true, feedback: true, createdAt: true },
    });

    return reply.send({ attempts });
  });
}
