import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { ValidationError } from '../../utils/errors';
import { remediationQueue } from '../../llm/queue';

const remediationSchema = z.object({
  conceptTags: z.array(z.string().min(1)).min(1).max(5),
});

const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);

  app.get('/weakspots', async (request, reply) => {
    const userId = (request as any).user.userId;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const reviews = await prisma.flashcardReview.findMany({
      where: { userId, reviewedAt: { gte: since } },
      include: { flashcard: { select: { conceptTags: true } } },
    });

    const tagStats = new Map<string, { correct: number; total: number }>();

    for (const review of reviews) {
      const tags = (review.flashcard as any)?.conceptTags ?? [];
      for (const tag of tags as string[]) {
        const current = tagStats.get(tag) ?? { correct: 0, total: 0 };
        tagStats.set(tag, {
          correct: current.correct + (review.correct ? 1 : 0),
          total: current.total + 1,
        });
      }
    }

    const weakspots = Array.from(tagStats.entries())
      .map(([tag, stats]) => ({
        tag,
        accuracy: stats.total === 0 ? 0 : stats.correct / stats.total,
        reviewCount: stats.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    return reply.send({ weakspots, lastUpdated: new Date().toISOString() });
  });

  app.post('/remediation', async (request, reply) => {
    const parsed = remediationSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('conceptTags must be a non-empty array (max 5)');
    }

    const userId = (request as any).user.userId;

    const job = await remediationQueue.add('generate-remediation-cards', {
      userId,
      conceptTags: parsed.data.conceptTags,
    });

    return reply.status(202).send({
      message: 'Remediation card generation started',
      jobId: job.id,
      conceptTags: parsed.data.conceptTags,
    });
  });
};

export default analyticsRoutes;
