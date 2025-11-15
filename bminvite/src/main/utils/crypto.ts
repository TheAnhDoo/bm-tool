import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'bminvite-salt-2024'; // In production, use environment variable

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  return scryptSync(key, SALT, 32);
}

export function encrypt(text: string): string {
  try {
    const key = getKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const key = getKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Safely decrypts encrypted text, returning null if decryption fails.
 * This is useful when dealing with potentially corrupted or invalid encrypted data.
 */
export function safeDecrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText || typeof encryptedText !== 'string' || encryptedText.trim() === '') {
    return null;
  }

  try {
    return decrypt(encryptedText);
  } catch (error) {
    // Log the error but don't throw - allow the application to continue
    logger.warn('Failed to decrypt data:', error);
    return null;
  }
}

