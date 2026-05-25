// src/api/routes/auth.ts
// Enhanced version with detailed logging for debugging

/// <reference path="../../types/fastify.d.ts" />

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../../auth/password';
import { logger } from '../../utils/logger';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const updateSettingsSchema = z.object({
  spacedRepetitionEnabled: z.boolean().optional(),
  notificationEnabled: z.boolean().optional(),
  notificationTime: z.string().min(1).max(20).nullable().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register endpoint
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);
      
      // Check if user exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        return reply.code(400).send({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(body.password);
      logger.info(`Registration: Password hashed for ${body.email}`);

      // Create user
      const user = await fastify.prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          name: body.name,
        },
      });

      logger.info(`User registered successfully: ${user.email}`);

      // Generate tokens using Fastify JWT
      const accessToken = fastify.jwt.sign(
        { userId: user.id, email: user.email },
        { expiresIn: '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: user.id, email: user.email },
        { key: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
      );

      return reply.code(201).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          spacedRepetitionEnabled: user.spacedRepetitionEnabled,
          notificationEnabled: user.notificationEnabled,
          notificationTime: user.notificationTime,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error('Registration error:', error);
      if (error && typeof error === 'object' && 'issues' in error) {
        return reply.code(400).send({ error: 'Invalid input', details: (error as any).issues });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Login endpoint with detailed logging
  fastify.post('/login', async (request, reply) => {
    try {
      logger.info('=== LOGIN ATTEMPT START ===');
      
      // Parse and validate request body
      const body = loginSchema.parse(request.body);
      logger.info(`Login attempt for email: ${body.email}`);

      // Find user
      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        logger.warn(`Login failed: User not found - ${body.email}`);
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      logger.info(`User found in database: ${user.email} (ID: ${user.id})`);
      logger.info(`Stored password hash length: ${user.password.length}`);
      logger.info(`Input password length: ${body.password.length}`);

      // Verify password
      logger.info('Starting password verification...');
      const isPasswordValid = await verifyPassword(body.password, user.password);
      logger.info(`Password verification result: ${isPasswordValid}`);

      if (!isPasswordValid) {
        logger.warn(`Login failed: Invalid password for ${body.email}`);
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      logger.info('Password verified successfully');

      // Generate tokens using Fastify JWT
      logger.info('Generating JWT tokens...');
      
      const accessToken = fastify.jwt.sign(
        { userId: user.id, email: user.email },
        { expiresIn: '15m' }
      );
      
      const refreshToken = fastify.jwt.sign(
        { userId: user.id, email: user.email },
        { key: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
      );
      
      logger.info('Tokens generated successfully');
      logger.info(`Access token preview: ${accessToken.substring(0, 20)}...`);
      logger.info(`Refresh token preview: ${refreshToken.substring(0, 20)}...`);

      logger.info('=== LOGIN SUCCESS ===');

      return reply.code(200).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          spacedRepetitionEnabled: user.spacedRepetitionEnabled,
          notificationEnabled: user.notificationEnabled,
          notificationTime: user.notificationTime,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error('=== LOGIN ERROR ===');
      logger.error('Error details:', error);
      
      if (error && typeof error === 'object' && 'issues' in error) {
        logger.error('Validation error:', (error as any).issues);
        return reply.code(400).send({ error: 'Invalid input', details: (error as any).issues });
      }
      
      return reply.code(500).send({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Refresh token endpoint
  fastify.post('/refresh', async (request, reply) => {
    try {
      const body = refreshSchema.parse(request.body);

      const payload = fastify.jwt.verify(body.refreshToken, {
        key: process.env.JWT_REFRESH_SECRET,
      }) as { userId: string; email: string };

      const accessToken = fastify.jwt.sign(
        { userId: payload.userId, email: payload.email },
        { expiresIn: '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: payload.userId, email: payload.email },
        { key: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
      );

      return reply.code(200).send({ accessToken, refreshToken });
    } catch (error) {
      logger.error('Token refresh error:', error);
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          spacedRepetitionEnabled: true,
          notificationEnabled: true,
          notificationTime: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.code(200).send({ user, data: user });
    } catch (error) {
      logger.error('Get user error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update user settings
  fastify.patch('/me/settings', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = updateSettingsSchema.parse(request.body);
      const userId = request.user.userId;

      const user = await fastify.prisma.user.update({
        where: { id: userId },
        data: {
          ...(body.spacedRepetitionEnabled !== undefined && {
            spacedRepetitionEnabled: body.spacedRepetitionEnabled,
          }),
          ...(body.notificationEnabled !== undefined && {
            notificationEnabled: body.notificationEnabled,
          }),
          ...(body.notificationTime !== undefined && {
            notificationTime: body.notificationTime,
          }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          spacedRepetitionEnabled: true,
          notificationEnabled: true,
          notificationTime: true,
          createdAt: true,
        },
      });

      return reply.code(200).send({ user, data: user });
    } catch (error) {
      logger.error('Update settings error:', error);
      if (error && typeof error === 'object' && 'issues' in error) {
        return reply.code(400).send({ error: 'Invalid input', details: (error as any).issues });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Logout endpoint
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (_request, reply) => {
    // In a production app, you'd want to invalidate the refresh token here
    // For now, just return success
    return reply.code(200).send({ message: 'Logged out successfully' });
  });
}
