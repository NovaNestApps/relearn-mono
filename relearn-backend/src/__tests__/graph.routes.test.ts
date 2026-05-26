// src/__tests__/graph.routes.test.ts
import Fastify from 'fastify';
import { errorHandler } from '../utils/errors';
import graphRoutes from '../api/routes/graph.routes';

jest.mock('../config/database');
jest.mock('../auth/middleware', () => ({
  authMiddleware: jest.fn(async () => {}),
}));

import { prisma } from '../config/database';

const mockConcepts = [
  { id: 'c1', name: 'attention mechanism', description: 'Focuses on relevant inputs.', userId: 'u1', createdAt: new Date() },
  { id: 'c2', name: 'transformer architecture', description: 'Encoder-decoder model.', userId: 'u1', createdAt: new Date() },
];

const mockRelations = [
  { id: 'r1', sourceId: 'c1', targetId: 'c2', relationship: 'related', strength: 0.7 },
];

function buildTestApp() {
  const app = Fastify({ logger: false });
  app.addHook('preHandler', async (request) => {
    (request as any).user = { userId: 'u1' };
  });
  app.setErrorHandler(errorHandler);
  app.register(graphRoutes, { prefix: '/graph' });
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /graph', () => {
  it('returns nodes and edges for authenticated user', async () => {
    (prisma.concept.findMany as jest.Mock).mockResolvedValue(mockConcepts);
    (prisma.conceptRelation.findMany as jest.Mock).mockResolvedValue(mockRelations);

    const app = buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/graph' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.nodes).toHaveLength(2);
    expect(body.edges).toHaveLength(1);
    expect(body.nodes[0]).toMatchObject({ id: 'c1', name: 'attention mechanism' });
    expect(body.edges[0]).toMatchObject({ sourceId: 'c1', targetId: 'c2' });
  });

  it('returns empty graph when no concepts exist', async () => {
    (prisma.concept.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.conceptRelation.findMany as jest.Mock).mockResolvedValue([]);

    const app = buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/graph' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.nodes).toHaveLength(0);
    expect(body.edges).toHaveLength(0);
  });
});

describe('GET /graph/page/:pageId', () => {
  it('returns concepts and relations for a specific page', async () => {
    (prisma.pageConcept.findMany as jest.Mock).mockResolvedValue([
      { conceptId: 'c1', concept: mockConcepts[0] },
      { conceptId: 'c2', concept: mockConcepts[1] },
    ]);
    (prisma.conceptRelation.findMany as jest.Mock).mockResolvedValue(mockRelations);

    const app = buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/graph/page/page-123' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.nodes).toHaveLength(2);
    expect(body.edges).toHaveLength(1);
  });
});
