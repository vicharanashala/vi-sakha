import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env only if it exists (graceful for Docker environments)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded, static as expressStatic } from 'express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Use Socket.IO adapter so the WebSocket gateway works with the socket.io client
  app.useWebSocketAdapter(new IoAdapter(app));

  // Allow screenshot attachments encoded as data URLs in ticket payloads (US2, US3).
  // Increased limit to 12MB to accommodate multiple high-res base64 images.
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));

  // Enable CORS
  const corsOrigins = process.env.CORS_ORIGINS?.split(',');
  app.enableCors({
    origin: corsOrigins || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: !!corsOrigins,
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

  // ----- Swagger OpenAPI Configuration (Milestone 1 Compliance) -----
  // Generates the interactive documentation available at /api/docs.
  const config = new DocumentBuilder()
    .setTitle('Vinternship API')
    .setDescription(
      'The backend API for the Vinternship Student Support System. Provides full GenAI integration and endpoint mapping for Learner, Support Desk, and Admin User Stories.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Seed default admin on every startup (no-op if already exists)
  const usersService = app.get(UsersService);
  await usersService.ensureAdminExists();

  // ----- Serve Frontend Static Files (SPA) -----
  // Find the frontend dist folder
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'frontend', 'dist'),  // Docker: /app/frontend/dist
    path.join(process.cwd(), '..', 'frontend', 'dist'),    // Alt Docker path
    path.join(process.cwd(), 'frontend', 'dist'),           // If running from /app
  ];

  const frontendDistPath = possiblePaths.find(p => fs.existsSync(p));

  if (frontendDistPath) {
    console.log(`[Bootstrap] Serving frontend from: ${frontendDistPath}`);

    // Serve static assets (JS, CSS, images, etc.)
    app.use(expressStatic(frontendDistPath));

    // SPA fallback: for any GET request that doesn't match an API route
    // or a static file, serve index.html and let React Router handle it
    const indexHtml = path.join(frontendDistPath, 'index.html');
    app.use((req: any, res: any, next: any) => {
      // Only handle GET requests that aren't API calls
      if (req.method === 'GET' && !req.url.startsWith('/api')) {
        res.sendFile(indexHtml);
      } else {
        next();
      }
    });
  } else {
    console.warn(`[Bootstrap] No frontend dist found. Tried:`);
    possiblePaths.forEach(p => console.warn(`  - ${p} (exists: ${fs.existsSync(p)})`));
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════╗
║     Vinternship Backend API                    ║
╠════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}       ║
║  API Base URL: http://localhost:${port}/api        ║
${frontendDistPath ? '║  Frontend: Served from NestJS                  ║' : '║  Frontend: NOT FOUND (run separately)          ║'}
╚════════════════════════════════════════════════╝
  `);
}

bootstrap();
