// src/websocket.ts
import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPub, redisSub } from './config/redis';
import { config } from './config/env';
import { logger } from './utils/logger';

declare module 'socket.io' {
  interface Socket {
    userId?: string;
    email?: string;
  }
}

export function setupWebSocket(app: FastifyInstance) {
  // @ts-ignore - Type mismatch between Fastify server types
  const io = new Server(app.server, {
    cors: {
      origin: [config.frontendUrl, `chrome-extension://${config.extensionId}`],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Setup Redis adapter for horizontal scaling
  io.adapter(createAdapter(redisPub, redisSub));

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token using Fastify's JWT
      const decoded = app.jwt.verify(token) as { userId: string; email: string };
      
      socket.userId = decoded.userId;
      socket.email = decoded.email;

      logger.info(`WebSocket authenticated: ${decoded.email}`);
      next();
    } catch (err) {
      logger.error('WebSocket auth error:', err);
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`WebSocket connected: ${socket.userId}`);

    // Join user's personal room
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);

    // Send connection confirmation
    socket.emit('connected', {
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    // ========================================
    // PAGE EVENTS
    // ========================================

    socket.on('page:created', (data) => {
      logger.debug(`Page created event from ${socket.userId}`);
      // Broadcast to user's other devices
      socket.to(userRoom).emit('page:created', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('page:updated', (data) => {
      logger.debug(`Page updated event from ${socket.userId}`);
      socket.to(userRoom).emit('page:updated', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('page:deleted', (data) => {
      logger.debug(`Page deleted event from ${socket.userId}`);
      socket.to(userRoom).emit('page:deleted', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ========================================
    // SUMMARY EVENTS
    // ========================================

    socket.on('summary:requested', (data) => {
      logger.debug(`Summary requested from ${socket.userId}`);
      socket.to(userRoom).emit('summary:requested', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ========================================
    // FLASHCARD EVENTS
    // ========================================

    socket.on('flashcard:created', (data) => {
      logger.debug(`Flashcard created from ${socket.userId}`);
      socket.to(userRoom).emit('flashcard:created', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('flashcard:updated', (data) => {
      logger.debug(`Flashcard updated from ${socket.userId}`);
      socket.to(userRoom).emit('flashcard:updated', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ========================================
    // QUIZ EVENTS
    // ========================================

    socket.on('quiz:created', (data) => {
      logger.debug(`Quiz created from ${socket.userId}`);
      socket.to(userRoom).emit('quiz:created', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ========================================
    // SYNC EVENTS (for extension)
    // ========================================

    socket.on('sync:request', async () => {
      logger.debug(`Sync request from ${socket.userId}`);
      
      // Could fetch latest data here and send back
      socket.emit('sync:response', {
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    });

    // ========================================
    // DISCONNECTION
    // ========================================

    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: ${socket.userId} - ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`WebSocket error for ${socket.userId}:`, error);
    });
  });

  logger.info('✅ WebSocket server initialized');

  return io;
}

// Helper function to emit events from REST API
export function emitToUser(io: Server, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}