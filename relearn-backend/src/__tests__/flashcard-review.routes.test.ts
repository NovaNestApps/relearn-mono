import Fastify from 'fastify';
import flashcardReviewRoutes from '../api/routes/flashcard-review.routes';
import { prisma } from '../config/database';
import { errorHandler } from '../utils/errors';

jest.mock('../auth/middleware', () => ({
  authMiddleware: jest.fn(async () => {}),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function buildTestApp() {
  const app = Fastify({ logger: false });

  app.addHook('preHandler', async (request) => {
    (request as any).user = { userId: 'user-123' };
  });

  app.setErrorHandler(errorHandler);
  app.register(flashcardReviewRoutes, { prefix: '/api/flashcard-reviews' });
  return app;
}

describe('POST /api/flashcard-reviews', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a review when flashcard belongs to user', async () => {
    (mockPrisma.flashcard.findUnique as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
    });
    (mockPrisma.flashcardReview.create as jest.Mock).mockResolvedValue({
      id: 'review-1',
      userId: 'user-123',
      flashcardId: '550e8400-e29b-41d4-a716-446655440000',
      correct: true,
      timeTaken: 3200,
      confidence: 3,
      reviewedAt: new Date().toISOString(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/flashcard-reviews',
      headers: { 'content-type': 'application/json' },
      payload: {
        flashcardId: '550e8400-e29b-41d4-a716-446655440000',
        correct: true,
        timeTaken: 3200,
        confidence: 3,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).review.id).toBe('review-1');
  });

  it('returns 403 when flashcard belongs to another user', async () => {
    (mockPrisma.flashcard.findUnique as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'other-user',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/flashcard-reviews',
      headers: { 'content-type': 'application/json' },
      payload: {
        flashcardId: '550e8400-e29b-41d4-a716-446655440000',
        correct: false,
        timeTaken: 1000,
        confidence: 1,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('returns 400 when confidence is out of range', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flashcard-reviews',
      headers: { 'content-type': 'application/json' },
      payload: {
        flashcardId: '550e8400-e29b-41d4-a716-446655440000',
        correct: true,
        timeTaken: 1000,
        confidence: 5,
      },
    });

    expect(res.statusCode).toBe(400);
  });
});
