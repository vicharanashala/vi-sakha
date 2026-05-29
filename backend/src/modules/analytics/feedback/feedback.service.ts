import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';
import { Ticket } from '../../rag/tickets/schemas/ticket.schema';
import { Conversation } from '../../rag/chat/schemas/conversation.schema';
import { Message } from '../../rag/chat/schemas/message.schema';
import { QaProposal } from '../../rag/qa-proposals/schemas/qa-proposal.schema';
import { QaPair } from '../../rag/qa-pairs/schemas/qa-pair.schema';
import { DiscordConversation, DiscordConversationDocument } from '../../discord/schemas/discord-conversation.schema';
import { CacheService } from '../../rag/cache/cache.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/schemas/user.schema';


export interface HotspotResult {
  topic: string;
  total: number;
  negative: number;
  negativeRatio: number;
}

export interface FeedbackRatio {
  positive: number;
  negative: number;
  total: number;
}

export interface DashboardSummary {
  totalQueries: number;
  totalTickets: number;
  aiResolutionRate: number;
  avgResponseMs: number;
  activeStudents: number;
  kbSize: number;
  qaApprovalRate: number;
  qaApproved: number;
  qaPending: number;
  qaRejected: number;
  qaTotal: number;
  openTickets: number;
  resolvedTickets: number;
  ticketResolutionRate: number;
  avgResolutionHours: number;
  discordOpen: number;
  discordClosed: number;
  discordTotal: number;
  totalUsers: number;
  studentCount: number;
  staffCount: number;
  todayQueries: number;
  todayAiResolved: number;
  todayAiResolutionRate: number;
}

