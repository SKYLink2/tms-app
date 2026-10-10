import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
  });
  
  app.enableCors();
  
  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips away any properties that don't have decorators in the DTO
    forbidNonWhitelisted: true, // Throws an error if someone sends extra unauthorized fields
    transform: true, // Automatically transforms payloads to match DTO types (e.g. string numbers to actual numbers if needed)
  }));

  await app.listen(3000);
}
void bootstrap().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exitCode = 1;
});