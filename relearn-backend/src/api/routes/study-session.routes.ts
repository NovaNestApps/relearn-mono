import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';

const sessionQuerySchema = z.object({
  cardCount: z.coerce.number().int().min(1).max(50).default(20),
  pageIds: z.string().optional(),
});

const completeSchema = z.object({
  results: z.array(z.object({
    flashcardId: z.string().uuid(),
    correct: z.boolean(),
    timeTaken: z.number().int().min(0),
    confidence: z.number().int().min(1).max(4),
  })),
});

function interleave<T extends { pageId: string }>(cards: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const card of cards) {
    const group = groups.get(card.pageId) ?? [];
    group.push(card);
    groups.set(card.pageId, group);
  }

  const result: T[] = [];
  const queues = Array.from(groups.values());
  let i = 0;
  while (result.length < cards.length) {
    if (queues.every(q => q.length === 0)) break;
    const queue = queues[i % queues.length];
    if (queue.length > 0) result.push(queue.shift()!);
    i++;
  }
  return result;
}

export default async function studySessionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/session', async (request, reply) => {
    const query = sessionQuerySchema.parse(request.query);
    const userId = request.user.userId;

    const pageFilter = query.pageIds
      ? { pageId: { in: query.pageIds.split(',') } }
      : {};

    const allCards = await prisma.flashcard.findMany({
      where: { userId, ...pageFilter },
      select: { id: true, pageId: true, question: true, answer: true, difficulty: true, conceptTags: true },
    });

    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const interleaved = interleave(shuffled).slice(0, query.cardCount);

    const session = await prisma.studySession.create({
      data: {
        userId,
        cardIds: interleaved.map(c => c.id),
        sessionType: 'interleaved',
      },
    });

    return reply.send({ sessionId: session.id, cards: interleaved });
  });

  app.post('/session/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = completeSchema.parse(request.body);
    const userId = request.user.userId;

    await prisma.studySession.update({
      where: { id },
      data: { results: body.results, completedAt: new Date() },
    });

    if (body.results.length > 0) {
      await prisma.flashcardReview.createMany({
        data: body.results.map(r => ({
          userId,
          flashcardId: r.flashcardId,
          correct: r.correct,
          timeTaken: r.timeTaken,
          confidence: r.confidence,
        })),
      });
    }

    return reply.send({ ok: true, reviewed: body.results.length });
  });
}
