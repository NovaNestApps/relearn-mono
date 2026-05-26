import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { ForbiddenError, ValidationError } from '../../utils/errors';

const createReviewSchema = z.object({
  flashcardId: z.string().uuid(),
  correct: z.boolean(),
  timeTaken: z.number().int().min(0),
  confidence: z.number().int().min(1).max(4),
});

export default async function flashcardReviewRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/', async (request, reply) => {
    let body: z.infer<typeof createReviewSchema>;
    try {
      body = createReviewSchema.parse(request.body);
    } catch {
      throw new ValidationError('Invalid review data');
    }
    const userId = request.user.userId;

    const flashcard = await prisma.flashcard.findUnique({
      where: { id: body.flashcardId },
    });

    if (!flashcard || flashcard.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const review = await prisma.flashcardReview.create({
      data: {
        userId,
        flashcardId: body.flashcardId,
        correct: body.correct,
        timeTaken: body.timeTaken,
        confidence: body.confidence,
      },
    });

    return reply.status(201).send({ review });
  });
}
