import { PrismaClient } from '@prisma/client';

// Global declaration for Prisma in development to avoid exhausting connection pools
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

let isConnected = false;

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    isConnected = true;
    console.log('✓ PostgreSQL connected successfully via Prisma');
    return true;
  } catch (error) {
    isConnected = false;
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('! PostgreSQL connection check failed:', msg);
    console.warn('! Running with in-memory persistence fallback for local testing.');
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}
