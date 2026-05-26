// src/api/routes/graph.routes.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { authMiddleware } from '../../auth/middleware';
import { NotFoundError } from '../../utils/errors';

export default async function graphRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /graph — full concept graph for the authenticated user
  app.get('/', async (request, reply) => {
    const userId = request.user.userId;

    const [concepts, relations] = await Promise.all([
      prisma.concept.findMany({
        where: { userId },
        select: { id: true, name: true, description: true, createdAt: true },
        orderBy: { name: 'asc' },
      }),
      prisma.conceptRelation.findMany({
        where: { source: { userId } },
        select: { id: true, sourceId: true, targetId: true, relationship: true, strength: true },
      }),
    ]);

    return reply.send({ nodes: concepts, edges: relations });
  });

  // GET /graph/page/:pageId — concepts and relations for a specific page
  app.get('/page/:pageId', async (request, reply) => {
    const { pageId } = request.params as { pageId: string };
    const userId = request.user.userId;

    // Verify page exists and belongs to this user before querying concepts
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { userId: true },
    });

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    if (page.userId !== userId) {
      throw new NotFoundError('Page not found');
    }

    const pageLinks = await prisma.pageConcept.findMany({
      where: { pageId },
      include: {
        concept: {
          select: { id: true, name: true, description: true, userId: true, createdAt: true },
        },
      },
    });

    const concepts = pageLinks.map((pl) => pl.concept);

    const conceptIds = concepts.map((c) => c.id);

    const relations = await prisma.conceptRelation.findMany({
      where: {
        sourceId: { in: conceptIds },
        targetId: { in: conceptIds },
      },
      select: { id: true, sourceId: true, targetId: true, relationship: true, strength: true },
    });

    // Strip internal userId from nodes in response
    const nodes = concepts.map(({ userId: _uid, ...rest }) => rest);

    return reply.send({ nodes, edges: relations });
  });
}
