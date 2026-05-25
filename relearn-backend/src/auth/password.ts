// src/auth/password.ts
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  try {
    logger.info(`Hashing password... (length: ${password.length})`);
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    logger.info(`Password hashed successfully (hash length: ${hash.length})`);
    return hash;
  } catch (error) {
    logger.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    logger.info('Verifying password...');
    logger.info(`Input password length: ${password.length}`);
    logger.info(`Stored hash length: ${hashedPassword.length}`);
    logger.info(`Hash starts with: ${hashedPassword.substring(0, 7)}`);
    
    // Check if hash looks valid (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isBcryptHash = /^\$2[aby]\$/.test(hashedPassword);
    logger.info(`Is valid bcrypt format: ${isBcryptHash}`);
    
    if (!isBcryptHash) {
      logger.error('Invalid bcrypt hash format detected!');
      return false;
    }
    
    const isMatch = await bcrypt.compare(password, hashedPassword);
    logger.info(`Password comparison result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    logger.error('Password verification error:', error);
    return false;
  }
}