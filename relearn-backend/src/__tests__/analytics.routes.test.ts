import Fastify from 'fastify';
import analyticsRoutes from '../api/routes/analytics.routes';
import { prisma } from '../config/database';
import { errorHandler } from '../utils/errors';

jest.mock('../auth/middleware', () => ({
  authMiddleware: jest.fn(async () => {}),
}));

jest.mock('../llm/queue', () => ({
  remediationQueue: { add: jest.fn().mockResolvedValue({ id: 'job-1' }) },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function buildTestApp() {
  const app = Fastify({ logger: false });
  app.addHook('preHandler', async (request) => {
    (request as any).user = { userId: 'user-123' };
  });
  app.setErrorHandler(errorHandler);
  app.register(analyticsRoutes, { prefix: '/api/analytics' });
  return app;
}

describe('GET /api/analytics/weakspots', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => { app = buildTestApp(); jest.clearAllMocks(); });
  afterEach(async () => { await app.close(); });

  it('aggregates reviews and returns weakspots sorted by accuracy', async () => {
    (mockPrisma.flashcardReview.findMany as jest.Mock).mockResolvedValue([
      { flashcard: { conceptTags: ['gradient descent'] }, correct: false },
      { flashcard: { conceptTags: ['gradient descent'] }, correct: false },
      { flashcard: { conceptTags: ['gradient descent'] }, correct: true },
      { flashcard: { conceptTags: ['backprop'] }, correct: true },
      { flashcard: { conceptTags: ['backprop'] }, correct: true },
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/analytics/weakspots' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.weakspots[0].tag).toBe('gradient descent');
    expect(body.weakspots[0].accuracy).toBeCloseTo(0.33, 1);
    expect(body.weakspots[1].tag).toBe('backprop');
    expect(body.weakspots[1].accuracy).toBe(1);
  });

  it('returns empty weakspots when no reviews exist', async () => {
    (mockPrisma.flashcardReview.findMany as jest.Mock).mockResolvedValue([]);
    const res = await app.inject({ method: 'GET', url: '/api/analytics/weakspots' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).weakspots).toHaveLength(0);
  });
});

describe('POST /api/analytics/remediation', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => { app = buildTestApp(); jest.clearAllMocks(); });
  afterEach(async () => { await app.close(); });

  it('enqueues remediation job and returns jobId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/analytics/remediation',
      headers: { 'content-type': 'application/json' },
      payload: { conceptTags: ['gradient descent'] },
    });

    expect(res.statusCode).toBe(202);
    expect(JSON.parse(res.body).jobId).toBe('job-1');
  });

  it('returns 400 when conceptTags is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/analytics/remediation',
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
