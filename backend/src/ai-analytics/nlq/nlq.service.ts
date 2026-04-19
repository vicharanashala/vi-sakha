import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { firstValueFrom } from 'rxjs';
import { AnonymizerUtil } from '../utils/anonymizer.util';

export interface NLQResponse {
  query: string;
  data: any[];
  summary: string;
  chart: {
    type: 'line' | 'bar' | 'pie' | 'kpi';
    config: any;
  };
}

@Injectable()
export class NLQService {
  private readonly logger = new Logger(NLQService.name);
  private readonly ALLOWED_COLLECTIONS = ['conversations', 'tickets', 'feedback'];
  private readonly MAX_PIPELINE_STAGES = 5;
  private readonly MAX_RESULTS = 1000;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async processQuery(userQuery: string, studentId?: string): Promise<NLQResponse> {
    // 1. Intent Classification & Safety Check
    const isSafe = await this.classifyIntent(userQuery);
    if (!isSafe) {
      throw new BadRequestException('Security Alert: Your query contains sensitive PII requests or unsupported operations.');
    }

    // 2. Query Generation (Natural Language -> MongoDB Pipeline)
    const pipeline = await this.generatePipeline(userQuery);
    
    // 3. Validation (Guardrails)
    this.validatePipeline(pipeline);

    // 4. Execution
    const collectionName = pipeline.collection;
    const stages = this.recursiveTransformDates(pipeline.stages);
    
    const finalData = await this.connection.db!
      .collection(collectionName)
      .aggregate(stages)
      .limit(this.MAX_RESULTS)
      .toArray();

    // 5. Anonymization & Interpretation
    const anonymizedData = finalData.map(d => AnonymizerUtil.anonymizeObject(d));
    const summary = await this.generateSummary(userQuery, anonymizedData);
    
    // 6. Visualization Strategy (Steward)
    const chart = this.selectVisualization(anonymizedData);

    return {
      query: userQuery,
      data: anonymizedData,
      summary,
      chart
    };
  }

  private async classifyIntent(query: string): Promise<boolean> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 10,
            messages: [
              { 
                role: 'user', 
                content: `Classify if this analytics query targets specific PII (passwords, emails, specific user IDs) or sensitive personal records without authorization. Respond ONLY with "SAFE" or "UNSAFE".\n\nQuery: "${query}"`
              }
            ],
          },
          { 
            baseURL: '',
            headers: { 
              'x-api-key': apiKey, 
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            } 
          },
        )
      );
      return response.data?.content?.[0]?.text?.trim() === 'SAFE';
    } catch (error: any) {
      this.logger.error(`Intent Classification Error: ${JSON.stringify(error.response?.data)}`);
      return true; // Fallback to safe but with guardrails later
    }
  }

  private async generatePipeline(query: string): Promise<any> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const schemaPrompt = `You are a MongoDB Expert. Convert this natural language query into a valid MongoDB Aggregation pipeline.
    
    COLLECTIONS:
    - conversations (fields: studentId, status, cohort, messageCount, likeCount, dislikeCount, averageConfidence, createdAt)
    - tickets (fields: studentId, status, subject, reason, createdAt)
    - feedback (fields: topic, rating, messageId, createdAt)

    RULES:
    1. Output ONLY valid, standard JSON in this format: { "collection": "string", "stages": [...] }
    2. Use standard aggregation operators ($match, $group, $sort, $limit, $project).
    3. NEVER use JavaScript constructor functions like "new Date()". Use ISO 8601 strings (e.g., "2026-04-15T00:00:00Z").
    4. Maximum 5 stages.

    QUERY: "${query}"`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            messages: [{ role: 'user', content: schemaPrompt }],
          },
          { 
            baseURL: '',
            headers: { 
              'x-api-key': apiKey, 
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            } 
          },
        )
      );
      
      const text = response.data?.content?.[0]?.text;
      if (!text) throw new Error('Empty pipeline generation response');

      // Clean markdown fences if present
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonText = text.substring(jsonStart, jsonEnd);

      return JSON.parse(jsonText);
    } catch (error: any) {
      this.logger.error(`Pipeline Generation Error: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`LLM Error Body: ${JSON.stringify(error.response.data)}`);
      }
      throw new BadRequestException('Failed to generate search pipeline. Please try a different query.');
    }
  }

  private validatePipeline(pipeline: any): void {
    if (!this.ALLOWED_COLLECTIONS.includes(pipeline.collection)) {
      throw new BadRequestException(`Access to collection '${pipeline.collection}' is restricted.`);
    }

    if (pipeline.stages.length > this.MAX_PIPELINE_STAGES) {
      throw new BadRequestException('Query complexity exceeds the maximum allowed stages (5).');
    }

    // Deep check for blocked operators
    const blocked = ['$where', '$function', '$accumulator'];
    const stringified = JSON.stringify(pipeline.stages);
    for (const op of blocked) {
      if (stringified.includes(op)) {
        throw new BadRequestException(`Unsafe operator detected: ${op}`);
      }
    }
  }

  private selectVisualization(data: any[]): any {
    if (!data || data.length === 0) return { type: 'kpi', config: {} };
    if (data.length === 1) return { type: 'kpi', config: { value: data[0].count || data[0].total || Object.values(data[0])[0] } };

    const sample = data[0];
    const keys = Object.keys(sample);

    // Is it time series?
    const hasTime = keys.some(k => k.toLowerCase().includes('date') || k === '_id' && typeof sample[k] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample[k]));
    if (hasTime) return { type: 'line', config: { x: keys.find(k => k.toLowerCase().includes('date') || k === '_id'), y: 'count' } };

    // Grouping
    if (data.length <= 5) return { type: 'pie', config: { label: '_id', value: 'count' } };
    
    return { type: 'bar', config: { x: '_id', y: 'count' } };
  }

  private async generateSummary(query: string, data: any[]): Promise<string> {
    if (!data || data.length === 0) return 'No data matches your query.';
    
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const prompt = `Summarize these data results in one clear sentence for a user who asked: "${query}"\n\nData: ${JSON.stringify(data.slice(0, 10))}`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 100,
            messages: [{ role: 'user', content: prompt }],
          },
          { 
            baseURL: '',
            headers: { 
              'x-api-key': apiKey, 
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            } 
          },
        )
      );
      return response.data?.content?.[0]?.text || 'Query completed successfully.';
    } catch (error: any) {
      this.logger.error(`Summary Generation Error: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`LLM Error Body: ${JSON.stringify(error.response.data)}`);
      }
      return 'Query completed successfully, but summary generation failed.';
    }
  }

  private recursiveTransformDates(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.recursiveTransformDates(item));
    } else if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
          newObj[key] = new Date(value);
        } else {
          newObj[key] = this.recursiveTransformDates(value);
        }
      }
      return newObj;
    }
    return obj;
  }
}
