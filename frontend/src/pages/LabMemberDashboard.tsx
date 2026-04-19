import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, clearAuth } from '@/lib/auth'
import { motion } from 'framer-motion'
import { Sidebar, SidebarBody, useSidebar } from '@/components/ui/sidebar'
import Pagination from '@/components/ui/next-gen-pagination-accessible'
import ActionDrivenDashboard from '@/components/dashboard/ActionDrivenDashboard'
import {
  MessageSquarePlus,
  MessagesSquare,
  Ticket,
  BarChart3,
  Users,
  ShieldCheck,
  Search,
  Settings,
  User,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Bot,
  Filter,
  ArrowUpRight,
  X,
  Upload,
  HelpCircle,
  FileJson,
  Loader2,
  Paperclip,
  ChevronLeft,
  RefreshCw,
  Radio,
  Eye,
  Copy,
  Check,
  LogOut,
  BookOpen,
  Pencil,
  Trash2,
  Save,
  Database,
  Zap,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  adminListUsers,
  adminChangeRole,
  adminSetStatus,
  adminDeleteUser,
  adminListLabMembers,
  adminCreateLabMember,
  adminUpdateLabMember,
  adminDeleteLabMember,
  type AdminUser,
} from '../lib/api'
import {
  fetchProposals,
  createProposal,
  createBulkProposals,
  approveProposal,
  rejectProposal,
  type QaProposal,
  getAggregatedConversations,
  getAggregatedConversationDetail,
  getAggregatedConversationStats,
  type AggregatedConversation,
  type AggregatedConversationStats,
  type ConversationSource,
  getTickets,
  getTicketsPaginated,
  assignTicket,
  transferTicket,
  addTicketMessage,
  startSupportSession,
  closeTicket,
  getTicket,
  getTicketMessages,
  subscribeToTicketMessages,
  type SupportTicket,
  type TicketMessage,
  type TicketScreenshot,
  getTicketStats,
  getConversation,
  generateQaFromConversation,
  getFeedbackHotspots,
  getFeedbackByTopic,
  getDashboardSummary,
  type DashboardSummary,
  type TicketStats,
  type ChatMessage,
  type FeedbackHotspot,
  type FeedbackDrilldownItem,
  getDiscordConversations,
  getDiscordConversation,
  getDiscordStats,
  subscribeToDiscordTicket,
  subscribeToDiscordActivity,
  type DiscordConversationSummary,
  type DiscordConversationDetail,
  type DiscordMessageItem,
  adminListQaPairs,
  adminUpdateQaPair,
  adminDeleteQaPair,
  type QaPairV2,
  adminGetQaGrowth,
  adminGetPerformance,
  type QaGrowthPoint,
  type MemberPerformance,
} from '../lib/api'
import NotificationBell from '../components/NotificationBell';
import {
  BarChart as VisxBarChart,
  Bar as VisxBar,
  BarXAxis,
  Grid as VisxGrid,
  ChartTooltip,
  LinearGradient,
  BarLineIndicator
} from '@/components/ui/bar-chart';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function sortTicketMessagesAsc(messages: TicketMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
}

/**
 * Simple markdown renderer for chat messages
 */
