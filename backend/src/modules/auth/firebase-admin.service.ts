import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length === 0) {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
      const serviceAccountStr = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');

      // 1. Try explicit JSON file (most robust)
      if (fs.existsSync(serviceAccountPath)) {
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          this.logger.log(`Firebase Admin SDK Initialized with file: ${serviceAccountPath}`);
          return;
        } catch (error: any) {
          this.logger.error(`Failed to load service-account.json: ${error.message}`);
        }
      }

      // 2. Try explicit JSON string in environment
      if (serviceAccountStr) {
        try {
          const cleanJson = serviceAccountStr.trim().replace(/^'|'$/g, '');
          const serviceAccount = JSON.parse(cleanJson);
          
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          this.logger.log(`Firebase Admin SDK Initialized with ENV Service Account for ${serviceAccount.project_id}`);
          return;
        } catch (error: any) {
          this.logger.error(`Failed to parse FIREBASE_SERVICE_ACCOUNT from env: ${error.message}`);
        }
      }

      // 3. Fallback to Project ID (ADC)
      admin.initializeApp({
        projectId: projectId,
      });
      this.logger.log(`Firebase Admin SDK Initialized with Project ID: ${projectId} (ADC)`);
    }
  }

  async verifyIdToken(idToken: string) {
    return admin.auth().verifyIdToken(idToken);
  }

  async getUser(uid: string) {
    return admin.auth().getUser(uid);
  }

  async createUser(properties: admin.auth.CreateRequest) {
    return admin.auth().createUser(properties);
  }

  async updateUser(uid: string, properties: admin.auth.UpdateRequest) {
    return admin.auth().updateUser(uid, properties);
  }

  async deleteUser(uid: string) {
    return admin.auth().deleteUser(uid);
  }
}