const VALID_TOPICS = [
  'Deadlines',
  'HP System',
  'Technical Issue',
  'Case Studies',
  'ViBe Modules',
  'Ejection Policy',
  'Discord',
  'Submissions',
  'General',
];

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<FeedbackDocument>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<any>,
    @InjectModel(Conversation.name) private readonly conversationModel: Model<any>,
    @InjectModel(Message.name) private readonly messageModel: Model<any>,
    @InjectModel(QaProposal.name) private readonly qaProposalModel: Model<any>,
    @InjectModel(QaPair.name) private readonly qaPairModel: Model<any>,
    @InjectModel(DiscordConversation.name) private readonly discordModel: Model<DiscordConversationDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
    private readonly usersService: UsersService,
  ) { }

  /**
   * @description Internal method to categorize user queries using LLM (Claude Haiku).
   * Maps feedback to specific academic or technical categories.
   */
  private async classifyTopic(text: string): Promise<string> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return 'General';
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 20,
            messages: [
              {
                role: 'user',
                content: `Classify this chatbot response into exactly ONE topic.\nTopics: Deadlines, HP System, Technical Issue, Case Studies, ViBe Modules, Ejection Policy, Discord, Submissions, General\nRespond with ONLY the topic name.\n\nResponse: "${text.substring(0, 500)}"`,
              },
            ],
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
          },
        ),
      );
      const topic = response.data?.content?.[0]?.text?.trim();
      return VALID_TOPICS.includes(topic) ? topic : 'General';
    } catch {
      return 'General';
    }
  }

  /**
   * @description Logs a student rating (up/down) for a specific AI response (US10).
   * Automatically triggers a topic classification to power the Hotspot analytics.
   */
  async create(dto: CreateFeedbackDto): Promise<FeedbackDocument> {
    const topic = await this.classifyTopic(dto.messageContent);
    const result = await this.feedbackModel.findOneAndUpdate(
      { messageId: dto.messageId },
      {
        $set: {
          conversationId: dto.conversationId,
          topic,
          rating: dto.rating,
        },
        $setOnInsert: { messageId: dto.messageId },
      },
      { upsert: true, new: true },
    );

    await this.cache.invalidatePattern('vs:fb:*');
    return result;
  }

  /**
   * @description Aggregates negative feedback by topic to identify "Hotspots".
   * Used by Lab Members to prioritize knowledge base updates (US10/US11).
   */
  async getHotspots(): Promise<HotspotResult[]> {
    return this.cache.wrap('vs:fb:hotspots', 3600, async () => {
      return this.feedbackModel.aggregate([
        {
          $group: {
            _id: '$topic',
            total: { $sum: 1 },
            negative: {
              $sum: { $cond: [{ $eq: ['$rating', 'down'] }, 1, 0] },
            },
          },
        },
        {
          $addFields: {
            negativeRatio: { $divide: ['$negative', '$total'] },
          },
        },
        { $sort: { negativeRatio: -1 } },
        {
          $project: {
            _id: 0,
            topic: '$_id',
            total: 1,
            negative: 1,
            negativeRatio: 1,
          },
        },
      ]);
    });
  }

  /**
   * @description Retrieves detailed feedback entries for a specific problematic topic.
   */
  async getByTopic(topic: string): Promise<FeedbackDocument[]> {
    return this.feedbackModel
      .find({ topic, rating: 'down' })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  /**
   * Overall positive vs negative feedback counts
   */
  async getFeedbackRatio(): Promise<FeedbackRatio> {
    return this.cache.wrap('vs:fb:ratio', 3600, async () => {
      const result = await this.feedbackModel.aggregate([
        {
          $group: {
            _id: null,
            positive: { $sum: { $cond: [{ $eq: ['$rating', 'up'] }, 1, 0] } },
            negative: { $sum: { $cond: [{ $eq: ['$rating', 'down'] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
      ]);
      return result[0] ?? { positive: 0, negative: 0, total: 0 };
    });
  }

  /**
   * Aggregated dashboard summary: real KPIs from all collections
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.cache.wrap('vs:fb:dashboard', 300, async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [
        totalQueries,
        totalTickets,
        aiResolvedCount,
        avgResponseAgg,
        activeStudentsAgg,
        kbSize,
        qaStats,
        ticketStats,
        resHoursAgg,
        discordAgg,
        totalUsers,
        studentCount,
        labMemberCount,
        adminCount,
        todayQueries,
        todayAiResolvedCount,
      ] = await Promise.all([
        // Total conversations (queries)
        this.conversationModel.countDocuments(),
        // Total tickets
        this.ticketModel.countDocuments(),
        // AI-resolved conversations (no human escalation)
        this.conversationModel.countDocuments({
          $or: [
            { resolutionType: 'ai' },
            { resolutionType: { $exists: false } },
          ],
          status: { $ne: 'escalated' },
        }),
        // Average response time from assistant messages
        this.messageModel.aggregate([
          { $match: { role: 'assistant', responseTimeMs: { $exists: true, $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$responseTimeMs' } } },
        ]),
        // Distinct active students in last 30 days
        this.conversationModel.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: '$studentId' } },
          { $count: 'count' },
        ]),
        // Knowledge base size
        this.qaPairModel.countDocuments(),
        // QA proposal stats
        this.qaProposalModel.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            },
          },
        ]),
        // Ticket resolution stats
        this.ticketModel.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
              resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            },
          },
        ]),
        // Avg resolution hours
        this.ticketModel.aggregate([
          { $match: { status: 'resolved', resolvedAt: { $exists: true } } },
          {
            $project: {
              diff: { $subtract: ['$resolvedAt', '$createdAt'] },
            },
          },
          { $group: { _id: null, avgMs: { $avg: '$diff' } } },
        ]),
        // Discord stats
        this.discordModel.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
              closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
            },
          },
        ]),
        // User counts
        this.usersService.countAll(),
        this.usersService.countByRole(UserRole.STUDENT),
        this.usersService.countByRole(UserRole.LAB_MEMBER),
        this.usersService.countByRole(UserRole.ADMIN),
        // Today's total queries
        this.conversationModel.countDocuments({ createdAt: { $gte: startOfToday } }),
        // Today's AI-resolved conversations
        this.conversationModel.countDocuments({
          createdAt: { $gte: startOfToday },
          $or: [
            { resolutionType: 'ai' },
            { resolutionType: { $exists: false } },
          ],
          status: { $ne: 'escalated' },
        }),
      ]);

      const qa = qaStats[0] ?? { total: 0, approved: 0, pending: 0, rejected: 0 };
      const tickets = ticketStats[0] ?? { total: 0, open: 0, resolved: 0 };
      const avgMs = avgResponseAgg[0]?.avg ?? 0;
      const activeStudents = activeStudentsAgg[0]?.count ?? 0;
      const aiRate = totalQueries > 0 ? Math.round((aiResolvedCount / totalQueries) * 100) : 0;
      const ticketResRate = tickets.total > 0 ? Math.round((tickets.resolved / tickets.total) * 100) : 0;
      const todayAiRate = todayQueries > 0 ? Math.round((todayAiResolvedCount / todayQueries) * 100) : 0;

      // Calculate avg duration in hours
      const resMs = resHoursAgg[0]?.avgMs ?? 0;
      const avgResHours = resMs > 0 ? Math.round(resMs / (1000 * 60 * 60)) : 0;

      const discord = discordAgg[0] ?? { total: 0, open: 0, closed: 0 };

      return {
        totalQueries,
        totalTickets,
        aiResolutionRate: aiRate,
        avgResponseMs: Math.round(avgMs),
        activeStudents,
        kbSize,
        qaApprovalRate: qa.total > 0 ? Math.round((qa.approved / qa.total) * 100) : 0,
        qaApproved: qa.approved,
        qaPending: qa.pending,
        qaRejected: qa.rejected,
        qaTotal: qa.total,
        openTickets: tickets.open,
        resolvedTickets: tickets.resolved,
        ticketResolutionRate: ticketResRate,
        avgResolutionHours: avgResHours,
        discordOpen: discord.open,
        discordClosed: discord.closed,
        discordTotal: discord.total,
        totalUsers,
        studentCount,
        staffCount: (labMemberCount || 0) + (adminCount || 0),
        todayQueries,
        todayAiResolved: todayAiResolvedCount,
        todayAiResolutionRate: todayAiRate,
      };
    });
  }
}
