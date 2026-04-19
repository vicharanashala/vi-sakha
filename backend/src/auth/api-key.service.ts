import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';

/**
 * [ApiKeyService]
 * Orchestrates the lifecycle of developer identity tokens with persistent encryption.
 */
@Injectable()
export class ApiKeyService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor(
    @InjectModel(ApiKey.name) private readonly apiKeyModel: Model<ApiKeyDocument>,
    private readonly configService: ConfigService,
  ) {
    const rawSecret = this.configService.get<string>('API_KEY_SECRET') || 'default-secret-not-for-production-use-32-chars';
    // Ensure 32 bytes for aes-256
    this.secretKey = crypto.createHash('sha256').update(rawSecret).digest();
  }

  /**
   * @description Creates a new API key with 30-day TTL and AES-256 encryption.
   * @param userId The owner of the key.
   * @param name The friendly name assigned to the key.
   * @returns The raw API key (one-time view, but retrievable later via decryption).
   */
  async create(userId: string, name: string) {
    // Enforcement: Maximum 5 keys per user
    const currentCount = await this.apiKeyModel.countDocuments({ userId: new Types.ObjectId(userId) });
    if (currentCount >= 5) {
      throw new BadRequestException('API Key limit reached (Max 5). Please revoke old keys first.');
    }

    const entropy = crypto.randomBytes(32).toString('hex');
    const rawKey = `vsakha_live_${entropy}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const last4 = rawKey.slice(-4);

    // Encryption
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    let encrypted = cipher.update(rawKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // TTL: 30 Days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const apiKey = new this.apiKeyModel({
      userId: new Types.ObjectId(userId),
      name,
      keyHash: hash,
      encryptedKey: encrypted,
      iv: iv.toString('hex'),
      last4,
      expiresAt,
    });

    await apiKey.save();
    return { id: apiKey._id, apiKey: rawKey, expiresAt };
  }

  /**
   * @description Retrieves active keys for a user, decrypted for the "Copy Again" feature.
   */
  async findAllForUser(userId: string) {
    const keys = await this.apiKeyModel.find({ userId: new Types.ObjectId(userId) }).exec();
    
    return keys.map(k => {
      const decrypted = this.decrypt(k.encryptedKey, k.iv);
      return {
        id: k._id,
        name: k.name,
        key: decrypted,
        last4: k.last4,
        createdAt: (k as any).createdAt,
        expiresAt: k.expiresAt,
        isExpired: k.expiresAt < new Date(),
      };
    });
  }

  /**
   * @description Deletes (revokes) a specific API key.
   */
  async delete(id: string, userId: string) {
    return this.apiKeyModel.findOneAndDelete({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) }).exec();
  }

  /**
   * @description Validates a raw API key against stored hashes.
   */
  async validate(rawKey: string) {
    if (!rawKey.startsWith('vsakha_live_')) return null;
    
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyDoc = await this.apiKeyModel.findOne({ keyHash: hash }).populate('userId').exec();
    
    if (!keyDoc || !keyDoc.isActive) return null;
    
    // Safety check: Even if MongoDB hasn't deleted the document yet, we enforce TTL
    if (keyDoc.expiresAt < new Date()) {
      return null;
    }
    
    return keyDoc.userId;
  }

  private decrypt(encrypted: string, ivHex: string): string {
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      return '******* (Decryption Failed)';
    }
  }
}
