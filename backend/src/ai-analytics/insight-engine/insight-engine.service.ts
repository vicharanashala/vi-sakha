import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ContributionAnalyzer, ContributionResult } from './contribution-analyzer';
import { ConsistencyValidator } from './consistency-validator';
import { CacheService } from '../../cache/cache.service';

export interface AIInsight {
  title: string;
  summary: string;
  insight: string;
  confidence_score: number;
  recommended_actions: string[];
  is_verified: boolean;
}

@Injectable()
export class InsightEngineService {
  private readonly logger = new Logger(InsightEngineService.name);

  constructor(
    private readonly contributionAnalyzer: ContributionAnalyzer,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Generates AI-powered insights for a specific metric.
   * Auto-refreshes every hour unless forced.
   */
  async getInsights(metric: 'queries' | 'tickets', forceRefresh: boolean = false): Promise<AIInsight[]> {
    const cacheKey = `vs:ai:insights:${metric}`;
    if (!forceRefresh) {
      const cached = await this.cache.get<AIInsight[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      // 1. Quantitative Analysis (Ground Truth)
      const targetDate = new Date();
      const analysis = await this.contributionAnalyzer.analyze(metric, targetDate);

      // Only proceed if there is a significant change (Anomaly > 5%)
      if (Math.abs(analysis.totalChange) < 5) {
        return [];
      }

      // 2. LLM Explanation with Consistency Check
      let insight = await this.generateWithFallback(analysis);
      
      const insights = [insight];
      await this.cache.set(cacheKey, insights, 3600); // 1hr cache
      return insights;
    } catch (error: any) {
      this.logger.error(`Failed to generate insights: ${error.message}`);
      return [];
    }
  }

  private async generateWithFallback(analysis: ContributionResult): Promise<AIInsight> {
    const prompt = this.buildPrompt(analysis);
    
    try {
      // Attempt 1: Normal LLM call
      let explanation = await this.callLLM(prompt);
      
      // Consistency Check (Hallucination Guardrail)
      const groundTruthNumbers: Record<string, number> = {
        totalChange: analysis.totalChange,
      };
      analysis.topDrivers.forEach(d => {
        groundTruthNumbers[`impact_${d.value}`] = d.impact;
      });

      const check = ConsistencyValidator.validate(explanation.insight, groundTruthNumbers);

      if (check.isValid) {
        return { ...explanation, is_verified: true, confidence_score: this.calculateConfidence(analysis, 1.0) };
      }

      // Attempt 2: Stricter Fallback Prompt
      this.logger.warn(`Hallucination detected in AI insight for ${analysis.metric}. Retrying with stricter constraints.`);
      const strictPrompt = `${prompt}\n\nSTRICT REQUIREMENT: You MUST use the exact numbers provided in the analysis section. Do NOT deviate or infer other values. Failure to match numbers will results in system errors.`;
      explanation = await this.callLLM(strictPrompt);
      
      const secondCheck = ConsistencyValidator.validate(explanation.insight, groundTruthNumbers);
      
      if (secondCheck.isValid) {
        return { ...explanation, is_verified: true, confidence_score: this.calculateConfidence(analysis, 0.8) };
      }

      // Final Fallback: Templated (Non-LLM) Output
      this.logger.error(`Persistent hallucination for ${analysis.metric}. Falling back to templated output.`);
      return this.createTemplatedInsight(analysis);

    } catch (error: any) {
      this.logger.error(`LLM Error: ${error.message}`);
      return this.createTemplatedInsight(analysis);
    }
  }

  private buildPrompt(analysis: ContributionResult): string {
    return `You are a Senior Analytics Architect. Explain the following metric anomaly to a Lab Member.
    
    METRIC: ${analysis.metric.toUpperCase()}
    TOTAL CHANGE: ${analysis.totalChange}%
    TOP DRIVERS:
    ${analysis.topDrivers.map(d => `- ${d.dimension} (${d.value}): Impact ${d.impact}% contribution change`).join('\n')}

    INSTRUCTIONS:
    1. Provide a professional title and summary.
    2. In the "insight" field, explain WHY this happened using the contribution data.
    3. Suggest at least 2 actionable recommendations.
    4. Respond ONLY in valid JSON format matching the schema:
    {
      "title": "String",
      "summary": "String",
      "insight": "Detailed explanation using the percentages provided",
      "recommended_actions": ["Action 1", "Action 2"]
    }`;
  }

  private async callLLM(prompt: string): Promise<any> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          },
          {
            baseURL: '', // Prevent interference from global baseURL
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
          },
        ),
      );

      const text = response.data?.content?.[0]?.text;
      
      // Clean markdown fences if present
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonText = text.substring(jsonStart, jsonEnd);
      
      return JSON.parse(jsonText);
    } catch (error: any) {
      this.logger.error(`LLM API Communication Error: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`LLM Error Body: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  private calculateConfidence(analysis: ContributionResult, llmFactor: number): number {
    const magnitude = Math.min(Math.abs(analysis.totalChange) / 20, 1.0); // Higher change = higher confidence in detection
    const dataCompleteness = analysis.topDrivers.length >= 2 ? 1.0 : 0.7;
    return parseFloat(((magnitude * 0.4 + dataCompleteness * 0.4) * llmFactor).toFixed(2));
  }

  private createTemplatedInsight(analysis: ContributionResult): AIInsight {
    const topDriver = analysis.topDrivers && analysis.topDrivers.length > 0 
      ? analysis.topDrivers[0] 
      : { dimension: 'system', value: 'general', impact: 0 };
    
    const trend = analysis.totalChange > 0 ? 'increase' : 'decrease';
    
    return {
      title: `${analysis.metric.toUpperCase()} ${trend.toUpperCase()} DETECTED`,
      summary: `${analysis.metric} showed a ${Math.abs(analysis.totalChange)}% ${trend} compared to the previous week.`,
      insight: analysis.topDrivers?.length > 0 
        ? `The current ${trend} is primarily driven by a significant shift in ${topDriver.dimension} (${topDriver.value}), which contributed a ${topDriver.impact}% change to the overall distribution.`
        : `The current ${trend} represents a general shift across the analyzed period without a single dominant category driver.`,
      recommended_actions: [
        `Review the recent activity in ${topDriver.value === 'general' ? 'all' : 'category: ' + topDriver.value}`,
        `Verify if this shift correlates with any recent system changes or deployments.`
      ],
      confidence_score: this.calculateConfidence(analysis, 0.5),
      is_verified: false
    };
  }
}
