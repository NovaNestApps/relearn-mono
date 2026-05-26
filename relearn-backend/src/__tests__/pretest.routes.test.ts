import Fastify from 'fastify';
import pretestRoutes from '../api/routes/pretest.routes';
import { prisma } from '../config/database';
import { errorHandler } from '../utils/errors';

jest.mock('../auth/middleware', () => ({
  authMiddleware: jest.fn(async () => {}),
}));

jest.mock('../llm/processors/pretest-generator', () => ({
  generatePretestQuestions: jest.fn().mockResolvedValue([
    { question: 'What is X?', options: ['A', 'B', 'C', 'D'], correct: 'A' },
    { question: 'What is Y?', options: ['A', 'B', 'C', 'D'], correct: 'B' },
    { question: 'What is Z?', options: ['A', 'B', 'C', 'D'], correct: 'C' },
  ]),
  scorePretestAnswers: jest.fn().mockReturnValue({ correct: [true, false, true], score: 0.67 }),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function buildTestApp() {
  const app = Fastify({ logger: false });
  app.addHook('preHandler', async (request) => {
    (request as any).user = { userId: 'user-123' };
  });
  app.setErrorHandler(errorHandler);
  app.register(pretestRoutes, { prefix: '/api/pretest' });
  return app;
}

describe('POST /api/pretest/generate', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => { app = buildTestApp(); jest.clearAllMocks(); });
  afterEach(async () => { await app.close(); });

  it('generates 3 questions and saves pretest attempt', async () => {
    (mockPrisma.pretestAttempt.create as jest.Mock).mockResolvedValue({
      id: 'pretest-1',
      questions: [],
      answers: [],
      phase: 'before',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/pretest/generate',
      headers: { 'content-type': 'application/json' },
      payload: { url: 'https://example.com/ml-basics', title: 'ML Basics' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.pretestId).toBe('pretest-1');
    expect(body.questions).toHaveLength(3);
    expect(body.questions[0].correct).toBeUndefined();
  });

  it('returns 400 when url is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/pretest/generate',
      headers: { 'content-type': 'application/json' },
      payload: { title: 'ML Basics' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/pretest/:id/submit', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => { app = buildTestApp(); jest.clearAllMocks(); });
  afterEach(async () => { await app.close(); });

  it('scores answers and updates attempt', async () => {
    (mockPrisma.pretestAttempt.findUnique as jest.Mock).mockResolvedValue({
      id: 'pretest-1',
      userId: 'user-123',
      questions: [
        { question: 'Q1', options: ['A', 'B'], correct: 'A' },
      ],
      phase: 'before',
    });
    (mockPrisma.pretestAttempt.update as jest.Mock).mockResolvedValue({ id: 'pretest-1' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/pretest/pretest-1/submit',
      headers: { 'content-type': 'application/json' },
      payload: { answers: ['A', 'B', 'C'], phase: 'after' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.score).toBe('number');
    expect(Array.isArray(body.correct)).toBe(true);
  });
});