function renderMarkdown(text: string): JSX.Element {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const processInline = (line: string): JSX.Element => {
    const parts: (string | JSX.Element)[] = []
    let remaining = line
    let key = 0

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)

      const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1
      const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : -1

      if (boldIdx !== -1 && (italicIdx === -1 || boldIdx <= italicIdx)) {
        if (boldIdx > 0) parts.push(remaining.substring(0, boldIdx))
        parts.push(<strong key={key++} className="font-semibold">{boldMatch![1]}</strong>)
        remaining = remaining.substring(boldIdx + boldMatch![0].length)
      } else if (italicIdx !== -1) {
        if (italicIdx > 0) parts.push(remaining.substring(0, italicIdx))
        parts.push(<em key={key++}>{italicMatch![1]}</em>)
        remaining = remaining.substring(italicIdx + italicMatch![0].length)
      } else {
        parts.push(remaining)
        remaining = ''
      }
    }
    return <>{parts}</>
  }

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType
      elements.push(
        <ListTag key={elements.length} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} ml-4 space-y-1`}>
          {listItems.map((item, i) => <li key={i}>{processInline(item)}</li>)}
        </ListTag>
      )
      listItems = []
      listType = null
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(trimmed.substring(2))
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(trimmed.replace(/^\d+\.\s/, ''))
    } else {
      flushList()
      if (trimmed) {
        elements.push(<p key={idx} className="mb-1 last:mb-0">{processInline(trimmed)}</p>)
      }
    }
  })
  flushList()
  return <>{elements}</>
}

// Helper to normalize confidence values (handles both 0-1 and 0-100 scales)
const normalizeConfidence = (value: number | undefined): number | undefined => {
  if (value === undefined) return undefined
  // If value is <= 1, it's in the old 0-1 scale, multiply by 100
  return value <= 1 ? Math.round(value * 100) : Math.round(value)
}

/* ═══════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════ */



/* ═══════════════════════════════════════
   TYPES & CONFIG
   ═══════════════════════════════════════ */

type View = 'home' | 'conversations' | 'tickets' | 'qa' | 'analytics' | 'discord' | 'id-management' | 'qa-management'

// Sidebar items defined inside component for dynamic badges

const bottomItems = [
  { icon: Search, label: 'Search', shortcut: '⌘ K' },
  { icon: Settings, label: 'Settings' },
  { icon: User, label: 'Profile' },
]

/* ═══════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════ */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    active: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    escalated: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-gray-50 text-gray-600 border-gray-200',
    'on-track': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'at-risk': 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
    rag: 'bg-blue-50 text-blue-700 border-blue-200',
    discord: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    librechat: 'bg-teal-50 text-teal-700 border-teal-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status.replace('-', ' ')}
    </span>
  )
}

/* ═══════════════════════════════════════
   STUDENTS HOME VIEW
   ═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   CONVERSATIONS VIEW
   ═══════════════════════════════════════ */

function ConversationsView() {
  const PAGE_SIZE = 20
  const [sourceFilter, setSourceFilter] = useState<'all' | ConversationSource>('all')
  const [conversations, setConversations] = useState<AggregatedConversation[]>([])
  const [stats, setStats] = useState<AggregatedConversationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, pages: 1 })
  const [selectedConversation, setSelectedConversation] = useState<AggregatedConversation | null>(null)
  const [selectedConversationDetail, setSelectedConversationDetail] = useState<AggregatedConversation | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showQAPanel, setShowQAPanel] = useState(false)
  const [qaDraft, setQaDraft] = useState({ title: '', question: '', answer: '' })
  const [loadingQA, setLoadingQA] = useState(false)
  const [qaError, setQaError] = useState<string | null>(null)
  const [proposalSubmitting, setProposalSubmitting] = useState(false)
  const [proposalSuccess, setProposalSuccess] = useState(false)

  const loadStats = async (refresh = false) => {
    try {
      const statsResult = await getAggregatedConversationStats({ refresh })
      setStats(statsResult)
    } catch (error) {
      console.error('Failed to fetch conversation stats:', error)
    }
  }

  const loadConversations = async (nextPage = 1, refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)

    try {
      const result = await getAggregatedConversations({
        source: sourceFilter,
        refresh,
        page: nextPage,
        limit: PAGE_SIZE,
      })

      setConversations(result.data)
      setPagination(result.pagination)
      setPage(result.pagination.page)
    } catch (error) {
      console.error('Failed to fetch aggregated conversations:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setPage(1)
    setSelectedConversation(null)
    setSelectedConversationDetail(null)
    loadConversations(1, false)
  }, [sourceFilter])

  useEffect(() => {
    loadStats(false)
  }, [])

  const getVisiblePages = () => {
    const totalPages = pagination.pages
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    if (page <= 4) {
      return [1, 2, 3, 4, 5, -1, totalPages]
    }

    if (page >= totalPages - 3) {
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, -1, page - 1, page, page + 1, -1, totalPages]
  }

  const openConversation = async (conversation: AggregatedConversation) => {
    setSelectedConversation(conversation)
    setSelectedConversationDetail(null)
    setDetailLoading(true)
    setShowQAPanel(false)
    setQaDraft({ title: '', question: '', answer: '' })
    setQaError(null)
    setProposalSuccess(false)

    try {
      const detail = await getAggregatedConversationDetail(conversation.source, conversation.conversation_id)
      setSelectedConversationDetail(detail)
    } catch (error) {
      console.error('Failed to fetch conversation detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedConversation(null)
    setSelectedConversationDetail(null)
    setShowQAPanel(false)
    setQaDraft({ title: '', question: '', answer: '' })
    setQaError(null)
    setProposalSuccess(false)
  }

  const handleGenerateQA = async () => {
    if (!selectedConversation) return
    setShowQAPanel(true)
    setLoadingQA(true)
    setQaError(null)
    setProposalSuccess(false)
    try {
      const result = await generateQaFromConversation(selectedConversation.source, selectedConversation.conversation_id)
      setQaDraft({ title: result.title || '', question: result.question || '', answer: result.answer || '' })
    } catch {
      setQaError('Failed to generate Q&A. Please try again.')
    } finally {
      setLoadingQA(false)
    }
  }

  const handleSubmitProposal = async () => {
    if (!qaDraft.question.trim() || !qaDraft.answer.trim()) return
    setProposalSubmitting(true)
    setQaError(null)
    try {
      await createProposal({
        question: qaDraft.question.trim(),
        answer: qaDraft.answer.trim(),
        title: qaDraft.title.trim() || undefined,
      })
      setProposalSuccess(true)
    } catch {
      setQaError('Failed to submit proposal. Please try again.')
    } finally {
      setProposalSubmitting(false)
    }
  }

  const avgRagConfidence = stats?.avgRagConfidence ?? null

  const sourceCounts = stats?.sourceCounts ?? {
    rag: 0,
    discord: 0,
    librechat: 0,
  }

  const sourceLabel = (source: ConversationSource) => {
    if (source === 'rag') return 'RAG'
    if (source === 'discord') return 'Discord'
    return 'LibreChat'
  }

  const getConversationPreview = (conversation: AggregatedConversation) => {
    if (conversation.last_message_preview && conversation.last_message_preview.trim().length > 0) {
      return conversation.last_message_preview
    }

    const firstUserMessage = conversation.messages.find((message) => message.role === 'user' && message.text.trim().length > 0)
    if (firstUserMessage) {
      return firstUserMessage.text
    }

    const firstNonEmpty = conversation.messages.find((message) => message.text.trim().length > 0)
    return firstNonEmpty?.text ?? 'No messages'
  }

  const getLatestSpeaker = (conversation: AggregatedConversation) => {
    if (conversation.source !== 'discord') {
      return null
    }

    const latestMessageWithAuthor = [...conversation.messages]
      .reverse()
      .find((message) => message.author && message.author.trim().length > 0)

    return latestMessageWithAuthor?.author ?? null
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Small buffer for potential small clock skews
    if (diff < -5000) return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })

    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) return `${hours}h ago`

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  const getSourceColor = (source: ConversationSource) => {
    if (source === 'rag') return 'bg-blue-500'
    if (source === 'discord') return 'bg-indigo-500'
    return 'bg-teal-500'
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chatbot Conversations</h1>
          <p className="text-sm text-gray-500 mt-1">Unified chat feed from RAG, Discord transcripts, and LibreChat</p>
        </div>
        <button
          onClick={() => {
            loadConversations(1, true)
            loadStats(true)
          }}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Conversations', value: stats?.totalConversations ?? conversations.length, icon: MessagesSquare, color: 'text-blue-600 bg-blue-50/80 border border-blue-100' },
          { label: 'RAG Chats', value: sourceCounts.rag, icon: Bot, color: 'text-emerald-600 bg-emerald-50/80 border border-emerald-100' },
          { label: 'Discord Chats', value: sourceCounts.discord, icon: Ticket, color: 'text-indigo-600 bg-indigo-50/80 border border-indigo-100' },
          { label: 'RAG Avg Confidence', value: avgRagConfidence !== null ? `${avgRagConfidence}%` : '—', icon: TrendingUp, color: 'text-purple-600 bg-purple-50/80 border border-purple-100' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-[#E8DFD3] rounded-2xl p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6 mb-4 px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600">
        <span>{stats?.totalMessages ?? conversations.reduce((sum, conv) => sum + conv.message_count, 0)} total messages</span>
        <span>{sourceCounts.librechat} LibreChat chats</span>
        <span>Confidence is displayed only for RAG conversations</span>
      </div>

      {/* Source Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'rag', 'discord', 'librechat'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setSourceFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${sourceFilter === filter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessagesSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No conversations yet</p>
        </div>
      ) : (
        /* Conversation Cards */
        <div className="space-y-3">
          {conversations.map(conv => {
            const latestSpeaker = getLatestSpeaker(conv)

            return (
              <div
                key={`${conv.source}-${conv.conversation_id}`}
                onClick={() => openConversation(conv)}
                className="bg-white border border-[#E8DFD3] rounded-2xl p-5 hover:border-gray-300 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0 bg-gradient-to-br ${getSourceColor(conv.source).replace('bg-', 'from-').replace('-500', '-400')} ${getSourceColor(conv.source).replace('bg-', 'to-').replace('-500', '-600')}`}>
                    {conv.user?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{conv.user || 'Unknown User'}</span>
                      <span className="text-[11px] font-medium text-gray-400 border border-gray-200 bg-gray-50 px-2 py-0.5 rounded-full">
                        {sourceLabel(conv.source)} · {conv.message_count} msgs
                        {latestSpeaker ? ` · latest: ${latestSpeaker}` : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1.5 leading-relaxed">{getConversationPreview(conv)}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[11px] font-medium text-gray-400">{formatDate(conv.timestamp)}</span>
                      {conv.source === 'rag' && conv.confidence !== undefined && conv.confidence !== null && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${normalizeConfidence(conv.confidence)! >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : normalizeConfidence(conv.confidence)! >= 60 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {normalizeConfidence(conv.confidence)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={conv.source} />
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => loadConversations(Math.max(1, page - 1), false)}
            disabled={page <= 1}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {getVisiblePages().map((pageNumber, index) =>
            pageNumber === -1 ? (
              <span key={`ellipsis-${index}`} className="px-2 text-sm text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={pageNumber}
                onClick={() => loadConversations(pageNumber, false)}
                className={`min-w-10 px-3 py-2 rounded-xl border text-sm transition-colors ${page === pageNumber
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {pageNumber}
              </button>
            ),
          )}
          <button
            onClick={() => loadConversations(Math.min(pagination.pages, page + 1), false)}
            disabled={page >= pagination.pages}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl w-full ${showQAPanel ? 'max-w-5xl' : 'max-w-2xl'} max-h-[85vh] flex flex-col shadow-xl transition-all duration-200`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getSourceColor(selectedConversation.source)}`}>
                  {selectedConversation.user?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900 truncate">{selectedConversation.user}</h2>
                  <p className="text-xs text-gray-500">{sourceLabel(selectedConversation.source)} · {selectedConversation.message_count} messages</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={selectedConversation.source} />
                {selectedConversation.source === 'rag' && selectedConversation.confidence !== null && selectedConversation.confidence !== undefined && (
                  <span className="text-xs text-gray-500">Confidence: {normalizeConfidence(selectedConversation.confidence)}%</span>
                )}
                {selectedConversation.source === 'rag' && (
                  <button
                    onClick={handleGenerateQA}
                    disabled={loadingQA}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${showQAPanel
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-blue-200 text-blue-600 hover:bg-blue-50'
                      }`}
                  >
                    {loadingQA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />}
                    Propose Q&A
                  </button>
                )}
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left: messages */}
              <div className={`overflow-y-auto p-4 ${showQAPanel ? 'w-[63%]' : 'flex-1'}`}>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : selectedConversationDetail ? (
                  <div className="space-y-4">
                    {/* Ticket Metadata Card */}
                    {selectedConversationDetail.source === 'discord' && selectedConversationDetail.mainReason && (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Ticket className="w-4 h-4" />
                          </div>
                          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Ticket Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Main Reason</p>
                            <p className="text-sm font-semibold text-gray-900 leading-relaxed bg-white border border-gray-100 rounded-xl px-3 py-2">
                              {selectedConversationDetail.mainReason}
                            </p>
                          </div>
                          {selectedConversationDetail.registeredEmail && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Registered Email</p>
                              <p className="text-sm font-medium text-gray-700 truncate">{selectedConversationDetail.registeredEmail}</p>
                            </div>
                          )}
                          {selectedConversationDetail.cohortName && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Cohort</p>
                              <p className="text-sm font-medium text-gray-700">{selectedConversationDetail.cohortName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedConversationDetail.messages.map((msg, index) => {
                      if (msg.type === 'ticket_reason') return null;

                      // System/bot messages — render as centered pills (not chat bubbles)
                      const isBotMessage = selectedConversation.source === 'discord' && (
                        msg.author === 'viBot' ||
                        msg.author === 'Ticket Tool' ||
                        msg.author === 'Help Tool' ||
                        (msg.text && /has claimed this ticket|staff member will be with you/i.test(msg.text))
                      );

                      if (isBotMessage) {
                        return (
                          <div key={`${selectedConversation.conversation_id}-${index}`} className="flex justify-center my-1">
                            <div className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                              <span className="italic">{msg.text}</span>
                              {msg.timestamp && (
                                <span className="text-gray-400 ml-1">· {formatDate(msg.timestamp)}</span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={`${selectedConversation.conversation_id}-${index}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3' : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3'}`}>
                            {selectedConversation.source === 'discord' && msg.author && (
                              <p className={`text-[10px] font-semibold mb-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                                {msg.author}
                              </p>
                            )}
                            <div className="text-sm">
                              {msg.role === 'assistant' ? renderMarkdown(msg.text) : <p className="whitespace-pre-wrap">{msg.text}</p>}
                            </div>
                            {msg.timestamp && (
                              <p className="text-[10px] text-gray-400 mt-2">{formatDate(msg.timestamp)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-4">Unable to load conversation messages.</div>
                )}
              </div>

              {/* Right: Q&A proposal panel */}
              {showQAPanel && (
                <div className="w-[37%] flex flex-col border-l border-gray-200 overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">AI Suggested</span>
                      <span className="text-sm font-semibold text-gray-800">Propose Q&A</span>
                    </div>
                    <button
                      onClick={handleGenerateQA}
                      disabled={loadingQA}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                      title="Regenerate"
                    >
                      {loadingQA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Form */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {qaError && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{qaError}</div>
                    )}
                    {proposalSuccess && (
                      <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Proposal submitted successfully!
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Title <span className="font-normal normal-case text-gray-400">(optional)</span>
                      </label>
                      <input
                        value={qaDraft.title}
                        onChange={(e) => setQaDraft((prev) => ({ ...prev, title: e.target.value }))}
                        disabled={loadingQA}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Question <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={qaDraft.question}
                        onChange={(e) => setQaDraft((prev) => ({ ...prev, question: e.target.value }))}
                        disabled={loadingQA}
                        rows={3}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Answer <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={qaDraft.answer}
                        onChange={(e) => setQaDraft((prev) => ({ ...prev, answer: e.target.value }))}
                        disabled={loadingQA}
                        rows={7}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                    <button
                      onClick={handleSubmitProposal}
                      disabled={proposalSubmitting || loadingQA || !qaDraft.question.trim() || !qaDraft.answer.trim()}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {proposalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Submit Proposal
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Started: {new Date(selectedConversation.timestamp).toLocaleDateString()}</span>
                <span>Source: {sourceLabel(selectedConversation.source)}</span>
                {selectedConversation.source === 'rag' && selectedConversation.confidence !== undefined && selectedConversation.confidence !== null && (
                  <span>Confidence: {normalizeConfidence(selectedConversation.confidence)}%</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   TICKETS VIEW
   ═══════════════════════════════════════ */

function TicketsView() {
  const authUser = getUser()
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'open' | 'mine' | 'resolved'>('all')
  const [currentInstructor] = useState(authUser?.name ?? 'Lab Member')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [updatingTicket, setUpdatingTicket] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 8, pages: 1 })
  const [pendingScreenshots, setPendingScreenshots] = useState<TicketScreenshot[]>([])
  const [viewingConversation, setViewingConversation] = useState<ChatMessage[] | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [availableMembers, setAvailableMembers] = useState<AdminUser[]>([])
  const [memberLoading, setMemberLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)
  const user = { role: (authUser?.role ?? 'lab_member') as 'lab_member' | 'admin' }

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const status = filter === 'resolved' ? 'resolved' : filter === 'open' || filter === 'unassigned' || filter === 'mine' ? 'open' : undefined
      const assignment = filter === 'unassigned' ? 'unassigned' : filter === 'mine' ? 'mine' : 'all'

      const result = await getTicketsPaginated({
        status,
        assignment,
        instructorName: currentInstructor,
        page,
        limit: 8,
      })
      setTickets(result.data)
      setPagination(result.pagination)
    } catch (error) {
      console.error('Failed to load tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, page, currentInstructor])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    setPage(1)
  }, [filter, currentInstructor])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedTicket?.messages])

  const openCount = tickets.filter((ticket) => ticket.status === 'open').length

  const formatTicketDate = (date?: string) => {
    if (!date) return 'Unknown'
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleOpenTicket = async (ticket: SupportTicket) => {
    try {
      const [fresh, history] = await Promise.all([
        getTicket(ticket.id),
        getTicketMessages(ticket.id, { page: 1, limit: 100 }),
      ])

      const hydrated = {
        ...fresh,
        messages: sortTicketMessagesAsc(history.data),
        messagesPagination: history.pagination,
      }

      setSelectedTicket(hydrated)
    } catch (error) {
      console.error('Failed to open ticket details:', error)
      setSelectedTicket(ticket)
    }
  }

  const refreshSelectedTicket = async (ticketId: string) => {
    const [fresh, history] = await Promise.all([
      getTicket(ticketId),
      getTicketMessages(ticketId, { page: 1, limit: 100 }),
    ])

    const hydrated = {
      ...fresh,
      messages: sortTicketMessagesAsc(history.data),
      messagesPagination: history.pagination,
    }

    setSelectedTicket(hydrated)
    return hydrated
  }

  useEffect(() => {
    if (!selectedTicket?.id) return

    const unsubscribe = subscribeToTicketMessages(selectedTicket.id, (message) => {
      console.log('[LabMemberDashboard] Received ticket:message.created', message);
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== selectedTicket.id) return prev

        const exists = prev.messages.some((m) =>
          message.id ? m.id === message.id : (
            m.timestamp === message.timestamp &&
            m.senderName === message.senderName &&
            m.message === message.message
          ),
        )

        if (exists) return prev

        return {
          ...prev,
          messages: sortTicketMessagesAsc([...(prev.messages ?? []), message]),
        }
      })
    })

    return () => {
      unsubscribe()
    }
  }, [selectedTicket?.id])

  const handleAssignToMe = async (ticket: SupportTicket) => {
    if (!authUser?.id) return
    setUpdatingTicket(true)
    try {
      await assignTicket(ticket.id, authUser.id)
      await refreshSelectedTicket(ticket.id)
      await loadTickets()
    } catch (error) {
      console.error('Failed to assign ticket:', error)
    } finally {
      setUpdatingTicket(false)
    }
  }

  const fetchAvailableMembers = async () => {
    setMemberLoading(true)
    try {
      const allMembers = await adminListLabMembers()
      // Filtering:
      // - If lab_member: show only other lab_members
      // - If admin: show both lab_members and admins
      const filtered = allMembers.filter(m => {
        if (user.role === 'admin') return m.role === 'admin' || m.role === 'lab_member'
        return m.role === 'lab_member'
      })
      setAvailableMembers(filtered)
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setMemberLoading(false)
    }
  }

  const handleTransfer = async (ticket: SupportTicket, targetInstructorId: string) => {
    setUpdatingTicket(true)
    try {
      await transferTicket(ticket.id, targetInstructorId)
      await refreshSelectedTicket(ticket.id)
      await loadTickets()
      setIsTransferModalOpen(false)
    } catch (error) {
      console.error('Failed to transfer ticket:', error)
    } finally {
      setUpdatingTicket(false)
    }
  }

  const handlePickReplyScreenshots = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const picked = await Promise.all(
      files.slice(0, 4).map(async (file) => ({
        fileName: file.name,
        mimeType: file.type || 'image/png',
        dataUrl: await fileToDataUrl(file),
      }))
    )
    setPendingScreenshots((prev) => [...prev, ...picked].slice(0, 4))
    e.target.value = ''
  }

  const handleSendMessage = async (ticket: SupportTicket) => {
    if (!replyMessage.trim() && pendingScreenshots.length === 0) {
      return
    }

    setUpdatingTicket(true)
    try {
      const updated = await addTicketMessage(ticket.id, {
        message: replyMessage.trim() || '📷 Screenshot(s) attached',
        screenshots: pendingScreenshots.length > 0 ? pendingScreenshots : undefined,
      })
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== updated.id) return prev
        return {
          ...prev,
          ...updated,
          messages: sortTicketMessagesAsc(updated.messages ?? []),
        }
      })
      setReplyMessage('')
      setPendingScreenshots([])
      await loadTickets()
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setUpdatingTicket(false)
    }
  }



  const handleCloseTicket = async (ticket: SupportTicket) => {
    setUpdatingTicket(true)
    try {
      await closeTicket(ticket.id, {
        resolutionNote: resolveNote || undefined,
      })
      setResolveNote('')
      await refreshSelectedTicket(ticket.id)
      await loadTickets()
    } catch (error) {
      console.error('Failed to close ticket:', error)
    } finally {
      setUpdatingTicket(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white border border-[#E8DFD3] rounded-2xl shadow-sm text-gray-700">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Student Tickets</h1>
            <p className="text-sm text-gray-500 mt-1">{openCount} open tickets need your attention</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white border border-[#E8DFD3] px-3 py-1.5 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Instructor</span>
          <span className="w-36 px-2.5 py-1.5 text-sm font-medium text-gray-900">{currentInstructor}</span>
        </div>
      </div>

      <div className="flex gap-1.5 mb-6 bg-gray-50 p-1.5 w-fit rounded-xl border border-gray-100">
        {(['all', 'unassigned', 'open', 'mine', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}>
            {f === 'resolved' ? 'closed' : f} {f === 'open' ? `(${openCount})` : ''}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-[#E8DFD3] rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-sm font-medium text-gray-500">Loading tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#E8DFD3] rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No Tickets Found</h3>
            <p className="text-sm text-gray-500">There are no tickets matching this filter.</p>
          </div>
        ) : tickets.map(ticket => (
          <button key={ticket.id} onClick={() => handleOpenTicket(ticket)} className="w-full text-left bg-white border border-[#E8DFD3] rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-3 gap-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-mono font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{ticket.ticketNumber}</span>
                <StatusBadge status={ticket.status} />
                {ticket.assignedInstructor ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100/60 shadow-sm flex items-center gap-1.5">
                    <User className="w-3 h-3" /> {ticket.assignedInstructor}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100/60 shadow-sm flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> Unassigned
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-400 shrink-0 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{formatTicketDate(ticket.createdAt)}</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors pr-8 leading-snug">{ticket.subject}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed pr-8">{ticket.reason}</p>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-3 text-[12px] font-medium text-gray-500 flex-wrap">
                <span className="flex items-center gap-1.5 text-gray-700 font-semibold"><User className="w-3.5 h-3.5" /> {ticket.studentName}</span>
                {ticket.cohort && <><span className="w-1 h-1 rounded-full bg-gray-300"></span><span>{ticket.cohort}</span></>}
                <span className="w-1 h-1 rounded-full bg-gray-300"></span><span className="flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> {ticket.screenshots.length}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span><span className="flex items-center gap-1.5"><MessagesSquare className="w-3.5 h-3.5" /> {ticket.messages?.length ?? 0}</span>
                {ticket.resolvedBy && <><span className="w-1 h-1 rounded-full bg-gray-300"></span><span className="text-emerald-600 flex items-center gap-1.5 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> {ticket.resolvedBy}</span></>}
              </div>
              {ticket.status === 'open' ? (
                <span className="text-[11px] font-bold text-white bg-blue-600 shadow-sm shadow-blue-500/30 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-3">
                  Reply <ArrowUpRight className="w-3 h-3" />
                </span>
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              )}
            </div>
          </button>
        ))}
      </div>

      {!loading && pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm font-medium text-gray-500 bg-white border border-[#E8DFD3] rounded-2xl px-5 py-4 shadow-sm">
          <span>
            Showing <strong className="text-gray-900">{pagination.page}</strong> of <strong className="text-gray-900">{pagination.pages}</strong> ({pagination.total} tickets)
          </span>
          <div className="flex gap-2 text-xs font-bold">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
              className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
              disabled={pagination.page >= pagination.pages}
              className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedTicket && (
        /* ── Intercom-style popup ticket chat panel ── */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] w-full max-w-[1000px] h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden ring-1 ring-white/10">
            {/* ── Left sidebar: ticket metadata + controls ── */}
            <div className="w-[280px] flex-shrink-0 border-r border-[#2C2C2C] bg-gradient-to-b from-[#1E1E1E] to-[#151515] flex flex-col overflow-y-auto hidden md:flex">
              {/* Back button */}
              <div className="px-4 py-3 border-b border-gray-800">
                <button
                  onClick={() => { setSelectedTicket(null); setPendingScreenshots([]); setReplyMessage('') }}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to tickets
                </button>
              </div>

              {/* Ticket metadata */}
              <div className="px-4 py-4 border-b border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-gray-500">{selectedTicket.ticketNumber}</span>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <h3 className="text-sm font-bold text-white leading-snug mb-3">{selectedTicket.subject}</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium w-16 flex-shrink-0">Student</span>
                    <span className="text-gray-300 font-medium">{selectedTicket.studentName}</span>
                  </div>
                  {selectedTicket.cohort && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 font-medium w-16 flex-shrink-0">Cohort</span>
                      <span className="text-gray-300">{selectedTicket.cohort}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium w-16 flex-shrink-0">Raised</span>
                    <span className="text-gray-300">{formatTicketDate(selectedTicket.createdAt)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium w-16 flex-shrink-0">Assigned</span>
                    <span className={selectedTicket.assignedInstructor ? 'text-emerald-400 font-medium' : 'text-amber-500'}>
                      {selectedTicket.assignedInstructor || 'Unassigned'}
                    </span>
                  </div>
                  {selectedTicket.instructors.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 font-medium w-16 flex-shrink-0">Team</span>
                      <span className="text-gray-300">{selectedTicket.instructors.join(', ')}</span>
                    </div>
                  )}
                  {selectedTicket.resolvedBy && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 font-medium w-16 flex-shrink-0">Closed by</span>
                      <span className="text-gray-300">{selectedTicket.resolvedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Initial ticket screenshots (submitted with the original ticket) */}
              {selectedTicket.screenshots.length > 0 && (
                <div className="px-4 py-4 border-b border-gray-800">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Submitted Screenshots</p>
                  <div className="space-y-2">
                    {selectedTicket.screenshots.map((shot, i) => (
                      <button key={`init-${i}`} onClick={() => setPreviewImageUrl(shot.dataUrl)} className="block w-full rounded-xl overflow-hidden border border-gray-700">
                        <img src={shot.dataUrl} alt={shot.fileName} className="w-full h-28 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Chat Transcript */}
              {selectedTicket.conversationId && (
                <div className="px-4 py-4 border-b border-gray-800">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Related Chat</p>
                  <button
                    onClick={async () => {
                      try {
                        const { messages } = await getConversation(selectedTicket.conversationId as string);
                        setViewingConversation(messages);
                      } catch (e) {
                        console.error('Failed to load conversation', e);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-blue-700 bg-blue-600/10 text-xs font-semibold text-blue-400 hover:bg-blue-600/20 transition-colors"
                  >
                    View Chat Transcript
                  </button>
                </div>
              )}

              {selectedTicket.status === 'open' && (
                <>
                  {/* Assignment controls */}
                  <div className="px-4 py-4 border-b border-gray-800">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Assignment</p>
                    <button
                      onClick={() => handleAssignToMe(selectedTicket)}
                      disabled={updatingTicket || selectedTicket.assignedInstructor === currentInstructor}
                      className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-800 text-xs font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-2"
                    >
                      {selectedTicket.assignedInstructor === currentInstructor ? '✓ Assigned to you' : 'Assign to me'}
                    </button>
                    <button
                      onClick={() => {
                        setIsTransferModalOpen(true)
                        fetchAvailableMembers()
                      }}
                      disabled={updatingTicket}
                      className="w-full px-3 py-2 rounded-xl border border-gray-700 bg-gray-800 text-xs font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      Transfer to Member...
                    </button>
                  </div>

                  {/* Close ticket */}
                  <div className="px-4 py-4">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Close Ticket</p>
                    <textarea
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      rows={3}
                      placeholder="Resolution note (optional)"
                      className="w-full border border-gray-700 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500/20 resize-none mb-2"
                    />
                    <button
                      onClick={() => handleCloseTicket(selectedTicket)}
                      disabled={updatingTicket}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    >
                      Close Ticket
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── Right panel: full-height chat ── */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              {/* Thread Header */}
              <div className="px-6 py-4 border-b border-[#E8DFD3] flex items-center justify-between bg-white z-10 shadow-sm">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight truncate">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{selectedTicket.studentName}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{formatTicketDate(selectedTicket.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {updatingTicket && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  {selectedTicket.status === 'open' && (user.role === 'lab_member' || user.role === 'admin') && (
                    <button
                      onClick={() => handleStartSupportSession(selectedTicket)}
                      disabled={updatingTicket}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Start Support Session
                    </button>
                  )}
                  <span className="text-[11px] font-mono font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg hidden sm:inline-block">{selectedTicket.ticketNumber}</span>
                  <button onClick={() => { setSelectedTicket(null); setPendingScreenshots([]); setReplyMessage('') }} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors md:hidden">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gray-50/50">
                {/* Original ticket reason as first "message" */}
                <div className="flex justify-start drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0 shadow-sm border border-gray-200 mt-0.5">
                      {selectedTicket.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-xs font-bold text-gray-700">{selectedTicket.studentName}</span>
                        <span className="text-[10px] font-medium text-gray-400">{formatTicketDate(selectedTicket.createdAt)}</span>
                      </div>
                      <div className="bg-white border border-[#E8DFD3] rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedTicket.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat messages */}
                {(selectedTicket.messages ?? []).map((msg, index) => {
                  const isInstructor = msg.senderRole === 'instructor'
                  if (msg.type === 'meeting' && msg.meetingLink) {
                    return (
                      <div key={`${selectedTicket.id}-${index}`} className="flex justify-center">
                        <div className="w-full max-w-md rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                          <p className="text-sm font-bold text-indigo-900">Support Session Started</p>
                          <p className="mt-1 text-xs text-indigo-700">Instructor started a support session</p>
                          <a
                            href={msg.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Join Now <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={`${selectedTicket.id}-${index}`} className={`flex ${isInstructor ? 'justify-end' : 'justify-start'} drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]`}>
                      <div className={`flex gap-3 max-w-[85%] ${isInstructor ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm border mt-0.5 ${isInstructor ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-700' : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 border-gray-200'}`}>
                          {msg.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div className={isInstructor ? 'items-end flex flex-col' : ''}>
                          <div className={`flex items-baseline gap-2 mb-1.5 ${isInstructor ? 'flex-row-reverse' : ''}`}>
                            <span className={`text-xs font-bold ${isInstructor ? 'text-gray-900' : 'text-gray-700'}`}>{msg.senderName}</span>
                            <span className="text-[10px] font-medium text-gray-400">{formatTicketDate(msg.timestamp)}</span>
                          </div>
                          <div className={`rounded-2xl px-5 py-3.5 shadow-sm ${isInstructor ? 'bg-blue-600 text-white rounded-tr-sm border border-blue-700' : 'bg-white border border-[#E8DFD3] text-gray-800 rounded-tl-sm'}`}>
                            {msg.message !== '📷 Screenshot(s) attached' && (
                              <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isInstructor ? 'text-blue-50' : 'text-gray-800'}`}>{msg.message}</p>
                            )}
                            {msg.screenshots && msg.screenshots.length > 0 && (
                              <div className={`grid gap-2 ${msg.screenshots.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${msg.message !== '📷 Screenshot(s) attached' ? 'mt-3 pt-3 border-t border-white/20' : ''}`}>
                                {msg.screenshots.map((shot, si) => (
                                  <button key={si} onClick={() => setPreviewImageUrl(shot.dataUrl)} className="block w-full rounded-xl overflow-hidden hover:opacity-90 transition-opacity ring-1 ring-black/10">
                                    <img src={shot.dataUrl} alt={shot.fileName} className="w-full h-40 object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Resolved banner */}
                {selectedTicket.status === 'resolved' && (
                  <div className="flex justify-center my-8">
                    <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-5 py-2 text-xs font-bold inline-flex items-center gap-2 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Ticket closed by {selectedTicket.resolvedBy || 'instructor'}
                      {selectedTicket.resolutionNote && <span className="text-emerald-600/60 font-medium ml-1"> — {selectedTicket.resolutionNote}</span>}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Composer */}
              {selectedTicket.status === 'open' ? (
                <div className="p-6 bg-white border-t border-[#E8DFD3] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] flex-shrink-0 z-10 w-full relative">
                  {/* Pending Screenshots Preview */}
                  {pendingScreenshots.length > 0 && (
                    <div className="flex gap-3 mb-4 flex-wrap">
                      {pendingScreenshots.map((shot, i) => (
                        <div key={i} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                          <img src={shot.dataUrl} alt={shot.fileName} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setPendingScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 bg-black/50 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex text-white backdrop-blur-sm"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 items-end max-w-4xl mx-auto">
                    <div className="flex-1 bg-gray-50/80 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm">
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(selectedTicket)
                          }
                        }}
                        rows={1}
                        placeholder={selectedTicket.assignedInstructor === currentInstructor ? "Type your reply... (Enter to send, Shift+Enter for new line)" : "You can reply (Note: You are not primary assignee)"}
                        className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none pt-1 leading-relaxed"
                        style={{ minHeight: '24px', maxHeight: '120px', overflowY: 'auto' }}
                      />
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50">
                        <label className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 hover:text-blue-500 transition-all cursor-pointer">
                          <Paperclip className="w-4 h-4" />
                          <input ref={replyFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePickReplyScreenshots} />
                        </label>
                        <button
                          onClick={() => handleSendMessage(selectedTicket)}
                          disabled={updatingTicket || (!replyMessage.trim() && pendingScreenshots.length === 0)}
                          className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-700 hover:shadow shadow-blue-500/30 disabled:opacity-50 transition-all disabled:shadow-none"
                        >
                          {updatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border-t border-[#E8DFD3] text-center text-sm font-medium text-gray-500 z-10 w-full relative">
                  This ticket has been resolved and cannot receive new messages.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Screenshot Preview Modal ── */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setPreviewImageUrl(null)}>
          <div className="max-w-5xl w-full max-h-full flex flex-col items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImageUrl(null)} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
            <img src={previewImageUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain border border-white/10" />
            <a href={previewImageUrl} download="screenshot.png" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all">
              <Plus className="w-4 h-4 rotate-45" /> Open full size
            </a>
          </div>
        </div>
      )}

      {/* ── Transfer Member Modal ── */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[60vh] overflow-hidden border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E8DFD3] flex justify-between items-center bg-white">
              <div>
                <h3 className="text-base font-bold text-gray-900">Transfer Ticket</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Select a staff member to transfer this ticket to</p>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {memberLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                  <p className="text-xs text-gray-500">Loading staff list...</p>
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No available staff members found.</p>
                </div>
              ) : (
                availableMembers.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => handleTransfer(selectedTicket as SupportTicket, member._id)}
                    disabled={updatingTicket || member.name === selectedTicket?.assignedInstructor}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${member.name === selectedTicket?.assignedInstructor
                      ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 group'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm border ${member.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{member.name}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          {member.role === 'admin' ? <ShieldCheck className="w-3 h-3 text-indigo-500" /> : <User className="w-3 h-3" />}
                          {member.role === 'admin' ? 'Administrator' : 'Lab Member'}
                        </p>
                      </div>
                    </div>
                    {member.name === selectedTicket?.assignedInstructor ? (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Current</span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-all group-hover:translate-x-0.5" />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Related Transcript Modal ── */}
      {viewingConversation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setViewingConversation(null)}>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E8DFD3] flex justify-between items-center bg-white">
              <h3 className="text-base font-bold text-gray-900">Related Chat Transcript</h3>
              <button onClick={() => setViewingConversation(null)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 relative">
              {viewingConversation.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <MessagesSquare className="w-12 h-12 mb-3 opacity-20" />
                  <p>No messages left in transcript.</p>
                </div>
              ) : viewingConversation.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm border text-sm ${msg.role === 'user'
                    ? 'bg-gray-900 text-white border-gray-900 rounded-br-sm'
                    : 'bg-white text-gray-800 border-[#E8DFD3] rounded-bl-sm'
                    }`}>
                    <div className="flex items-baseline gap-2 mb-1.5 opacity-70">
                      <span className="text-xs font-bold">{msg.role === 'user' ? 'Student' : 'Assistant'}</span>
                      {msg.createdAt && <span className="text-[10px] font-medium">{new Date(msg.createdAt).toLocaleString()}</span>}
                    </div>
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   Q&A PROPOSALS VIEW
   ═══════════════════════════════════════ */

function QAProposalsView() {
  const userRole = getUser()?.role ?? 'lab_member'
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [filter, setFilter] = useState('all')
  const [showFormatGuide, setShowFormatGuide] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [proposals, setProposals] = useState<QaProposal[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Detail modal state
  const [detailProposal, setDetailProposal] = useState<QaProposal | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [copiedField, setCopiedField] = useState<'question' | 'answer' | null>(null)

  // Load proposals from API
  const loadProposals = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchProposals(filter === 'all' ? undefined : filter)
      setProposals(result.data)
    } catch (error) {
      console.error('Failed to load proposals:', error)
      setUploadFeedback({ type: 'error', msg: 'Failed to load proposals. Backend may be offline.' })
      setTimeout(() => setUploadFeedback(null), 4000)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadProposals()
  }, [loadProposals])

  // Handle single form submission
  const handleSubmit = async () => {
    if (!question.trim() || !answer.trim()) {
      setUploadFeedback({ type: 'error', msg: 'Question and answer are required.' })
      setTimeout(() => setUploadFeedback(null), 4000)
      return
    }

    setIsSubmitting(true)
    try {
      await createProposal({ question, answer, title: title || undefined })
      setUploadFeedback({ type: 'success', msg: 'Proposal submitted successfully!' })
      setTitle('')
      setQuestion('')
      setAnswer('')
      setShowForm(false)
      loadProposals()
    } catch (error) {
      console.error('Failed to submit proposal:', error)
      setUploadFeedback({ type: 'error', msg: 'Failed to submit proposal. Please try again.' })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setUploadFeedback(null), 4000)
    }
  }

  // Handle bulk JSON upload
  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data)) throw new Error('Not an array')
        const valid = data.every((item: Record<string, unknown>) => item.question && item.answer)
        if (!valid) throw new Error('Each entry must have question and answer fields')

        setIsSubmitting(true)
        const result = await createBulkProposals(data)
        setUploadFeedback({ type: 'success', msg: `${result.count} Q&A pair${result.count > 1 ? 's' : ''} imported successfully!` })
        loadProposals()
      } catch (error) {
        console.error('Bulk upload error:', error)
        setUploadFeedback({ type: 'error', msg: error instanceof Error ? error.message : 'Invalid JSON format. Please check the format guide.' })
      } finally {
        setIsSubmitting(false)
        setTimeout(() => setUploadFeedback(null), 4000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Copy text to clipboard
  const copyToClipboard = async (text: string, field: 'question' | 'answer') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // clipboard API not available in this context
    }
  }

  // Close detail modal and reset its local state
  const closeDetailModal = () => {
    setDetailProposal(null)
    setRejectReason('')
    setShowRejectInput(false)
  }

  // Handle approve/reject actions
  const handleApprove = async (id: string, fromModal = false) => {
    try {
      await approveProposal(id)
      setUploadFeedback({ type: 'success', msg: 'Proposal approved and added to knowledge base!' })
      if (fromModal) closeDetailModal()
      loadProposals()
    } catch (error) {
      console.error('Failed to approve:', error)
      setUploadFeedback({ type: 'error', msg: 'Failed to approve proposal.' })
    }
    setTimeout(() => setUploadFeedback(null), 4000)
  }

  const handleReject = async (id: string, reason?: string, fromModal = false) => {
    try {
      await rejectProposal(id, reason)
      setUploadFeedback({ type: 'success', msg: 'Proposal rejected.' })
      if (fromModal) closeDetailModal()
      loadProposals()
    } catch (error) {
      console.error('Failed to reject:', error)
      setUploadFeedback({ type: 'error', msg: 'Failed to reject proposal.' })
    }
    setTimeout(() => setUploadFeedback(null), 4000)
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA') // YYYY-MM-DD format
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Knowledge Base Proposals</h1>
          <p className="text-sm text-gray-500 mt-1">Your proposed Q&A pairs for Vi-Sakha's knowledge base</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Upload */}
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={() => setShowFormatGuide(true)}
              onMouseLeave={() => setShowFormatGuide(false)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 bg-white border border-[#E8DFD3] px-4 py-2.5 rounded-xl hover:bg-gray-50 shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
              Bulk Upload
            </button>
            <input ref={fileInputRef} placeholder="placeholder" title="title" type="file" accept=".json" className="hidden" onChange={handleJsonUpload} />

            {/* Format Guide Popup */}
            {showFormatGuide && (
              <div className="absolute right-0 top-full mt-3 w-[400px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="bg-gray-900 text-white px-5 py-3.5 flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold tracking-wide">Bulk Upload Format</span>
                </div>
                <div className="p-5 bg-gradient-to-b from-white to-gray-50/50">
                  <p className="text-[13px] text-gray-600 mb-3">Upload a <code className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-md text-gray-800 font-mono text-xs">.json</code> file with this generic format:</p>
                  <div className="bg-[#1A1A1A] rounded-xl p-4 font-mono text-[13px] text-gray-300 leading-relaxed shadow-inner">
                    <span className="text-gray-500">[</span>{'\n'}
                    {'  '}<span className="text-gray-500">{'{'}</span>{'\n'}
                    {'    '}<span className="text-blue-300">"title"</span>: <span className="text-emerald-300">"HP Deduction Policy"</span>,{'\n'}
                    {'    '}<span className="text-blue-300">"question"</span>: <span className="text-emerald-300">"What is the HP deduction?"</span>,{'\n'}
                    {'    '}<span className="text-blue-300">"answer"</span>: <span className="text-emerald-300">"5 HP per missed deadline"</span>{'\n'}
                    {'  '}<span className="text-gray-500">{'}'}</span>,{'\n'}
                    {'  '}<span className="text-gray-500">{'{'}...{'}'}</span>{'\n'}
                    <span className="text-gray-500">]</span>
                  </div>
                  <div className="mt-4 flex items-start gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                    <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-blue-800 leading-relaxed font-medium">
                      Each object must have <strong>question</strong> and <strong>answer</strong> fields. All entries will be submitted as pending proposals.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* New Proposal */}
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-900 shadow-md shadow-gray-900/20 px-4 py-2.5 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Proposal
          </button>
        </div>
      </div>

      {/* Upload Feedback */}
      {uploadFeedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${uploadFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {uploadFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {uploadFeedback.msg}
        </div>
      )}

      {/* Proposal Form */}
      {showForm && (
        <div className="bg-white border border-[#E8DFD3] rounded-2xl p-7 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">Propose New Q&A Pair</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Title <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">(Optional)</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Short descriptive title, e.g. 'HP Deduction Policy'" className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Question <span className="text-red-400">*</span></label>
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What question should Vi-Sakha answer?" className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Answer <span className="text-red-400">*</span></label>
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="The correct answer Vi-Sakha should give..." rows={4} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-colors" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="text-sm font-medium text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-600/20 text-sm font-semibold px-5 py-2.5 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 drop-shadow-sm" />}
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8DFD3] bg-[#FAF9F6]">
              <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-4 w-[45%]">Question & Answer</th>
              <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-4 w-[15%]">Context</th>
              <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-4 w-[15%]">Proposed By</th>
              <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-4 w-[12%]">Status</th>
              <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-4 w-[13%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm font-medium text-gray-500 mt-3">Loading knowledge base proposals...</p>
                </td>
              </tr>
            ) : proposals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-sm font-medium text-gray-500 bg-gray-50/30">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquarePlus className="w-6 h-6 text-gray-400" />
                  </div>
                  No proposals found. Support the knowledge base by adding new entries!
                </td>
              </tr>
            ) : (
              proposals.map(row => (
                <tr
                  key={row._id}
                  onClick={() => setDetailProposal(row)}
                  className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{row.question}</span>
                    </p>
                    <p className="text-sm text-gray-500 pl-6 leading-relaxed line-clamp-1">{row.answer}</p>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-700">
                    <span className="line-clamp-1">{row.title || <span className="text-gray-400 font-normal italic">None</span>}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {row.proposedBy ? (
                      <div>
                        <p className="font-medium text-gray-700 break-words line-clamp-1">{row.proposedBy.name}</p>
                        <p className="text-[11px] text-gray-400 capitalize">{row.proposedBy.role.replace('_', ' ')}</p>
                      </div>
                    ) : row.submittedBy ? (
                      <span className="text-gray-500 break-words">{row.submittedBy}</span>
                    ) : (
                      <span className="text-gray-300 italic">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5 justify-end items-center">
                      {/* View detail — always visible */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailProposal(row) }}
                        className="p-2 rounded-xl text-gray-400 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-all"
                        title="View full details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* Approve / Reject — admin only, pending only */}
                      {userRole === 'admin' && row.status === 'pending' && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(row._id) }}
                            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm border border-transparent hover:border-emerald-200 transition-all"
                            title="Approve & add to Knowledge Base"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReject(row._id) }}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 hover:shadow-sm border border-transparent hover:border-red-200 transition-all"
                            title="Reject proposal"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Proposal Detail Modal ─────────────────────────────────────────────── */}
      {detailProposal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={closeDetailModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Proposal Details</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {detailProposal.proposedBy
                      ? `Proposed by ${detailProposal.proposedBy.name} (${detailProposal.proposedBy.role.replace('_', ' ')})`
                      : detailProposal.submittedBy
                        ? `By ${detailProposal.submittedBy}`
                        : 'Unknown proposer'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={detailProposal.status} />
                <button
                  onClick={closeDetailModal}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">

              {/* Question */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Question</label>
                  <button
                    onClick={() => copyToClipboard(detailProposal.question, 'question')}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {copiedField === 'question'
                      ? <><Check className="w-3 h-3 text-emerald-500" /> Copied!</>
                      : <><Copy className="w-3 h-3" /> Copy</>
                    }
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {detailProposal.question}
                </div>
              </div>

              {/* Answer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Answer</label>
                  <button
                    onClick={() => copyToClipboard(detailProposal.answer, 'answer')}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {copiedField === 'answer'
                      ? <><Check className="w-3 h-3 text-emerald-500" /> Copied!</>
                      : <><Copy className="w-3 h-3" /> Copy</>
                    }
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {detailProposal.answer}
                </div>
              </div>

              {/* Context / Title */}
              {detailProposal.title && (
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Context</label>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-900">
                    {detailProposal.title}
                  </div>
                </div>
              )}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-1 border-t border-gray-50">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Proposed By</label>
                  {detailProposal.proposedBy ? (
                    <div>
                      <p className="text-sm text-gray-700 font-medium">{detailProposal.proposedBy.name}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{detailProposal.proposedBy.role.replace('_', ' ')}</p>
                    </div>
                  ) : detailProposal.submittedBy ? (
                    <p className="text-sm text-gray-700">{detailProposal.submittedBy}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Unknown</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Submitted</label>
                  <p className="text-sm text-gray-700">{formatDate(detailProposal.createdAt)}</p>
                </div>
                {(detailProposal.status === 'approved' || detailProposal.status === 'rejected') && detailProposal.reviewedBy && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reviewed By</label>
                    <div>
                      <p className="text-sm text-gray-700 font-medium">{detailProposal.reviewedBy.name}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{detailProposal.reviewedBy.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                )}
                {(detailProposal.status === 'approved' || detailProposal.status === 'rejected') && detailProposal.reviewedAt && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reviewed At</label>
                    <p className="text-sm text-gray-700">{formatDate(detailProposal.reviewedAt)}</p>
                  </div>
                )}
                {detailProposal.rejectionReason && (
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">Rejection Reason</label>
                    <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 whitespace-pre-wrap">
                      {detailProposal.rejectionReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Rejection reason input (shown only when admin clicks Reject) */}
              {userRole === 'admin' && detailProposal.status === 'pending' && showRejectInput && (
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Rejection Reason
                    <span className="ml-1 text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Why is this proposal being rejected?"
                    rows={3}
                    autoFocus
                    className="w-full px-4 py-3 bg-red-50/50 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 resize-none transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
              <button
                onClick={closeDetailModal}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Close
              </button>

              {/* Admin actions — only for pending proposals */}
              {userRole === 'admin' && detailProposal.status === 'pending' && (
                <div className="flex gap-2">
                  {showRejectInput ? (
                    <>
                      <button
                        onClick={() => { setShowRejectInput(false); setRejectReason('') }}
                        className="text-sm font-medium text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(detailProposal._id, rejectReason || undefined, true)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-5 py-2 rounded-xl transition-colors shadow-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        Confirm Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowRejectInput(true)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(detailProposal._id, true)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded-xl transition-colors shadow-sm shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   PERFORMANCE CHART HELPERS
   ═══════════════════════════════════════ */

function TrendLineChart({ data, range }: { data: TrendDataPoint[]; range: '7d' | '30d' | '90d' }) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm text-gray-400 font-medium italic">No trend data available for this range.</div>
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
            tickFormatter={(value) => value.slice(5)}
            minTickGap={range === '30d' ? 30 : 0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
          />
          <Tooltip
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
          />
          <Area type="monotone" dataKey="totalQueries" name="Queries" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorQueries)" />
          <Area type="monotone" dataKey="aiResolved" name="AI Resolved" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorResolved)" />
          <Area type="monotone" dataKey="ticketsRaised" name="Tickets" stroke="#f59e0b" strokeWidth={2} fillOpacity={0} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function FeedbackDonut({ positive, negative, total }: FeedbackRatio) {
  const data = [
    { name: 'Satisfied', value: positive, color: '#10b981' },
    { name: 'Unsatisfied', value: negative, color: '#ef4444' }
  ];

  const pct = total > 0 ? Math.round((positive / total) * 100) : 0;

  return (
    <div className="h-[170px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={total > 0 ? data : [{ name: 'Empty', value: 1, color: '#f3f4f6' }]}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={65}
            paddingAngle={5}
            dataKey="value"
          >
            {(total > 0 ? data : [{ color: '#f3f4f6' }]).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-black text-gray-900">{total > 0 ? `${pct}%` : '—'}</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Positive</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   ANALYTICS VIEW
   ═══════════════════════════════════════ */

function AnalyticsView() {
  const role = getUser()?.role ?? 'lab_member'

  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [hotspots, setHotspots] = useState<FeedbackHotspot[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [hotspotsLoading, setHotspotsLoading] = useState(false)
  const [drilldownTopic, setDrilldownTopic] = useState<string | null>(null)
  const [drilldownItems, setDrilldownItems] = useState<FeedbackDrilldownItem[]>([])
  const [drilldownLoading, setDrilldownLoading] = useState(false)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [convMessages, setConvMessages] = useState<ChatMessage[] | null>(null)
  const [convLoading, setConvLoading] = useState(false)
  const [qaGrowth, setQaGrowth] = useState<QaGrowthPoint[]>([])
  const [performance, setPerformance] = useState<MemberPerformance[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setAnalyticsLoading(true)
      try {
        const [tStats, summaryRes, hotspotsRes, growthRes, perfRes] = await Promise.all([
          getTicketStats(),
          getDashboardSummary(),
          getFeedbackHotspots().catch(() => []),
          adminGetQaGrowth().catch(() => []),
          adminGetPerformance().catch(() => [])
        ])
        setTicketStats(tStats)
        setSummary(summaryRes)
        setHotspots(hotspotsRes)
        setQaGrowth(growthRes)
        setPerformance(perfRes)
      } catch (error) {
        console.error('Failed to load analytics data:', error)
      } finally {
        setAnalyticsLoading(false)
      }
    }

    loadData()
  }, [])


  const openDrilldown = async (topic: string) => {
    setDrilldownTopic(topic)
    setDrilldownLoading(true)
    setDrilldownItems([])
    setSelectedConvId(null)
    setConvMessages(null)
    try {
      const items = await getFeedbackByTopic(topic)
      setDrilldownItems(items)
    } catch (err) {
      console.error('Failed to load drilldown:', err)
    } finally {
      setDrilldownLoading(false)
    }
  }

  const openConversation = async (convId: string) => {
    setSelectedConvId(convId)
    setConvLoading(true)
    setConvMessages(null)
    try {
      const { messages } = await getConversation(convId)
      setConvMessages(messages)
    } catch (err) {
      console.error('Failed to load conversation:', err)
    } finally {
      setConvLoading(false)
    }
  }

  const closeDrilldown = () => {
    setDrilldownTopic(null)
    setDrilldownItems([])
    setSelectedConvId(null)
    setConvMessages(null)
  }

  // Map hotspots to topic chart data
  const topicChartData = hotspots.slice(0, 6).map(h => ({
    topic: h.topic,
    count: h.total,
    neg: h.negative,
    pct: Math.round(h.negativeRatio * 100)
  }));

  // AI vs Human resolution distribution data
  const resData = [
    { name: 'AI Resolved', value: summary?.aiResolutionRate ?? 85, fill: '#10b981' },
    { name: 'Human Escalated', value: 100 - (summary?.aiResolutionRate ?? 85), fill: '#f59e0b' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-gray-500 font-medium mt-1">Vi-Sakha performance and system-wide intelligence.</p>
      </div>

      {/* KPI HERO SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Queries', value: summary?.totalQueries?.toLocaleString() ?? '—', change: '+12%', icon: MessagesSquare, color: 'indigo' },
          { label: 'AI Resolution', value: `${summary?.aiResolutionRate ?? 0}%`, change: '+3.1%', icon: Bot, color: 'emerald' },
          { label: 'Avg Response', value: `${(summary?.avgResponseMs ?? 0) / 1000}s`, change: '-0.2s', icon: Clock, color: 'blue' },
          { label: 'Knowledge Base', value: summary?.kbSize?.toLocaleString() ?? '—', change: 'Verfied', icon: ShieldCheck, color: 'purple' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className={`p-3 rounded-2xl bg-${kpi.color}-50 text-${kpi.color}-600 inline-block mb-4 group-hover:bg-${kpi.color}-600 group-hover:text-white transition-colors`}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-black text-gray-900 tracking-tight">{kpi.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{kpi.label}</p>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* DISCORD PULSE SUMMARY */}
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full" />
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-xl font-black">Discord Pulse</h3>
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-100">
              <Zap className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-8 relative z-10">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Active Tickets</p>
                <p className="text-5xl font-black text-white">{summary?.discordOpen ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-indigo-200/50 uppercase tracking-widest mb-1">Total Ingested</p>
                <p className="text-xl font-black text-indigo-100">{summary?.discordTotal ?? 0}</p>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* TICKET HEALTH & OPERATIONS */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black text-gray-900">Support Operations</h3>
            <div className="flex gap-2 bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              System Active
            </div>
          </div>

          <div className="grid grid-cols-3 gap-10 mb-10">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Open Web</p>
              <p className="text-4xl font-black text-amber-600">{ticketStats?.open ?? 0}</p>
              <div className="h-1.5 w-12 bg-amber-400 rounded-full" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resolved</p>
              <p className="text-4xl font-black text-emerald-600">{ticketStats?.resolved ?? 0}</p>
              <div className="h-1.5 w-12 bg-emerald-400 rounded-full" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg. Res.</p>
              <p className="text-4xl font-black text-gray-900">{ticketStats?.avgResolutionHours ?? 0}h</p>
              <div className="h-1.5 w-12 bg-gray-900 rounded-full" />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border border-gray-100 rounded-3xl">
            <div className="flex justify-between items-center mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Operational Efficiency (Holistic)</span>
              <span className="text-gray-900">
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

        {/* RESOLUTION SPLIT DONUT */}
        <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-xl text-white flex flex-col justify-between">
          <h3 className="text-lg font-black mb-1">Resolution Split</h3>
          <p className="text-xs font-medium text-blue-200/50 mb-6">AI vs Human Automation</p>

          <div className="h-[200px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {resData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black">{summary?.aiResolutionRate ?? 0}%</span>
              <span className="text-[8px] font-bold text-blue-300 uppercase tracking-tighter">AI Driven</span>
            </div>
          </div>
        </div>
      </div>

      {/* NEW ANALYTICS GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">QA Entry Growth</h3>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Daily accumulation in Knowledge Base</p>
          </div>
          <div className="h-[400px]">
            {analyticsLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
              </div>
            ) : qaGrowth.length > 0 ? (
              <VisxBarChart data={qaGrowth} xDataKey="date">
                <VisxGrid horizontal numTicksRows={5} />
                <BarXAxis />
                <VisxBar
                  dataKey="count"
                  fill="url(#growth-gradient)"
                  lineCap={6}
                />
                <BarLineIndicator
                  data={qaGrowth}
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

        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Lab Member Performance</h3>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Resolution benchmarks by member</p>
          </div>
          <div className="h-[400px]">
            {analyticsLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
              </div>
            ) : performance.length > 0 ? (
              <VisxBarChart data={performance} xDataKey="name">
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

      {/* KNOWLEDGE PULSE FOOTER */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm mt-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-gray-900">Knowledge Pulse</h3>
          <ShieldCheck className="w-5 h-5 text-purple-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex justify-between items-end border-r border-gray-50 pr-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Verified</p>
              <p className="text-5xl font-black text-gray-900 tracking-tighter">{summary?.kbSize ?? 0}</p>
            </div>
            <div className="text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-full">+12 Monthly</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Sync</p>
            <p className="text-2xl font-black text-amber-600">{summary?.qaPending ?? 0}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Approval Velocity</p>
            <p className="text-2xl font-black text-indigo-600">{summary?.qaApprovalRate ?? 0}%</p>
          </div>
        </div>
      </div>
      {/* FEEDBACK HOTSPOTS (ADMIN ONLY) */}
      {role === 'admin' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm mt-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900">Negative Hotspots</h3>
              <p className="text-sm font-medium text-gray-500">Topics requiring knowledge base enrichment.</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-50 border border-red-100 px-3 py-1 rounded-full">ACTION REQUIRED</span>
          </div>

          {hotspotsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
          ) : hotspots.length === 0 ? (
            <div className="text-center py-20 text-sm font-bold text-gray-400 bg-gray-50/30 rounded-[2rem] border border-dashed border-gray-200">
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
                    const pct = Math.round(row.negativeRatio * 100)
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Drilldown Modal ── */}
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
  )
}

/* ═══════════════════════════════════════
   DISCORD VIEW
   ═══════════════════════════════════════ */

function DiscordView() {
  const [conversations, setConversations] = useState<DiscordConversationSummary[]>([])
  const [selected, setSelected] = useState<DiscordConversationDetail | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const refreshList = useCallback(() => {
    Promise.all([
      getDiscordConversations(statusFilter === 'all' ? undefined : statusFilter),
      getDiscordStats(),
    ])
      .then(([convs, s]) => {
        setConversations(convs)
        setStats(s)
      })
      .catch(console.error)
  }, [statusFilter])

  // ── Initial load + re-load when filter changes ─────────────────────────────
  useEffect(() => {
    setLoading(true)
    refreshList()
    setLoading(false)
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global activity subscription — refreshes the list on any ticket event ──
  useEffect(() => {
    const unsub = subscribeToDiscordActivity(({ ticketNumber, event }) => {
      if (event === 'ticket_created') {
        // New ticket — reload the whole list
        refreshList()
        return
      }
      if (event === 'transcript_ready') {
        // Ticket just closed — reload list so status badge updates
        refreshList()
        return
      }
      // new_message — bump the messageCount for that ticket in the list
      setConversations((prev) =>
        prev.map((c) =>
          c.ticketNumber === ticketNumber
            ? { ...c, messageCount: c.messageCount + 1, lastMessageAt: new Date().toISOString() }
            : c,
        ),
      )
      // Also update stats open count if this ticket is new to the list
    })
    return unsub
  }, [refreshList])

  // ── Detail load + room subscription ───────────────────────────────────────
  useEffect(() => {
    if (!selected) return

    // Always re-fetch when switching tickets to get current messages
    setDetailLoading(true)
    getDiscordConversation(selected.ticketNumber)
      .then((detail) => {
        setSelected(detail)
        setDetailLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setDetailLoading(false)
      })

    // Subscribe to real-time room events for this specific ticket
    const unsub = subscribeToDiscordTicket(
      selected.ticketNumber,
      ({ message }) => {
        // Append incoming live message to the thread
        setSelected((prev) => {
          if (!prev) return prev
          return { ...prev, messages: [...prev.messages, message] }
        })
      },
      () => {
        // Transcript arrived — reload full detail (messages replaced)
        getDiscordConversation(selected.ticketNumber)
          .then(setSelected)
          .catch(console.error)
      },
    )

    return unsub
  }, [selected?.ticketNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll to latest message ─────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.messages?.length])

  function openDetail(conv: DiscordConversationSummary) {
    // Set placeholder immediately so the right panel shows, then useEffect fetches full data
    setSelected({ ...conv, messages: [] })
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* ── Left panel: conversation list ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'Live', value: stats.open, color: 'text-green-600' },
            { label: 'Closed', value: stats.closed, color: 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs + refresh */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'open', 'closed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md capitalize transition-colors ${statusFilter === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={refreshList}
            title="Refresh"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => openDetail(conv)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.ticketNumber === conv.ticketNumber
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-semibold ${selected?.ticketNumber === conv.ticketNumber ? 'text-white' : 'text-gray-900'}`}>
                    #{conv.ticketNumber}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${conv.status === 'open'
                    ? 'bg-green-100 text-green-700'
                    : selected?.ticketNumber === conv.ticketNumber
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                    {conv.status === 'open' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    )}
                    {conv.status === 'open' ? 'LIVE' : 'CLOSED'}
                  </span>
                </div>
                <div className={`flex items-center justify-between text-[11px] ${selected?.ticketNumber === conv.ticketNumber ? 'text-white/70' : 'text-gray-400'}`}>
                  <span>{conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}</span>
                  <span>{new Date(conv.lastMessageAt ?? conv.createdAt).toLocaleDateString()}</span>
                </div>
                {conv.source === 'discord_transcript' && (
                  <div className={`mt-1.5 text-[10px] font-medium ${selected?.ticketNumber === conv.ticketNumber ? 'text-blue-300' : 'text-blue-500'}`}>
                    ✓ Transcript processed
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: message thread ── */}
      <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Radio className="w-10 h-10 opacity-20" />
            <p className="text-sm">Select a conversation to view messages</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm font-semibold text-gray-900">Ticket #{selected.ticketNumber}</span>
                  <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${selected.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {selected.status === 'open' ? '● LIVE' : 'CLOSED'}
                  </span>
                  {selected.ticketOwnerName && (
                    <span className="ml-2 text-[11px] text-gray-400">
                      by <span className="text-gray-700 font-medium">{selected.ticketOwnerName}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{selected.messages?.length ?? 0} messages</span>
                {selected.source === 'discord_transcript' && (
                  <span className="text-blue-500 font-medium">Transcript</span>
                )}
                {detailLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {selected.messages?.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {detailLoading ? 'Loading messages…' : 'No messages yet'}
                </div>
              ) : (
                selected.messages.map((msg, i) => (
                  <DiscordMessageBubble
                    key={i}
                    msg={msg}
                    ticketOwnerId={selected.ticketOwnerId}
                    ticketOwnerName={selected.ticketOwnerName}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * WhatsApp-style chat bubble.
 *
 * Ownership rule:
 *   - ticketOwnerId present  → compare msg.authorId to decide side
 *   - ticketOwnerId absent   → fall back to role ('user' = owner side)
 *
 * Owner (student)  → RIGHT  · dark bubble (bg-gray-900 text-white)
 * Others (mentors) → LEFT   · gray bubble (bg-gray-100 text-gray-900)
 * System / bots    → CENTER · pill chip
 */
function DiscordMessageBubble({
  msg,
  ticketOwnerId,
  ticketOwnerName,
}: {
  msg: DiscordMessageItem
  ticketOwnerId?: string
  ticketOwnerName?: string
}) {
  // ── System / bot messages ──────────────────────────────────────────────
  if (msg.role === 'system') {
    // ── Ticket metadata card — shows structured embed fields ──────────
    if (msg.type === 'ticket_reason' && msg.text) {
      // Parse "**Field Name**\nValue" patterns from the normalized embed text
      const lines = msg.text.split('\n')
      const fields: Array<{ label: string; value: string }> = []
      let title = ''

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        const boldMatch = line.match(/^\*\*(.+?)\*\*$/)
        if (boldMatch) {
          const label = boldMatch[1]
          // Collect all following non-bold lines as the value
          const valueLines: string[] = []
          while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('**')) {
            i++
            const vLine = lines[i].trim()
            if (vLine) valueLines.push(vLine)
          }
          if (valueLines.length > 0) {
            fields.push({ label, value: valueLines.join('\n') })
          } else {
            // It's a standalone bold line — likely the title
            if (!title) title = label
          }
        } else if (line && !title) {
          title = line
        }
      }

      return (
        <div className="flex justify-center my-3 px-4">
          <div className="w-full max-w-[500px] bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm">
            {title && (
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-3 pb-2 border-b border-amber-200">
                <Bot className="w-4 h-4 flex-shrink-0" />
                <span>{title}</span>
              </div>
            )}
            <div className="grid gap-2">
              {fields.map((f, idx) => (
                <div key={idx} className="text-xs">
                  <span className="font-semibold text-amber-900">{f.label}</span>
                  <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // ── Regular system messages — centred pill ─────────────────────────
    return (
      <div className="flex justify-center my-1">
        <div className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
          <Bot className="w-3 h-3 flex-shrink-0" />
          <span className="italic">{msg.text || '(system message)'}</span>
        </div>
      </div>
    )
  }

  // ── Determine ownership ───────────────────────────────────────────────────
  // Primary: compare Discord user IDs
  // Fallback (transcripts have no authorId): compare names, then role
  let isOwner: boolean
  if (ticketOwnerId && msg.authorId) {
    isOwner = msg.authorId === ticketOwnerId
  } else if (ticketOwnerName && msg.authorName) {
    isOwner = msg.authorName === ticketOwnerName
  } else {
    // Last resort: role='user' == ticket creator
    isOwner = msg.role === 'user'
  }

  const senderLabel = msg.authorName ?? (isOwner ? 'Student' : 'Mentor')
  const time = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex w-full ${isOwner ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwner ? 'items-end' : 'items-start'}`}>
        {/* Sender name (only shown for non-owner so owner name doesn't repeat) */}
        {!isOwner && (
          <span className="text-[10px] text-gray-400 px-1 font-medium">{senderLabel}</span>
        )}

        {/* Bubble */}
        <div className={`px-3.5 py-2 text-sm leading-relaxed break-words ${isOwner
          ? 'bg-gray-900 text-white rounded-2xl rounded-br-sm'
          : 'bg-gray-200 text-gray-900 rounded-2xl rounded-bl-sm'
          }`}>
          {msg.text || <span className="opacity-40 italic">empty message</span>}

          {msg.attachments?.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {msg.attachments.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 text-[11px] underline ${isOwner ? 'text-blue-300' : 'text-blue-600'
                    }`}
                >
                  <Paperclip className="w-3 h-3 flex-shrink-0" />
                  attachment
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-gray-400 px-1">{time}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   ID MANAGEMENT VIEW (admin only)
   ═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   QA MANAGEMENT VIEW (admin only — qa_pairs_v2)
   ═══════════════════════════════════════ */

function QAManagementView() {
  const [pairs, setPairs] = useState<QaPairV2[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination & Lazy Loading
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1) // Reset to first page on search
    }, 400)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Edit modal state
  const [editingPair, setEditingPair] = useState<QaPairV2 | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Feedback toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const loadPairs = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await adminListQaPairs(currentPage, itemsPerPage, debouncedSearch)
      setPairs(result.data)
      setTotal(result.pagination.total)
    } catch (err: any) {
      setError(err.message || 'Failed to load QA pairs')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, itemsPerPage, debouncedSearch])

  useEffect(() => { loadPairs() }, [loadPairs])

  // Open edit modal
  const openEdit = (pair: QaPairV2) => {
    setEditingPair(pair)
    setEditQuestion(pair.question)
    setEditAnswer(pair.answer)
    setEditCategory(pair.category ?? '')
    setSaveError('')
  }

  // Save edit
  const handleSave = async () => {
    if (!editingPair) return
    if (!editQuestion.trim() || !editAnswer.trim()) {
      setSaveError('Question and answer are required.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await adminUpdateQaPair(editingPair._id, {
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
        category: editCategory.trim() || undefined,
      })
      setEditingPair(null)
      showToast('success', 'QA pair updated and embedding regenerated.')
      loadPairs()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update. Is the embedding sidecar running?')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete
  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await adminDeleteQaPair(deletingId)
      setDeletingId(null)
      showToast('success', 'QA pair deleted.')
      loadPairs()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete QA pair.')
      setDeletingId(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`mb-4 p-3 rounded-xl border text-sm ${toast.type === 'success'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-600 border-red-100'
          }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Q&A Knowledge Base</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage Q&A pairs used for RAG retrieval ({total} total)
          </p>
        </div>
        <button
          onClick={loadPairs}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions, answers, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl border bg-red-50 text-red-600 border-red-100 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && pairs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading QA pairs...</span>
        </div>
      ) : pairs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{debouncedSearch ? 'No matching QA pairs found.' : 'No QA pairs in the knowledge base.'}</p>
        </div>
      ) : (
        /* Table */
        <div className="border border-gray-200 rounded-xl overflow-hidden relative flex flex-col h-[calc(100vh-210px)] min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[35%]">Question</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[40%]">Answer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[12%]">Category</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 w-[13%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair) => (
                  <tr key={pair._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <p className="text-gray-900 line-clamp-3">{pair.question}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-gray-600 line-clamp-3">{pair.answer}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {pair.category ? (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs">
                          {pair.category}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(pair)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(pair._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 border-t border-gray-200 bg-gray-50/50 shrink-0">
            <Pagination
              totalItems={total}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !isSaving && setEditingPair(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit QA Pair</h3>
              <button
                onClick={() => !isSaving && setEditingPair(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {saveError && (
                <div className="p-3 rounded-xl border bg-red-50 text-red-600 border-red-100 text-sm">
                  {saveError}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Question</label>
                <textarea
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Answer</label>
                <textarea
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category (optional)</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="e.g. General, Technical, Onboarding"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                />
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Saving will regenerate the embedding using the sidecar service. Ensure it's running on port 8001.</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setEditingPair(null)}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editQuestion.trim() || !editAnswer.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving & embedding...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !isDeleting && setDeletingId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete QA Pair</h3>
              </div>
              <p className="text-sm text-gray-600">
                This will permanently remove this Q&A pair from the knowledge base. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function IDManagementView() {
  const currentUserId = getUser()?.id ?? ''
  const [tab, setTab] = useState<'users' | 'lab-members'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [members, setMembers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)

  const loadUsers = () => {
    setLoading(true)
    adminListUsers()
      .then(setUsers)
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  const loadMembers = () => {
    setLoading(true)
    adminListLabMembers()
      .then(setMembers)
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  useEffect(() => { tab === 'users' ? loadUsers() : loadMembers() }, [tab])

  const handleRoleChange = async (user: AdminUser, role: AdminUser['role']) => {
    setActionError('')
    try { await adminChangeRole(user._id, role); loadUsers() }
    catch (e: any) { setActionError(e.message) }
  }

  const handleToggleActive = async (user: AdminUser) => {
    setActionError('')
    try { await adminSetStatus(user._id, !user.isActive); loadUsers() }
    catch (e: any) { setActionError(e.message) }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    setActionError('')
    try { await adminDeleteUser(user._id); loadUsers() }
    catch (e: any) { setActionError(e.message) }
  }

  const openCreate = () => {
    setEditTarget(null); setForm({ name: '', email: '', password: '' }); setActionError(''); setShowCreate(true)
  }

  const openEdit = (m: AdminUser) => {
    setEditTarget(m); setForm({ name: m.name, email: m.email, password: '' }); setActionError(''); setShowCreate(true)
  }

  const handleSave = async () => {
    setSaving(true); setActionError('')
    try {
      if (editTarget) {
        const payload: any = {}
        if (form.name) payload.name = form.name
        if (form.email) payload.email = form.email
        if (form.password) payload.password = form.password
        await adminUpdateLabMember(editTarget._id, payload)
      } else {
        await adminCreateLabMember(form)
      }
      setShowCreate(false); loadMembers()
    } catch (e: any) { setActionError(e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteMember = async (m: AdminUser) => {
    if (!confirm(`Delete lab member "${m.name}"?`)) return
    setActionError('')
    try { await adminDeleteLabMember(m._id); loadMembers() }
    catch (e: any) { setActionError(e.message) }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">ID Management</h2>
        <p className="text-sm text-gray-500 mt-1">Manage users, roles, and lab members — admin only</p>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-sm text-red-600">{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['users', 'lab-members'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowCreate(false) }}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {t === 'lab-members' ? 'Lab Members' : 'All Users'}
          </button>
        ))}
      </div>

      {/* All Users tab */}
      {tab === 'users' && (
        loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#E8DFD3]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E8DFD3] text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Name / Email</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Provider</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => {
                  const isSelf = u._id === currentUserId
                  return (
                    <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-gray-900">{u.name}</div>
                        <div className="text-gray-400 text-xs">{u.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={e => handleRoleChange(u, e.target.value as AdminUser['role'])}
                          className="border border-gray-200 bg-white text-gray-700 text-xs rounded-lg px-2 py-1 disabled:opacity-40"
                        >
                          <option value="student">Student</option>
                          <option value="lab_member">Lab Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${u.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs capitalize">{u.provider}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isSelf}
                            onClick={() => handleToggleActive(u)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 transition-colors"
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            disabled={isSelf}
                            onClick={() => handleDeleteUser(u)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 disabled:opacity-40 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Lab Members tab */}
      {tab === 'lab-members' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Lab Member
            </button>
          </div>

          {showCreate && (
            <div className="mb-6 p-5 rounded-2xl border border-[#E8DFD3] bg-[#FAF9F6]">
              <div className="text-sm font-semibold text-gray-900 mb-4">{editTarget ? 'Edit Lab Member' : 'New Lab Member'}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Password {editTarget && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="Min 6 characters" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E8DFD3]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E8DFD3] text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Name / Email</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Created</th>
                    <th className="text-left px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">No lab members yet.</td></tr>
                  )}
                  {members.map(m => (
                    <tr key={m._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-gray-900">{m.name}</div>
                        <div className="text-gray-400 text-xs">{m.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${m.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(m)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors">Edit</button>
                          <button disabled={m._id === currentUserId} onClick={() => handleDeleteMember(m)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 disabled:opacity-40 transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   ANIMATED SIDEBAR NAV ITEM
   ═══════════════════════════════════════ */

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  badge?: string
  onClick: () => void
}) {
  const { open, animate } = useSidebar()
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
        } ${open ? 'justify-start gap-3 px-3' : 'justify-center px-0'}`}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      <motion.span
        animate={{
          display: animate ? (open ? 'inline-flex' : 'none') : 'inline-flex',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.15 }}
        className="flex-1 items-center justify-between gap-2"
      >
        <span className="text-left whitespace-nowrap">{label}</span>
        {badge && (
          <span className="flex-shrink-0 bg-blue-100 text-blue-700 text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {badge}
          </span>
        )}
      </motion.span>
    </button>
  )
}

/* ═══════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════ */

export default function LabMemberDashboard() {
  const navigate = useNavigate()
  const authUser = getUser()
  const [activeView, setActiveView] = useState<View>('home')
  const [showBanner, setShowBanner] = useState(true)
  const [sidebarStats, setSidebarStats] = useState<{
    activeConversations: number;
    openTickets: number;
    pendingProposals: number;
  }>({ activeConversations: 0, openTickets: 0, pendingProposals: 0 })

  // Fetch sidebar badge counts
  useEffect(() => {
    async function fetchBadgeCounts() {
      try {
        const [allConversations, proposalsResult] = await Promise.all([
          getAggregatedConversationStats(),
          fetchProposals(),
        ])
        const openTickets = await getTickets({ status: 'open' })
        setSidebarStats({
          activeConversations: allConversations.totalConversations,
          openTickets: openTickets.length,
          pendingProposals: proposalsResult.data.filter((p: QaProposal) => p.status === 'pending').length,
        })
      } catch (error) {
        console.error('Failed to fetch badge counts:', error)
      }
    }
    fetchBadgeCounts()
  }, [activeView]) // Refresh when view changes

  const [discordOpenCount, setDiscordOpenCount] = useState(0)

  useEffect(() => {
    getDiscordStats()
      .then((s) => setDiscordOpenCount(s.open))
      .catch(() => {/* ignore if module not yet active */ })
  }, [activeView])

  const isAdmin = authUser?.role === 'admin'

  // Dynamic sidebar items with real counts
  const sidebarItems: { icon: typeof Users; label: string; view: View; badge?: string }[] = [
    { icon: Users, label: 'Dashboard', view: 'home' },
    { icon: MessagesSquare, label: 'Conversations', view: 'conversations', badge: sidebarStats.activeConversations > 0 ? String(sidebarStats.activeConversations) : undefined },
    { icon: Ticket, label: 'Tickets', view: 'tickets', badge: sidebarStats.openTickets > 0 ? String(sidebarStats.openTickets) : undefined },
    { icon: Radio, label: 'Discord', view: 'discord', badge: discordOpenCount > 0 ? String(discordOpenCount) : undefined },
    { icon: MessageSquarePlus, label: 'Q&A Proposals', view: 'qa', badge: sidebarStats.pendingProposals > 0 ? String(sidebarStats.pendingProposals) : undefined },
    { icon: BarChart3, label: 'Analytics', view: 'analytics' },
    ...(isAdmin ? [
      { icon: BookOpen as typeof Users, label: 'Q&A Management', view: 'qa-management' as View },
      { icon: ShieldCheck as typeof Users, label: 'ID Management', view: 'id-management' as View },
    ] : []),
  ]

  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-white font-['Inter']">
      {/* ── Left Sidebar (animated) ── */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} animate={true}>
        <SidebarBody className="justify-between gap-6 bg-[#FAF9F6] border-r border-gray-200 py-3">
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Logo */}
            <div className={`mb-5 ${sidebarOpen ? 'px-3' : 'px-0'}`}>
              <Link to="/" className={`flex items-center py-1 ${sidebarOpen ? 'gap-2.5' : 'justify-center'}`}>
                <div className="bg-gray-900 rounded-lg px-2 py-1.5 flex-shrink-0">
                  <span className="text-white font-bold text-xs tracking-tight">VS</span>
                </div>
                <motion.div
                  animate={{
                    display: sidebarOpen ? 'block' : 'none',
                    opacity: sidebarOpen ? 1 : 0,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  <span className="text-gray-900 text-sm font-semibold block leading-tight whitespace-nowrap">Vi-Sakha</span>
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium whitespace-nowrap">
                    {isAdmin ? 'Admin' : 'Lab Member'}
                  </span>
                </motion.div>
              </Link>
            </div>

            {/* Nav items */}
            <nav className="space-y-0.5 px-2">
              {sidebarItems.map(item => (
                <NavItem
                  key={item.view}
                  icon={item.icon}
                  label={item.label}
                  active={activeView === item.view}
                  badge={item.badge}
                  onClick={() => setActiveView(item.view)}
                />
              ))}
            </nav>
          </div>

          {/* Bottom section */}
          <div className="px-2 space-y-0.5 border-t border-gray-200 pt-3">
            {bottomItems.map(item => (
              <NavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={false}
                onClick={() => {
                  if (item.label === 'Settings') {
                    navigate('/dashboard/settings')
                  }
                }}
              />
            ))}
            <NavItem
              icon={LogOut}
              label="Sign out"
              active={false}
              onClick={() => { clearAuth(); navigate('/login') }}
            />
            {/* User name */}
            <div className={`flex items-center py-2 ${sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'}`}>
              <div className="w-[18px] h-[18px] rounded-full bg-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-600 flex-shrink-0">
                {(authUser?.name ?? 'L')[0].toUpperCase()}
              </div>
              <motion.span
                animate={{
                  display: sidebarOpen ? 'inline' : 'none',
                  opacity: sidebarOpen ? 1 : 0,
                }}
                transition={{ duration: 0.15 }}
                className="text-xs text-gray-500 whitespace-nowrap"
              >
                {authUser?.name ?? 'Lab Member'}
              </motion.span>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Banner — dismissable */}
        {showBanner && (
          <div className="bg-[#F5EFE7] border-b border-[#E8DFD3] px-6 py-2.5 flex items-center justify-between text-sm">
            <p className="text-gray-700">
              <span className="font-semibold">{isAdmin ? 'Admin Dashboard' : 'Lab Member Dashboard'}</span> — VLED Lab, IIT Ropar
            </p>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Logged in as <span className="text-gray-700 font-medium">{authUser?.name ?? 'Lab Member'}</span></span>
                <button
                  onClick={() => { clearAuth(); navigate('/login') }}
                  className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-white/60 transition-colors"
                >
                  Sign out
                </button>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-white/60 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className={activeView === 'discord' ? 'px-6 py-6' : 'max-w-5xl mx-auto px-8 py-8'}>
          {activeView === 'home' && (
            <ActionDrivenDashboard
              isAdmin={isAdmin}
              user={authUser}
              onNavigate={setActiveView}
            />
          )}
          {activeView === 'conversations' && <ConversationsView />}
          {activeView === 'tickets' && <TicketsView />}
          {activeView === 'discord' && <DiscordView />}
          {activeView === 'qa' && <QAProposalsView />}
          {activeView === 'analytics' && <AnalyticsView />}
          {activeView === 'id-management' && isAdmin && <IDManagementView />}
          {activeView === 'qa-management' && isAdmin && <QAManagementView />}
        </div>
      </main>
    </div>
  )
}
