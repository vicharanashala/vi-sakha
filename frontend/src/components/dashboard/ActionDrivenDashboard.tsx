import { useEffect, useState } from 'react';
import {
  fetchProposals,
  getConversations,
  getTicketsPaginated,
  getDashboardSummary,
  adminListUsers,
  getTicketStats,
  getFeedbackHotspots,
  getFeedbackByTopic,
  adminGetQaGrowth,
  adminGetPerformance,
  getConversation,
  QaProposal,
  Conversation,
  SupportTicket,
  DashboardSummary,
  TicketStats,
  FeedbackHotspot,
  FeedbackDrilldownItem,
  QaGrowthPoint,
  MemberPerformance,
  ChatMessage
} from '@/lib/api';
import {
  Loader2, Plus, MessageSquare, Ticket,
  CheckCircle2, XCircle, AlertCircle, Clock, Database, ChevronRight,
  TrendingUp, Users, Bot, Zap, ArrowUpRight, ShieldCheck,
  ChevronLeft, X, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  BarChart as VisxBarChart,
  Bar as VisxBar,
  BarXAxis,
  Grid as VisxGrid,
  ChartTooltip,
  LinearGradient,
  BarLineIndicator
} from '@/components/ui/bar-chart';

interface ActionDrivenDashboardProps {
  isAdmin: boolean;
  user: any;
  onNavigate: (view: any) => void;
}

/**
 * Simple markdown renderer for chat messages in drilldown
 */
