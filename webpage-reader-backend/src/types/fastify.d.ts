import { PrismaClient } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: any, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    user: TokenPayload;
  }
}
