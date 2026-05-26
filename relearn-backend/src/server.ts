// src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { config } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errors';
import { setupWebSocket } from './websocket';
import { prisma } from './config/database';
import { testOllamaConnection } from './llm/ollama';
import { closeQueues } from './llm/queue';

// Import routes - using named imports
import { authRoutes } from './api/routes/auth.routes';
import pageRoutes from './api/routes/pages.routes';
import summaryRoutes from './api/routes/summary.routes';
import flashcardRoutes from './api/routes/flashcard.routes';
import quizRoutes from './api/routes/quiz.routes';
import flashcardReviewRoutes from './api/routes/flashcard-review.routes';
import studySessionRoutes from './api/routes/study-session.routes';
import teachbackRoutes from './api/routes/teachback.routes';
import pretestRoutes from './api/routes/pretest.routes';

const server = Fastify({
  logger: true,
  trustProxy: true,
});

async function start() {
  try {
    // Register plugins
    await server.register(cors, {
      origin: [config.frontendUrl, `chrome-extension://${config.extensionId}`],
      credentials: true,
    });

    await server.register(cookie, {
      secret: config.jwtSecret,
      parseOptions: {},
    });

    await server.register(jwt, {
      secret: config.jwtSecret,
      cookie: {
        cookieName: 'refreshToken',
        signed: false,
      },
    });

    // ⭐ IMPORTANT: Decorate Fastify instance with Prisma
    server.decorate('prisma', prisma);

    // ⭐ IMPORTANT: Add authenticate decorator
    server.decorate('authenticate', async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    // Test Ollama connection
    await testOllamaConnection();

    // Health check
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register API routes
    server.register(authRoutes, { prefix: '/api/auth' });
    server.register(pageRoutes, { prefix: '/api/pages' });
    server.register(summaryRoutes, { prefix: '/api/summaries' });
    server.register(flashcardRoutes, { prefix: '/api/flashcards' });
    server.register(quizRoutes, { prefix: '/api/quizzes' });
    server.register(flashcardReviewRoutes, { prefix: '/api/flashcard-reviews' });
    server.register(studySessionRoutes, { prefix: '/api/study' });
    server.register(teachbackRoutes, { prefix: '/api/pages' });
    server.register(pretestRoutes, { prefix: '/api/pretest' });

    // Setup WebSocket
    setupWebSocket(server);

    // Error handler
    server.setErrorHandler(errorHandler);

    // Start server
    await server.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Server running at http://${config.host}:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  } catch (err) {
    logger.error('Error starting server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await closeQueues();
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await closeQueues();
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
});

start();