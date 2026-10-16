import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { LOAD_UPLOADS_DIRECTORY } from './loads/load-upload.config.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    '/uploads',
    express.static(LOAD_UPLOADS_DIRECTORY, {
      dotfiles: 'deny',
      index: false,
      setHeaders: (response) => {
        response.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away any properties that don't have decorators in the DTO
      forbidNonWhitelisted: true, // Throws an error if someone sends extra unauthorized fields
      transform: true, // Automatically transforms payloads to match DTO types (e.g. string numbers to actual numbers if needed)
    }),
  );

  await app.listen(3000);
}
void bootstrap().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exitCode = 1;
});
