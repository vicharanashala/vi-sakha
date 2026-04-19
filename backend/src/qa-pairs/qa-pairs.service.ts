import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QaPair, QaPairDocument } from './schemas/qa-pair.schema';

@Injectable()
export class QaPairsService {
  constructor(
    @InjectModel(QaPair.name) private qaPairModel: Model<QaPairDocument>,
  ) {}

  /**
   * @description Direct retrieval of verified QA nodes with support for skip/limit pagination.
   */
  async findAll(limit = 100, skip = 0): Promise<QaPair[]> {
    return this.qaPairModel.find().skip(skip).limit(limit).exec();
  }

  async findOne(id: string): Promise<QaPair | null> {
    return this.qaPairModel.findById(id).exec();
  }

  /**
   * @description Semantic text search within the QA collection (requires MongoDB text index).
   */
  async search(query: string, limit = 10): Promise<QaPair[]> {
    return this.qaPairModel
      .find({ $text: { $search: query } })
      .limit(limit)
      .exec();
  }

  async findBySource(source: string): Promise<QaPair[]> {
    return this.qaPairModel.find({ source }).exec();
  }

  async count(): Promise<number> {
    return this.qaPairModel.countDocuments().exec();
  }

  /**
   * @description Manually persists a new QA pairing into the database store.
   */
  async create(data: Partial<QaPair>): Promise<QaPair> {
    const created = new this.qaPairModel(data);
    return created.save();
  }

  async createMany(data: Partial<QaPair>[]): Promise<QaPair[]> {
    const result = await this.qaPairModel.insertMany(data);
    return result as unknown as QaPair[];
  }

  async deleteAll(): Promise<{ deletedCount: number }> {
    const result = await this.qaPairModel.deleteMany({});
    return { deletedCount: result.deletedCount || 0 };
  }
}
