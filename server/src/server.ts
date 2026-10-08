import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, prisma } from './config/db';

async function bootstrap() {
  console.log('----------------------------------------------------');
  console.log('  TrustLens Platform API Server Starting...        ');
  console.log('----------------------------------------------------');

  // Attempt database connection
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`✓ TrustLens API Server listening on port ${env.PORT}`);
    console.log(`✓ Environment: ${env.NODE_ENV}`);
    console.log(`✓ Base API: http://localhost:${env.PORT}/api`);
    console.log(`✓ Health Check: http://localhost:${env.PORT}/api/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await prisma.$disconnect();
        console.log('Prisma disconnected.');
      } catch {
        // ignore
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
