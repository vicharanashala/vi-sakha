import { NestFactory } from '@nestjs/core';
import { BotModule } from './bot.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const logger = new Logger('BotBootstrap');
  
  // Load bot-specific env if it exists (check current and parent dir)
  const envPaths = [
    path.resolve(process.cwd(), '.env.bot'),
    path.resolve(process.cwd(), '..', '.env.bot'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
  ];
  
  const activeEnv = envPaths.find(p => fs.existsSync(p));
  if (activeEnv) {
    logger.log(`Loading environment from ${activeEnv}`);
    dotenv.config({ path: activeEnv });
  } else {
    logger.warn('No .env.bot or .env found, using system environment variables');
  }

  const app = await NestFactory.createApplicationContext(BotModule);
  
  logger.log('Discord Bot Service is running...');
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    logger.log('Shutting down bot...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
