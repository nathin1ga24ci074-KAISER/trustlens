import { User } from '@trustlens/shared';
import { prisma, isDbConnected } from '../config/db';
import { UserRecord } from '../types';
import crypto from 'crypto';

// In-memory storage fallback for local development/testing when PostgreSQL is offline
const memoryUsers = new Map<string, UserRecord>();

function toSafeUser(record: UserRecord | { id: string; name: string; email: string; createdAt: Date; updatedAt: Date }): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt),
  };
}

class UserService {
  /**
   * Find safe user by ID
   */
  async findById(id: string): Promise<User | null> {
    if (isDbConnected()) {
      try {
        const record = await prisma.user.findUnique({ where: { id } });
        return record ? toSafeUser(record) : null;
      } catch (err) {
        console.warn('Prisma findById query failed, falling back to memory store:', err);
      }
    }

    const mem = memoryUsers.get(id);
    return mem ? toSafeUser(mem) : null;
  }

  /**
   * Find safe user by email (normalized)
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (isDbConnected()) {
      try {
        const record = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        return record ? toSafeUser(record) : null;
      } catch (err) {
        console.warn('Prisma findByEmail query failed, falling back to memory store:', err);
      }
    }

    for (const user of memoryUsers.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return toSafeUser(user);
      }
    }
    return null;
  }

  /**
   * Retrieve full user record with password hash for credential verification (internal only)
   */
  async findRawByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (isDbConnected()) {
      try {
        const record = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        return record;
      } catch (err) {
        console.warn('Prisma findRawByEmail query failed, falling back to memory store:', err);
      }
    }

    for (const user of memoryUsers.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  /**
   * Create a new user with hashed password
   */
  async create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    const normalizedEmail = data.email.trim().toLowerCase();

    if (isDbConnected()) {
      try {
        const record = await prisma.user.create({
          data: {
            name: data.name.trim(),
            email: normalizedEmail,
            passwordHash: data.passwordHash,
          },
        });
        return toSafeUser(record);
      } catch (err) {
        console.warn('Prisma user.create failed, falling back to memory store:', err);
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const newRecord: UserRecord = {
      id,
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    memoryUsers.set(id, newRecord);
    return toSafeUser(newRecord);
  }
}

export const userService = new UserService();
