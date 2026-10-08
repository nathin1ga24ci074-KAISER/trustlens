import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Securely hash a plaintext password with bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plainText, salt);
}

/**
 * Verify a plaintext password against a stored bcrypt hash
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
