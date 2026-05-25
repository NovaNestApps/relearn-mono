import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  // Zod validation errors - check for issues property instead
  if ('issues' in error && Array.isArray(error.issues)) {
    return reply.status(400).send({
      error: 'Validation Error',
      details: error.issues.map((e: any) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Custom app errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
    });
  }

  // JWT errors
  if (error.message && (error.message.includes('jwt') || error.message.includes('token'))) {
    return reply.status(401).send({
      error: 'Invalid or expired token',
    });
  }

  // Prisma errors
  if (error.message && error.message.includes('Prisma')) {
    return reply.status(400).send({
      error: 'Database error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // Default error
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    error: error.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};