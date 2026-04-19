import { useEffect, useState } from 'react';
import {
  fetchProposals,
  fetchProposalStats,
  getConversations,
  getTicketsPaginated,
  adminListQaPairs,
  getDashboardSummary,
  adminListUsers,
  QaProposal,
  Conversation,
  SupportTicket,
  ProposalStats,
  DashboardSummary,
  AdminUser
} from '@/lib/api';
import {
  Loader2, Plus, MessageSquare, Ticket,
  CheckCircle2, XCircle, AlertCircle, Clock, Database, ChevronRight,
  TrendingUp, Users, Bot, Zap, ArrowUpRight, BarChart3, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ActionDrivenDashboardProps {
  isAdmin: boolean;
  user: any;
  onNavigate: (view: any) => void;
}

export default function ActionDrivenDashboard({ isAdmin, user, onNavigate }: ActionDrivenDashboardProps) {
  const [loading, setLoading] = useState(true);

  // Data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingProposals, setPendingProposals] = useState<QaProposal[]>([]);
  const [rejectedProposals, setRejectedProposals] = useState<QaProposal[]>([]);
  const [negativeConversations, setNegativeConversations] = useState<Conversation[]>([]);
  const [escalatedTickets, setEscalatedTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [
          summaryRes,
          usersRes,
          proposalsRes,
          convRes,
          ticketsRes
        ] = await Promise.all([
          getDashboardSummary().catch(() => null),
          isAdmin ? adminListUsers().catch(() => []) : Promise.resolve([]),
          fetchProposals('all').catch(() => ({ data: [] })),
          getConversations({ limit: 10, feedbackFilter: 'disliked' }).catch(() => ({ conversations: [] })),
          getTicketsPaginated({ status: 'open', limit: 10 }).catch(() => ({ data: [] }))
        ]);

        setSummary(summaryRes);
        setUsers(usersRes);

        // Filter Proposals based on role
        const allProposals = proposalsRes.data || [];
        if (isAdmin) {
          setPendingProposals(allProposals.filter((p: QaProposal) => p.status === 'pending').slice(0, 3));
          setRejectedProposals(allProposals.filter((p: QaProposal) => p.status === 'rejected').slice(0, 3));
        } else {
          const myProposals = allProposals.filter((p: QaProposal) => p.proposedBy?.userId === user?.userId || p.proposedBy?.userId === user?.id);
          setPendingProposals(myProposals.filter((p: QaProposal) => p.status === 'pending').slice(0, 3));
          setRejectedProposals(myProposals.filter((p: QaProposal) => p.status === 'rejected').slice(0, 3));
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-500 uppercase tracking-widest animate-pulse">Initializing Dashboard</p>
      </div>
    );
  }

  // User distribution from summary
  const totalUsers = summary?.totalUsers ?? 1;
  const studentCount = summary?.studentCount ?? 0;
  const staffCount = summary?.staffCount ?? 0;

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER SECTION */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Overview</h1>
          <p className="text-gray-500 font-medium mt-1">Real-time metrics and knowledge base performance.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => #}
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
                <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">85% automated match rate</p>
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
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: '92%' }} />
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

          <div className="mt-10 p-5 bg-blue-50 border border-blue-100 rounded-3xl flex items-center gap-5">
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-blue-900">System is on track</p>
              <p className="text-xs font-medium text-blue-700/70">AI model is resolving 9 out of 10 queries autonomously today.</p>
            </div>
            <button onClick={() => onNavigate('analytics')} className="bg-blue-600 text-white p-2 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </button>
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

      {/* THIRD ROW: ACTION LISTS IN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
    </div>
  );
}
