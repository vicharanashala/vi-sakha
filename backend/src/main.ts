import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow screenshot attachments encoded as data URLs in ticket payloads.
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════╗
║     Vinternship Backend API                    ║
╠════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}       ║
║  API Base URL: http://localhost:${port}/api        ║
╚════════════════════════════════════════════════╝
  `);
}

bootstrap();
