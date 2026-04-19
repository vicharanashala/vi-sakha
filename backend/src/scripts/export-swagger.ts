import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Vinternship API')
    .setDescription(
      'The backend API for the Vinternship Student Support System. Provides full GenAI integration and endpoint mapping for Learner, Support Desk, and Admin User Stories.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const yamlString = yaml.dump(document);
  fs.writeFileSync('swagger.yaml', yamlString, 'utf8');

  console.log('Successfully generated swagger.yaml in the backend root directory.');
  await app.close();
}

bootstrap();