function renderMarkdown(text: string): JSX.Element {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const processInline = (line: string): JSX.Element => {
    const parts: (string | JSX.Element)[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);

      const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
      const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : -1;

      if (boldIdx !== -1 && (italicIdx === -1 || boldIdx <= italicIdx)) {
        if (boldIdx > 0) parts.push(remaining.substring(0, boldIdx));
        parts.push(<strong key={key++} className="font-semibold">{boldMatch![1]}</strong>);
        remaining = remaining.substring(boldIdx + boldMatch![0].length);
      } else if (italicIdx !== -1) {
        if (italicIdx > 0) parts.push(remaining.substring(0, italicIdx));
        parts.push(<em key={key++}>{italicMatch![1]}</em>);
        remaining = remaining.substring(italicIdx + italicMatch![0].length);
      } else {
        parts.push(remaining);
        remaining = '';
      }
    }
    return <>{parts}</>;
  };

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag key={elements.length} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} ml-4 space-y-1`}>
          {listItems.map((item, i) => <li key={i}>{processInline(item)}</li>)}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(trimmed.substring(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
    } else {
      flushList();
      if (trimmed) {
        elements.push(<p key={idx} className="mb-1 last:mb-0">{processInline(trimmed)}</p>);
      }
    }
  });
  flushList();
  return <>{elements}</>;
}

export default function ActionDrivenDashboard({ isAdmin, user, onNavigate }: ActionDrivenDashboardProps) {
  const [loading, setLoading] = useState(true);

  // Core Data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pendingProposals, setPendingProposals] = useState<QaProposal[]>([]);
  const [negativeConversations, setNegativeConversations] = useState<Conversation[]>([]);
  const [escalatedTickets, setEscalatedTickets] = useState<SupportTicket[]>([]);

  // Merged Analytics states
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [hotspots, setHotspots] = useState<FeedbackHotspot[]>([]);
  const [qaGrowth, setQaGrowth] = useState<QaGrowthPoint[]>([]);
  const [performance, setPerformance] = useState<MemberPerformance[]>([]);

  // Hotspot Drilldown states
  const [drilldownTopic, setDrilldownTopic] = useState<string | null>(null);
  const [drilldownItems, setDrilldownItems] = useState<FeedbackDrilldownItem[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<ChatMessage[] | null>(null);
  const [convLoading, setConvLoading] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [
          summaryRes,
          _usersRes,
          proposalsRes,
          convRes,
          ticketsRes,
          ticketStatsRes,
          hotspotsRes,
          qaGrowthRes,
          performanceRes
        ] = await Promise.all([
          getDashboardSummary().catch(() => null),
          isAdmin ? adminListUsers().catch(() => []) : Promise.resolve([]),
          fetchProposals('all').catch(() => ({ data: [] })),
          getConversations({ limit: 10, feedbackFilter: 'disliked' }).catch(() => ({ conversations: [] })),
          getTicketsPaginated({ status: 'open', limit: 10 }).catch(() => ({ data: [] })),
          getTicketStats().catch(() => null),
          getFeedbackHotspots().catch(() => []),
          adminGetQaGrowth().catch(() => []),
          adminGetPerformance().catch(() => [])
        ]);

        setSummary(summaryRes);
        setTicketStats(ticketStatsRes);
        setHotspots(hotspotsRes);
        setQaGrowth(qaGrowthRes);
        setPerformance(performanceRes);

        // Filter Proposals based on role
        const allProposals = proposalsRes.data || [];
        if (isAdmin) {
          setPendingProposals(allProposals.filter((p: QaProposal) => p.status === 'pending').slice(0, 3));
        } else {
          const myProposals = allProposals.filter((p: QaProposal) => p.proposedBy?.userId === user?.userId || p.proposedBy?.userId === user?.id);
          setPendingProposals(myProposals.filter((p: QaProposal) => p.status === 'pending').slice(0, 3));
        }

        // Negative rated conversations
        const negativeConvs = (convRes.conversations || []).filter((c: Conversation) => c.dislikeCount > 0).slice(0, 3);
        setNegativeConversations(negativeConvs);

        // Tickets
        setEscalatedTickets((ticketsRes.data || []).filter((t: SupportTicket) => t.status === 'open').slice(0, 3));

      } catch (error) {
        console.error("Dashboard data load error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [isAdmin, user?.userId, user?.id]);

  const openDrilldown = async (topic: string) => {
    setDrilldownTopic(topic);
    setDrilldownLoading(true);
    setDrilldownItems([]);
    setSelectedConvId(null);
    setConvMessages(null);
    try {
      const items = await getFeedbackByTopic(topic);
      setDrilldownItems(items);
    } catch (err) {
      console.error('Failed to load drilldown:', err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const openConversation = async (convId: string) => {
    setSelectedConvId(convId);
    setConvLoading(true);
    setConvMessages(null);
    try {
      const { messages } = await getConversation(convId);
      setConvMessages(messages);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setConvLoading(false);
    }
  };

  const closeDrilldown = () => {
    setDrilldownTopic(null);
    setDrilldownItems([]);
    setSelectedConvId(null);
    setConvMessages(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-500 uppercase tracking-widest animate-pulse">Initializing Integrated Dashboard</p>
      </div>
    );
  }

  // User distribution from summary
  const totalUsers = summary?.totalUsers ?? 1;
  const studentCount = summary?.studentCount ?? 0;
  const staffCount = summary?.staffCount ?? 0;

  // AI vs Human resolution distribution data
  const resData = [
    { name: 'AI Resolved', value: summary?.aiResolutionRate ?? 85, fill: '#10b981' },
    { name: 'Human Escalated', value: 100 - (summary?.aiResolutionRate ?? 85), fill: '#f59e0b' }
  ];

  return (
    <div className="space-y-8 pb-10 w-full">
      {/* HEADER SECTION */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Overview</h1>
          <p className="text-gray-500 font-medium mt-1">Real-time metrics, live analytics, and knowledge base performance.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('qa')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Propose QA
          </button>
        </div>
      </div>

      {/* TOP ROW: PREMIUM KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Role Overview */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 transition-colors">
              <Users className="w-6 h-6 text-indigo-600 group-hover:text-white" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Audience</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <h3 className="text-4xl font-black text-gray-900">{totalUsers}</h3>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-blue-500" />
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase">Total Active Users</p>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(studentCount / totalUsers) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase pt-1">
              <span>{studentCount} Students</span>
              <span>{staffCount} Staff</span>
            </div>
          </div>
        </div>

        {/* Card 2: QA Approval Rate */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-600 transition-colors">
              <ShieldCheck className="w-6 h-6 text-emerald-600 group-hover:text-white" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quality</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <h3 className="text-4xl font-black text-gray-900">{summary?.qaApprovalRate ?? 0}%</h3>
              <div className="text-emerald-600 font-bold text-xs flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" /> +2.4%
              </div>
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase">QA Approval Rate</p>
            <div className="flex gap-2 mt-4">
              <div className="flex-1 bg-emerald-50 rounded-xl p-2 border border-emerald-100 text-center">
                <p className="text-xs font-black text-emerald-700">{summary?.qaApproved ?? 0}</p>
                <p className="text-[8px] font-bold text-emerald-600 uppercase">Appr.</p>
              </div>
              <div className="flex-1 bg-amber-50 rounded-xl p-2 border border-amber-100 text-center">
                <p className="text-xs font-black text-amber-700">{summary?.qaPending ?? 0}</p>
                <p className="text-[8px] font-bold text-amber-600 uppercase">Pend.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: KB Size */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 transition-colors">
              <Database className="w-6 h-6 text-blue-600 group-hover:text-white" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Brain</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <h3 className="text-4xl font-black text-gray-900">{summary?.kbSize ?? 0}</h3>
              <div className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-1 rounded-full uppercase">verified</div>
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase">Total KB Entries</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner flex items-center p-0.5">
                <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: `${summary?.aiResolutionRate ?? 85}%` }} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{summary?.aiResolutionRate ?? 85}% automated match rate</p>
          </div>
        </div>

        {/* Card 4: AI Resolution */}
        <div className="bg-gray-900 rounded-[2.5rem] p-6 shadow-xl group overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full" />
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="p-3 bg-blue-500 rounded-2xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Efficiency</span>
          </div>
          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-end">
              <h3 className="text-4xl font-black text-white">{summary?.aiResolutionRate ?? 0}%</h3>
              <div className="text-blue-300 font-bold text-[10px] flex items-center gap-1 border border-blue-500/30 px-2 py-1 rounded-full">
                <Zap className="w-3 h-3 fill-current" /> Auto-pilot
              </div>
            </div>
            <p className="text-sm font-bold text-blue-200/60 uppercase">AI Resolution Rate</p>
            <div className="mt-4 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-blue-300">
                <span>Avg. Resolution</span>
                <span>{summary?.avgResolutionHours ?? 0}h</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-blue-300">
                <span>Today's Rate</span>
                <span>{summary?.todayQueries && summary.todayQueries > 0 ? `${summary.todayAiResolutionRate}%` : 'N/A'}</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${summary?.aiResolutionRate ?? 85}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECOND ROW: ACTIVITY SUMMARY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900">Current Performance</h3>
              <p className="text-sm font-medium text-gray-500">Live system status for this period.</p>
            </div>
            <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
              <span className="px-4 py-1.5 rounded-xl bg-white shadow-sm text-xs font-bold border border-gray-100">Today</span>
              <span className="px-4 py-1.5 rounded-xl text-xs font-bold text-gray-400">Weekly</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100 transition-all hover:bg-white hover:shadow-md group">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-blue-600 transition-colors">Total Queries</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-gray-900 leading-none">{summary?.totalQueries ?? 0}</p>
                <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
              </div>
            </div>

            <div className="bg-amber-50/30 rounded-3xl p-5 border border-amber-100/50 transition-all hover:bg-white hover:shadow-md group">
              <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">Web Tickets</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-amber-600 leading-none">{summary?.openTickets ?? 0}</p>
                <div className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-1">Active</div>
              </div>
            </div>

            <div className="bg-indigo-50/30 rounded-3xl p-5 border border-indigo-100/50 transition-all hover:bg-white hover:shadow-md group">
              <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">Discord Sync</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-indigo-600 leading-none">{summary?.discordOpen ?? 0}</p>
                <Zap className="w-4 h-4 text-indigo-400 mb-1" />
              </div>
            </div>

            <div className="bg-emerald-50/30 rounded-3xl p-5 border border-emerald-100/50 transition-all hover:bg-white hover:shadow-md group">
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">Resolutions</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-emerald-600 leading-none">{summary?.resolvedTickets ?? 0}</p>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse mb-2" />
              </div>
            </div>
          </div>

          <div className={`mt-10 p-5 border rounded-3xl flex items-center gap-5 transition-all ${
            (summary?.todayQueries && summary.todayQueries > 0)
              ? ((summary.todayAiResolutionRate ?? 85) >= 80 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100')
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              <TrendingUp className={`w-6 h-6 ${
                (summary?.todayQueries && summary.todayQueries > 0)
                  ? ((summary.todayAiResolutionRate ?? 85) >= 80 ? 'text-blue-600' : 'text-amber-600')
                  : 'text-gray-400'
              }`} />
            </div>
            <div className="flex-1 text-left">
              <p className={`text-sm font-black ${
                (summary?.todayQueries && summary.todayQueries > 0)
                  ? ((summary.todayAiResolutionRate ?? 85) >= 80 ? 'text-blue-900' : 'text-amber-900')
                  : 'text-gray-600'
              }`}>
                {summary?.todayQueries && summary.todayQueries > 0
                  ? ((summary.todayAiResolutionRate ?? 85) >= 80 ? 'System is on track' : 'System requires attention')
                  : 'System is standby'
                }
              </p>
              <p className={`text-xs font-medium ${
                (summary?.todayQueries && summary.todayQueries > 0)
                  ? ((summary.todayAiResolutionRate ?? 85) >= 80 ? 'text-blue-700/70' : 'text-amber-700/70')
                  : 'text-gray-500/70'
              }`}>
                {summary?.todayQueries && summary.todayQueries > 0 ? (
                  `AI model has resolved ${summary.todayAiResolved} out of ${summary.todayQueries} queries autonomously today.`
                ) : (
                  `No queries processed today. (Cumulative matching rate is ${summary?.aiResolutionRate ?? 85}% overall across ${summary?.totalQueries ?? 0} queries).`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Quick Stats */}
        <div className="bg-gray-50 border border-gray-200 rounded-[2.5rem] p-8 space-y-6">
          <h3 className="text-lg font-black text-gray-900">Quick Actions</h3>
          <div className="space-y-4">
            <button
              onClick={() => onNavigate('conversations')}
              className="w-full flex items-center justify-between p-4 bg-white rounded-3xl border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900">Review Transcripts</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Check AI Quality</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('tickets')}
              className="w-full flex items-center justify-between p-4 bg-white rounded-3xl border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Ticket className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900">Support Desk</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{summary?.openTickets ?? 0} tickets open</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('qa')}
              className="w-full flex items-center justify-between p-4 bg-white rounded-3xl border border-gray-100 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900">Knowledge Lab</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{summary?.qaPending ?? 0} pending entries</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* MERGED DEEP-DIVE ANALYTICS SECTION */}
      <div className="pt-6 border-t border-gray-100 space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Operational Intelligence & Analytics
          </h2>
          <p className="text-gray-500 font-medium mt-1">Deep-dive charts and metrics synced with the NestJS RAG backend.</p>
        </div>

        {/* Analytics Top Row: Support Ops, Discord Pulse, Resolution Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Support Operations */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-gray-900">Support Operations</h3>
              <div className="flex gap-2 bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                System Active
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Open Web</p>
                <p className="text-3xl font-black text-amber-600">{ticketStats?.open ?? 0}</p>
                <div className="h-1.5 w-12 bg-amber-400 rounded-full" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resolved</p>
                <p className="text-3xl font-black text-emerald-600">{ticketStats?.resolved ?? 0}</p>
                <div className="h-1.5 w-12 bg-emerald-400 rounded-full" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg. Res.</p>
                <p className="text-3xl font-black text-gray-900">{ticketStats?.avgResolutionHours ?? 0}h</p>
                <div className="h-1.5 w-12 bg-gray-900 rounded-full" />
              </div>
            </div>

            <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl">
              <div className="flex justify-between items-center mb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span>Holistic Efficiency</span>
                <span className="text-gray-900 font-bold">
                  {Math.round(((summary?.resolvedTickets || 0) + (summary?.discordClosed || 0)) /
                    Math.max(1, (summary?.openTickets || 0) + (summary?.resolvedTickets || 0) + (summary?.discordTotal || 0)) * 100)}%
                </span>
              </div>
              <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-gray-100 flex items-center p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.round(((summary?.resolvedTickets || 0) + (summary?.discordClosed || 0)) /
                      Math.max(1, (summary?.openTickets || 0) + (summary?.resolvedTickets || 0) + (summary?.discordTotal || 0)) * 100)}%`
                  }}
                  className="h-full bg-indigo-500 rounded-full shadow-lg shadow-indigo-200"
                />
              </div>
            </div>
          </div>

          {/* Discord Pulse Summary */}
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full" />
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-lg font-black">Discord Pulse</h3>
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-100">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Active Tickets</p>
                  <p className="text-4xl font-black text-white">{summary?.discordOpen ?? 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-indigo-200/50 uppercase tracking-widest mb-1">Total Ingested</p>
                  <p className="text-lg font-black text-indigo-100">{summary?.discordTotal ?? 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-indigo-200/60">
                  <span>Resolution Rate</span>
                  <span>{summary?.discordTotal && summary.discordTotal > 0 ? Math.round(((summary.discordClosed || 0) / summary.discordTotal) * 100) : 0}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${summary?.discordTotal && summary.discordTotal > 0 ? (summary.discordClosed / summary.discordTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Split Donut */}
          <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-xl text-white flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black mb-1">Resolution Split</h3>
              <p className="text-xs font-medium text-blue-200/50 mb-4">AI vs Human Automation</p>
            </div>

            <div className="h-[150px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {resData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-white">{summary?.aiResolutionRate ?? 0}%</span>
                <span className="text-[8px] font-bold text-blue-300 uppercase tracking-tighter">AI Driven</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Second Row: QA Entry Growth & Lab Member Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QA Growth Chart */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">QA Entry Growth</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Daily accumulation in Knowledge Base</p>
            </div>
            <div className="h-[280px]">
              {qaGrowth.length > 0 ? (
                <VisxBarChart data={qaGrowth as any} xDataKey="date">
                  <VisxGrid horizontal numTicksRows={5} />
                  <BarXAxis />
                  <VisxBar
                    dataKey="count"
                    fill="url(#growth-gradient)"
                    lineCap={6}
                  />
                  <BarLineIndicator
                    data={qaGrowth as any}
                    xKey="date"
                    valueKey="count"
                    stroke="#f59e0b"
                    strokeWidth={3}
                  />
                  <LinearGradient id="growth-gradient" from="#f59e0b" fromOpacity={0.8} to="#f59e0b" toOpacity={0.1} />
                  <ChartTooltip />
                </VisxBarChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">No growth data available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Lab Member Performance Chart */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Lab Member Performance</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Resolution benchmarks by member</p>
            </div>
            <div className="h-[280px]">
              {performance.length > 0 ? (
                <VisxBarChart data={performance as any} xDataKey="name">
                  <VisxGrid horizontal numTicksRows={5} />
                  <BarXAxis />
                  <VisxBar
                    dataKey="count"
                    fill="var(--chart-line-secondary)"
                    lineCap={6}
                  />
                  <ChartTooltip />
                </VisxBarChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Users className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">No performance data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Third Row: Knowledge Pulse footer summary */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-gray-900">Knowledge Pulse Summary</h3>
            <ShieldCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex justify-between items-end border-r border-gray-150 pr-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Verified</p>
                <p className="text-4xl font-black text-gray-900 tracking-tighter">{summary?.kbSize ?? 0}</p>
              </div>
              <div className="text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-full">+12 Monthly</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Sync</p>
              <p className="text-xl font-black text-amber-600">{summary?.qaPending ?? 0}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Approval Velocity</p>
              <p className="text-xl font-black text-indigo-600">{summary?.qaApprovalRate ?? 0}%</p>
            </div>
          </div>
        </div>

        {/* Negative hotspots table (Admin only) */}
        {isAdmin && (
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-900">Negative Hotspots</h3>
                <p className="text-sm font-medium text-gray-500">Topics requiring knowledge base enrichment.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-50 border border-red-100 px-3 py-1 rounded-full animate-pulse">ACTION REQUIRED</span>
            </div>

            {hotspots.length === 0 ? (
              <div className="text-center py-16 text-sm font-bold text-gray-400 bg-gray-50/30 rounded-[2rem] border border-dashed border-gray-200">
                System health is optimal. No negative feedback trends detected.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-gray-50/20">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest px-8 py-5">Topic Category</th>
                      <th className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest px-8 py-5">Interactions</th>
                      <th className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest px-8 py-5">Failure Rate</th>
                      <th className="px-8 py-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {hotspots.map((row) => {
                      const pct = Math.round(row.negativeRatio * 100);
                      return (
                        <tr key={row.topic} className="hover:bg-white transition-colors group">
                          <td className="px-8 py-5 text-sm font-black text-gray-900">{row.topic}</td>
                          <td className="px-8 py-5 text-sm text-gray-500 text-right font-medium">{row.total}</td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${pct >= 50 ? 'bg-red-50 text-red-700 border-red-100' :
                                pct >= 25 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  'bg-gray-50 text-gray-500 border-gray-100'
                                }`}>
                                {pct}% Fail
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button
                              onClick={() => openDrilldown(row.topic)}
                              className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-100 transition-all active:scale-95"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* THIRD ROW: ACTION LISTS IN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-4">
        {/* ACTION LIST 1: PENDING ITEMS */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                {isAdmin ? 'Awaiting Approval' : 'Your Submissions'}
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Pending QA Proposals</p>
            </div>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              {pendingProposals.length} Items
            </span>
          </div>
          <div className="flex-1 p-4">
            {pendingProposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-400">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProposals.slice(0, 3).map(p => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={p._id}
                    onClick={() => onNavigate('qa')}
                    className="p-4 rounded-[1.5rem] bg-white border border-gray-50 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group flex justify-between items-center"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-gray-800 truncate">{p.question}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded-full">Proposed</span>
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(p.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </motion.div>
                ))}
              </div>
            )}
            <button
              onClick={() => onNavigate('qa')}
              className="w-full mt-4 py-3 rounded-2xl border border-dashed border-gray-200 text-xs font-bold text-gray-400 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all uppercase tracking-widest"
            >
              View Management Panel
            </button>
          </div>
        </div>

        {/* ACTION LIST 2: SYSTEM ESCALATIONS */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Critical Attention
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Escalated Conversations</p>
            </div>
            <span className="bg-red-100 text-red-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              {negativeConversations.length + escalatedTickets.length} Items
            </span>
          </div>
          <div className="flex-1 p-4">
            <div className="space-y-4">
              {/* Ticket Escalations */}
              {escalatedTickets.slice(0, 2).map((t, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`ticket-${t._id || idx}`}
                  onClick={() => onNavigate('tickets')}
                  className="p-4 rounded-[1.5rem] bg-red-50/30 border border-red-100 hover:border-red-300 hover:shadow-md transition-all cursor-pointer group flex justify-between items-center"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Ticket className="w-3.5 h-3.5 text-red-600" />
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-wider">Support Ticket</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 truncate">{t.subject}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 italic capitalize">Raised by {t.studentName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${t.priority === 'high' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                    <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-red-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </div>
                </motion.div>
              ))}

              {/* Negative Feedback */}
              {negativeConversations.slice(0, 1).map((c, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`conv-${c._id || idx}`}
                  onClick={() => onNavigate('conversations')}
                  className="p-4 rounded-[1.5rem] bg-indigo-50/30 border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex justify-between items-center"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Negative Feedback</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 truncate">{c.lastMessagePreview || 'No preview available'}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 italic">Student: {c.studentName}</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </motion.div>
              ))}

              {(escalatedTickets.length === 0 && negativeConversations.length === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm font-bold text-gray-400 italic">No critical issues detected.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Negative Hotspot Drilldown Modal ── */}
      {drilldownTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-6">
          <div className="w-[min(90vw,860px)] max-h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl bg-white overflow-hidden border border-gray-100">
            {/* Modal header */}
            <div className="flex items-center gap-4 px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex-shrink-0">
              {selectedConvId ? (
                <button
                  onClick={() => { setSelectedConvId(null); setConvMessages(null) }}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-bold text-gray-900 truncate">
                    Negative Feedback — {drilldownTopic}
                  </span>
                </div>
              )}
              <button
                onClick={closeDrilldown}
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto">
              {selectedConvId ? (
                <div className="px-6 py-4 space-y-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Conversation ID: {selectedConvId}
                  </p>
                  {convLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : convMessages && convMessages.length > 0 ? (
                    convMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-[10px] font-bold">VS</span>
                          </div>
                        )}
                        <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user'
                          ? 'bg-gray-900 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                          }`}>
                          {renderMarkdown(msg.content)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No messages found.</p>
                  )}
                </div>
              ) : (
                drilldownLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : drilldownItems.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-400">
                    No negative feedback found for this topic.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {drilldownItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-gray-400 truncate">
                            Conv: {item.conversationId}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(item.createdAt).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => openConversation(item.conversationId)}
                          className="flex-shrink-0 ml-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                        >
                          View Transcript <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
