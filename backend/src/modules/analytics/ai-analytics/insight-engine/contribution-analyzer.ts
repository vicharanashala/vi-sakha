import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback } from '../../feedback/schemas/feedback.schema';
import { Conversation } from '../../../rag/chat/schemas/conversation.schema';
import { Ticket } from '../../../rag/tickets/schemas/ticket.schema';

export interface DriverImpact {
  dimension: string;
  value: string;
  impact: number; // Percentage change in contribution
  currentCount: number;
}

export interface ContributionResult {
  metric: string;
  totalChange: number;
  topDrivers: DriverImpact[];
}

@Injectable()
export class ContributionAnalyzer {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<any>,
    @InjectModel(Conversation.name) private readonly conversationModel: Model<any>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<any>,
  ) {}

  /**
   * Identifies why a metric changed by analyzing dimensions (topic, cohort, device).
   */
  async analyze(metric: 'queries' | 'tickets', targetDate: Date): Promise<ContributionResult> {
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const baselineStart = new Date(dayStart);
    baselineStart.setDate(baselineStart.getDate() - 7);
    const baselineEnd = new Date(dayStart); // 7 days leading up to target

    // 1. Get total counts
    const currentTotal = await this.getCount(metric, dayStart, dayEnd);
    const baselineTotal = await this.getAverageCount(metric, baselineStart, baselineEnd);
    
    const totalChange = baselineTotal > 0 ? (currentTotal - baselineTotal) / baselineTotal : 0;

    // 2. Breakdown by Topic (Feedback)
    const drivers: DriverImpact[] = [];
    
    if (metric === 'queries') {
      const topicDrivers = await this.getDimensionImpact(
        'topic', 
        this.feedbackModel, 
        dayStart, dayEnd, 
        baselineStart, baselineEnd,
        'rating', 'down' // Focus on negative/problematic drivers
      );
      drivers.push(...topicDrivers);

      const deviceDrivers = await this.getDimensionImpact(
        'deviceType',
        this.conversationModel,
        dayStart, dayEnd,
        baselineStart, baselineEnd
      );
      drivers.push(...deviceDrivers);
    } else {
      const cohortDrivers = await this.getDimensionImpact(
        'cohort',
        this.ticketModel,
        dayStart, dayEnd,
        baselineStart, baselineEnd
      );
      drivers.push(...cohortDrivers);
    }

    return {
      metric,
      totalChange: Math.round(totalChange * 100),
      topDrivers: drivers
        .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
        .slice(0, 5)
    };
  }

  private async getCount(metric: string, start: Date, end: Date): Promise<number> {
    const model = metric === 'queries' ? this.conversationModel : this.ticketModel;
    return model.countDocuments({ createdAt: { $gte: start, $lte: end } });
  }

  private async getAverageCount(metric: string, start: Date, end: Date): Promise<number> {
    const total = await this.getCount(metric, start, end);
    return total / 7;
  }

  private async getDimensionImpact(
    dimension: string,
    model: Model<any>,
    dayStart: Date, dayEnd: Date,
    baselineStart: Date, baselineEnd: Date,
    filterKey?: string, filterValue?: any
  ): Promise<DriverImpact[]> {
    const match: any = { createdAt: { $gte: dayStart, $lte: dayEnd } };
    if (filterKey) match[filterKey] = filterValue;

    // Current Distribution
    const currentAgg = await model.aggregate([
      { $match: match },
      { $group: { _id: `$${dimension}`, count: { $sum: 1 } } }
    ]);

    const totalCurrent = currentAgg.reduce((sum, item) => sum + item.count, 0);

    // Baseline Distribution
    const baselineMatch: any = { createdAt: { $gte: baselineStart, $lte: baselineEnd } };
    if (filterKey) baselineMatch[filterKey] = filterValue;

    const baselineAgg = await model.aggregate([
      { $match: baselineMatch },
      { $group: { _id: `$${dimension}`, count: { $sum: 1 } } }
    ]);

    const totalBaseline = baselineAgg.reduce((sum, item) => sum + item.count, 0);

    const results: DriverImpact[] = [];

    for (const item of currentAgg) {
      if (!item._id) continue;
      
      const currentRatio = item.count / (totalCurrent || 1);
      const baselineItem = baselineAgg.find(b => b._id === item._id);
      const baselineRatio = (baselineItem?.count || 0) / (totalBaseline || 1);
      
      const impact = (currentRatio - baselineRatio) * 100;

      if (Math.abs(impact) > 2) { // Only report significant shifts (>2%)
        results.push({
          dimension,
          value: String(item._id),
          impact: Math.round(impact),
          currentCount: item.count
        });
      }
    }

    return results;
  }
}
