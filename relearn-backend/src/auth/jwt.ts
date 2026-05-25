import { FastifyInstance } from 'fastify';
import { config } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(
  app: FastifyInstance,
  payload: TokenPayload
): string {
  return app.jwt.sign(payload, {
    expiresIn: '15m', // Short-lived access token
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: '7d', // Long-lived refresh token
  });
}

export function verifyRefreshToken(token: string): TokenPayload {
  const jwt = require('jsonwebtoken');
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}