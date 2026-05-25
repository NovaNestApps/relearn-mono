import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors';

// Extend Fastify's JWT user type
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string;
      email: string;
    };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    // User is now available as request.user with proper typing
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

// Optional auth - doesn't throw if no token
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    // Continue without auth
  }
}