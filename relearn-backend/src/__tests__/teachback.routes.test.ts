import Fastify from 'fastify';
import teachbackRoutes from '../api/routes/teachback.routes';
import { prisma } from '../config/database';
import { errorHandler } from '../utils/errors';

jest.mock('../auth/middleware', () => ({
  authMiddleware: jest.fn(async () => {}),
}));

jest.mock('../llm/processors/teachback-evaluator', () => ({
  evaluateTeachBack: jest.fn().mockResolvedValue({
    score: 0.75,
    feedback: 'Good attempt.',
    gaps: ['concept X'],
    followUpQuestions: ['Can you explain X?'],
  }),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function buildTestApp() {
  const app = Fastify({ logger: false });
  app.addHook('preHandler', async (request) => {
    (request as any).user = { userId: 'user-123' };
  });
  app.setErrorHandler(errorHandler);
  app.register(teachbackRoutes, { prefix: '/api/pages' });
  return app;
}

describe('POST /api/pages/:pageId/teachback', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => { await app.close(); });

  it('evaluates attempt and returns score + gaps', async () => {
    (mockPrisma.page.findUnique as jest.Mock).mockResolvedValue({
      id: 'page-1',
      userId: 'user-123',
      content: 'Machine learning is a subset of AI...',
    });
    (mockPrisma.teachBackAttempt.create as jest.Mock).mockResolvedValue({
      id: 'attempt-1',
      score: 0.75,
      gaps: ['concept X'],
      feedback: 'Good attempt.',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/pages/page-1/teachback',
      headers: { 'content-type': 'application/json' },
      payload: { attemptText: 'Machine learning helps computers learn from data and patterns.' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.score).toBe(0.75);
    expect(body.gaps).toContain('concept X');
    expect(body.attemptId).toBe('attempt-1');
  });

  it('returns 400 when attemptText is too short', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/pages/page-1/teachback',
      headers: { 'content-type': 'application/json' },
      payload: { attemptText: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when page does not exist', async () => {
    (mockPrisma.page.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/pages/page-1/teachback',
      headers: { 'content-type': 'application/json' },
      payload: { attemptText: 'A long enough explanation of the topic covered on this page to pass validation.' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/pages/:pageId/teachback', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => { await app.close(); });

  it('returns past attempts for a page', async () => {
    (mockPrisma.page.findUnique as jest.Mock).mockResolvedValue({ id: 'page-1', userId: 'user-123' });
    (mockPrisma.teachBackAttempt.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', score: 0.6, createdAt: new Date().toISOString() },
      { id: 'a2', score: 0.75, createdAt: new Date().toISOString() },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/pages/page-1/teachback',
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).attempts).toHaveLength(2);
  });
});
