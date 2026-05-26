import Fastify from 'fastify';
import studySessionRoutes from '../api/routes/study-session.routes';
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
  app.register(studySessionRoutes, { prefix: '/api/study' });
  return app;
}

const mockCards = [
  { id: 'c1', pageId: 'p1', question: 'Q1', answer: 'A1', difficulty: 'medium', conceptTags: [] },
  { id: 'c2', pageId: 'p2', question: 'Q2', answer: 'A2', difficulty: 'medium', conceptTags: [] },
  { id: 'c3', pageId: 'p1', question: 'Q3', answer: 'A3', difficulty: 'easy', conceptTags: [] },
  { id: 'c4', pageId: 'p2', question: 'Q4', answer: 'A4', difficulty: 'hard', conceptTags: [] },
];

describe('GET /api/study/session', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => { await app.close(); });

  it('returns interleaved cards with no two consecutive from same page', async () => {
    (mockPrisma.flashcard.findMany as jest.Mock).mockResolvedValue(mockCards);
    (mockPrisma.studySession.create as jest.Mock).mockResolvedValue({
      id: 'session-1',
      cardIds: ['c1', 'c2', 'c3', 'c4'],
    });

    const res = await app.inject({ method: 'GET', url: '/api/study/session?cardCount=4' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.cards).toHaveLength(4);

    for (let i = 0; i < body.cards.length - 1; i++) {
      expect(body.cards[i].pageId).not.toBe(body.cards[i + 1].pageId);
    }
  });

  it('returns 200 with empty cards when user has no flashcards', async () => {
    (mockPrisma.flashcard.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.studySession.create as jest.Mock).mockResolvedValue({ id: 'session-1', cardIds: [] });

    const res = await app.inject({ method: 'GET', url: '/api/study/session' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).cards).toHaveLength(0);
  });
});

describe('POST /api/study/session/:id/complete', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => { await app.close(); });

  const validResults = [
    { flashcardId: '550e8400-e29b-41d4-a716-446655440000', correct: true, timeTaken: 2000, confidence: 3 },
    { flashcardId: '550e8400-e29b-41d4-a716-446655440001', correct: false, timeTaken: 5000, confidence: 1 },
  ];

  it('marks session complete and creates reviews', async () => {
    (mockPrisma.studySession.findUnique as jest.Mock).mockResolvedValue({ userId: 'user-123' });
    (mockPrisma.flashcard.findMany as jest.Mock).mockResolvedValue([
      { id: '550e8400-e29b-41d4-a716-446655440000' },
      { id: '550e8400-e29b-41d4-a716-446655440001' },
    ]);
    (mockPrisma.studySession.update as jest.Mock).mockResolvedValue({ id: 'session-1' });
    (mockPrisma.flashcardReview.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    const res = await app.inject({
      method: 'POST',
      url: '/api/study/session/session-1/complete',
      headers: { 'content-type': 'application/json' },
      payload: { results: validResults },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).reviewed).toBe(2);
    expect(mockPrisma.flashcardReview.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ flashcardId: '550e8400-e29b-41d4-a716-446655440000', correct: true }),
      ]),
    });
  });

  it('returns 404 for non-existent session', async () => {
    (mockPrisma.studySession.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/study/session/session-x/complete',
      headers: { 'content-type': 'application/json' },
      payload: { results: [] },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 when session belongs to another user', async () => {
    (mockPrisma.studySession.findUnique as jest.Mock).mockResolvedValue({ userId: 'other-user' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/study/session/session-1/complete',
      headers: { 'content-type': 'application/json' },
      payload: { results: [] },
    });

    expect(res.statusCode).toBe(403);
  });

  it('silently drops unowned flashcard IDs from review records', async () => {
    (mockPrisma.studySession.findUnique as jest.Mock).mockResolvedValue({ userId: 'user-123' });
    // Only one of two submitted IDs is owned
    (mockPrisma.flashcard.findMany as jest.Mock).mockResolvedValue([
      { id: '550e8400-e29b-41d4-a716-446655440000' },
    ]);
    (mockPrisma.studySession.update as jest.Mock).mockResolvedValue({ id: 'session-1' });
    (mockPrisma.flashcardReview.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const res = await app.inject({
      method: 'POST',
      url: '/api/study/session/session-1/complete',
      headers: { 'content-type': 'application/json' },
      payload: { results: validResults },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).reviewed).toBe(1);
    // Only the owned card written to DB
    expect(mockPrisma.flashcardReview.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ flashcardId: '550e8400-e29b-41d4-a716-446655440000' })],
    });
    // Session persists only verified results
    expect(mockPrisma.studySession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          results: [expect.objectContaining({ flashcardId: '550e8400-e29b-41d4-a716-446655440000' })],
        }),
      })
    );
  });
});
