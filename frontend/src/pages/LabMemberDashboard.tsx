import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquarePlus,
  MessagesSquare,
  Ticket,
  BarChart3,
  Users,
  Search,
  Settings,
  User,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
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
} from 'lucide-react'
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
  closeTicket,
  getTicket,
  type SupportTicket,
  type TicketScreenshot,
  getTicketStats,
  type TicketStats,
} from '../lib/api'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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

const mockStudents = [
  { name: 'Arjun P.', cohort: 'Euclideans', hp: 92, modules: '8/10', status: 'on-track', lastActive: '2 min ago', avatar: 'A' },
  { name: 'Meera D.', cohort: 'Dijkstrians', hp: 67, modules: '5/10', status: 'at-risk', lastActive: '1h ago', avatar: 'M' },
  { name: 'Karan S.', cohort: 'AKSians', hp: 45, modules: '3/10', status: 'critical', lastActive: '3h ago', avatar: 'K' },
  { name: 'Divya L.', cohort: 'Kruskalians', hp: 88, modules: '7/10', status: 'on-track', lastActive: '15 min ago', avatar: 'D' },
  { name: 'Rohit G.', cohort: 'RSAians', hp: 73, modules: '6/10', status: 'at-risk', lastActive: '5h ago', avatar: 'R' },
  { name: 'Sneha R.', cohort: 'Euclideans', hp: 95, modules: '9/10', status: 'on-track', lastActive: '30 min ago', avatar: 'S' },
  { name: 'Ananya B.', cohort: 'Dijkstrians', hp: 82, modules: '7/10', status: 'on-track', lastActive: '1h ago', avatar: 'A' },
  { name: 'Vikram N.', cohort: 'Kruskalians', hp: 38, modules: '2/10', status: 'critical', lastActive: '1d ago', avatar: 'V' },
]

/* ═══════════════════════════════════════
   TYPES & CONFIG
   ═══════════════════════════════════════ */

type View = 'home' | 'conversations' | 'tickets' | 'qa' | 'analytics'

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

function StudentsHomeView() {
  const [cohortFilter, setCohortFilter] = useState('all')

  const cohorts = ['all', 'Euclideans', 'Dijkstrians', 'Kruskalians', 'AKSians', 'RSAians']
  const filtered = cohortFilter === 'all' ? mockStudents : mockStudents.filter(s => s.cohort === cohortFilter)

  const onTrack = mockStudents.filter(s => s.status === 'on-track').length
  const atRisk = mockStudents.filter(s => s.status === 'at-risk').length
  const critical = mockStudents.filter(s => s.status === 'critical').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor student progress across cohorts</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mockStudents.length}</p>
              <p className="text-xs text-gray-500">Total Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{onTrack}</p>
              <p className="text-xs text-gray-500">On Track</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{atRisk}</p>
              <p className="text-xs text-gray-500">At Risk</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{critical}</p>
              <p className="text-xs text-gray-500">Critical</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Filter */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {cohorts.map(c => (
          <button
            key={c}
            onClick={() => setCohortFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              cohortFilter === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Student Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Student</th>
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Cohort</th>
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">HP</th>
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Modules</th>
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                      s.status === 'on-track' ? 'bg-emerald-500' : s.status === 'at-risk' ? 'bg-amber-500' : 'bg-red-500'
                    }`}>
                      {s.avatar}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{s.cohort}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.hp >= 80 ? 'bg-emerald-500' : s.hp >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${s.hp}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{s.hp}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{s.modules}</td>
                <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                <td className="px-5 py-3.5 text-xs text-gray-400">{s.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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

    try {
      const detail = await getAggregatedConversationDetail(conversation.source, conversation.conversation_id)
      setSelectedConversationDetail(detail)
    } catch (error) {
      console.error('Failed to fetch conversation detail:', error)
    } finally {
      setDetailLoading(false)
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
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Conversations', value: stats?.totalConversations ?? conversations.length, icon: MessagesSquare, color: 'text-blue-600 bg-blue-50' },
          { label: 'RAG Chats', value: sourceCounts.rag, icon: Bot, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Discord Chats', value: sourceCounts.discord, icon: Ticket, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'RAG Avg Confidence', value: avgRagConfidence !== null ? `${avgRagConfidence}%` : '—', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
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
        <div className="space-y-2">
          {conversations.map(conv => {
            const latestSpeaker = getLatestSpeaker(conv)

            return (
              <div
                key={`${conv.source}-${conv.conversation_id}`}
                onClick={() => openConversation(conv)}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getSourceColor(conv.source)}`}>
                    {conv.user?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{conv.user || 'Unknown User'}</span>
                      <span className="text-[11px] text-gray-400">
                        · {sourceLabel(conv.source)} · {conv.message_count} msgs
                        {latestSpeaker ? ` · latest: ${latestSpeaker}` : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{getConversationPreview(conv)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-gray-400">{formatDate(conv.timestamp)}</span>
                      {conv.source === 'rag' && conv.confidence !== undefined && conv.confidence !== null && (
                        <span className={`text-[11px] font-medium ${normalizeConfidence(conv.confidence)! >= 80 ? 'text-emerald-600' : normalizeConfidence(conv.confidence)! >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                          {normalizeConfidence(conv.confidence)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={conv.source} />
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
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
                className={`min-w-10 px-3 py-2 rounded-xl border text-sm transition-colors ${
                  page === pageNumber
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
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${getSourceColor(selectedConversation.source)}`}>
                    {selectedConversation.user?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">{selectedConversation.user}</h2>
                    <p className="text-xs text-gray-500">{sourceLabel(selectedConversation.source)} · {selectedConversation.message_count} messages</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedConversation.source} />
                  {selectedConversation.source === 'rag' && selectedConversation.confidence !== null && selectedConversation.confidence !== undefined && (
                    <span className="text-xs text-gray-500">Confidence: {normalizeConfidence(selectedConversation.confidence)}%</span>
                  )}
                </div>
              </>
              <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-gray-100 rounded-xl" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : selectedConversationDetail ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversationDetail.messages.map((msg, index) => (
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
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-500">Unable to load conversation messages.</div>
            )}

            {/* Footer with stats */}
            {selectedConversation && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Started: {new Date(selectedConversation.timestamp).toLocaleDateString()}</span>
                  <span>Source: {sourceLabel(selectedConversation.source)}</span>
                  {selectedConversation.source === 'rag' && selectedConversation.confidence !== undefined && selectedConversation.confidence !== null && (
                    <span>Confidence: {normalizeConfidence(selectedConversation.confidence)}%</span>
                  )}
                </div>
              </div>
            )}
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
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'open' | 'mine' | 'resolved'>('all')
  const [currentInstructor, setCurrentInstructor] = useState('Lab Member')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [updatingTicket, setUpdatingTicket] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 8, pages: 1 })
  const [pendingScreenshots, setPendingScreenshots] = useState<TicketScreenshot[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)

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
      const fresh = await getTicket(ticket.id)
      setSelectedTicket(fresh)
      setTransferTo(fresh.assignedInstructor ?? '')
    } catch (error) {
      console.error('Failed to open ticket details:', error)
      setSelectedTicket(ticket)
      setTransferTo(ticket.assignedInstructor ?? '')
    }
  }

  const refreshSelectedTicket = async (ticketId: string) => {
    const fresh = await getTicket(ticketId)
    setSelectedTicket(fresh)
    return fresh
  }

  const handleAssignToMe = async (ticket: SupportTicket) => {
    setUpdatingTicket(true)
    try {
      await assignTicket(ticket.id, currentInstructor)
      const fresh = await refreshSelectedTicket(ticket.id)
      setTransferTo(fresh.assignedInstructor ?? '')
      await loadTickets()
    } catch (error) {
      console.error('Failed to assign ticket:', error)
    } finally {
      setUpdatingTicket(false)
    }
  }

  const handleTransfer = async (ticket: SupportTicket) => {
    if (!transferTo.trim()) {
      return
    }

    setUpdatingTicket(true)
    try {
      await transferTicket(ticket.id, transferTo.trim())
      await refreshSelectedTicket(ticket.id)
      await loadTickets()
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
      await addTicketMessage(ticket.id, {
        senderName: currentInstructor,
        senderRole: 'instructor',
        message: replyMessage.trim() || '📷 Screenshot(s) attached',
        screenshots: pendingScreenshots.length > 0 ? pendingScreenshots : undefined,
      })
      setReplyMessage('')
      setPendingScreenshots([])
      await refreshSelectedTicket(ticket.id)
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
        closedBy: currentInstructor,
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">{openCount} open tickets need your attention</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Instructor</span>
          <input
            value={currentInstructor}
            onChange={(e) => setCurrentInstructor(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'unassigned', 'open', 'mine', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f === 'resolved' ? 'closed' : f} {f === 'open' ? `(${openCount})` : ''}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl">No tickets found.</div>
        ) : tickets.map(ticket => (
          <button key={ticket.id} onClick={() => handleOpenTicket(ticket)} className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-2 gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                <StatusBadge status={ticket.status} />
                {ticket.assignedInstructor ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Assigned: {ticket.assignedInstructor}
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">Unassigned</span>
                )}
              </div>
              <span className="text-[11px] text-gray-400">Raised: {formatTicketDate(ticket.createdAt)}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{ticket.subject}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.reason}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                <span>{ticket.studentName}</span><span>·</span><span>{ticket.cohort || 'No cohort'}</span><span>·</span><span>{ticket.screenshots.length} screenshot(s)</span>
                <span>·</span><span>{ticket.messages?.length ?? 0} message(s)</span>
                {ticket.resolvedBy && <><span>·</span><span>Resolved by {ticket.resolvedBy}</span></>}
              </div>
              {ticket.status === 'open' && (
                <span className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  Reply <ArrowUpRight className="w-3 h-3" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {!loading && pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} tickets)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedTicket && (
        /* ── Intercom-style popup ticket chat panel ── */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="w-[min(92vw,1120px)] h-[min(82vh,640px)] flex rounded-2xl shadow-2xl overflow-hidden bg-white">
          {/* ── Left sidebar: ticket metadata + controls ── */}
          <div className="w-[280px] flex-shrink-0 border-r border-gray-800 bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a] flex flex-col overflow-y-auto">
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
                    <a key={`init-${i}`} href={shot.dataUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-gray-700">
                      <img src={shot.dataUrl} alt={shot.fileName} className="w-full h-28 object-cover" />
                    </a>
                  ))}
                </div>
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
                  <div className="flex gap-1.5">
                    <input
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="Transfer to..."
                      className="flex-1 border border-gray-700 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                    />
                    <button
                      onClick={() => handleTransfer(selectedTicket)}
                      disabled={updatingTicket || !transferTo.trim()}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-700 bg-gray-800 text-xs font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      Transfer
                    </button>
                  </div>
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
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium mb-0.5">{selectedTicket.studentName} · {selectedTicket.cohort || 'No cohort'}</p>
                <h2 className="text-base font-bold text-gray-900 truncate">{selectedTicket.subject}</h2>
              </div>
              {updatingTicket && <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Original ticket reason as first "message" */}
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[72%]">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                    {selectedTicket.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">{selectedTicket.studentName}</span>
                      <span className="text-[10px] text-gray-400">{formatTicketDate(selectedTicket.createdAt)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTicket.reason}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              {(selectedTicket.messages ?? []).map((msg, index) => {
                const isInstructor = msg.senderRole === 'instructor'
                return (
                  <div key={`${selectedTicket.id}-${index}`} className={`flex ${isInstructor ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[72%] ${isInstructor ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isInstructor ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                      <div className={isInstructor ? 'items-end flex flex-col' : ''}>
                        <div className={`flex items-baseline gap-2 mb-1 ${isInstructor ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs font-semibold text-gray-700">{msg.senderName}</span>
                          <span className="text-[10px] text-gray-400">{formatTicketDate(msg.timestamp)}</span>
                        </div>
                        <div className={`rounded-2xl px-4 py-3 ${isInstructor ? 'bg-gray-900 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                          {msg.message !== '📷 Screenshot(s) attached' && (
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          )}
                          {msg.screenshots && msg.screenshots.length > 0 && (
                            <div className={`grid gap-2 ${msg.screenshots.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${msg.message !== '📷 Screenshot(s) attached' ? 'mt-2' : ''}`}>
                              {msg.screenshots.map((shot, si) => (
                                <a key={si} href={shot.dataUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden">
                                  <img src={shot.dataUrl} alt={shot.fileName} className="w-full h-36 object-cover" />
                                </a>
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
                <div className="flex justify-center">
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-4 py-1.5 text-xs font-semibold">
                    Ticket closed by {selectedTicket.resolvedBy || 'instructor'}
                    {selectedTicket.resolutionNote && ` — ${selectedTicket.resolutionNote}`}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            {selectedTicket.status === 'open' && (
              <div className="border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0">
                {/* Pending screenshot thumbnails */}
                {pendingScreenshots.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {pendingScreenshots.map((shot, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                        <img src={shot.dataUrl} alt={shot.fileName} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setPendingScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] leading-none"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
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
                    placeholder="Write a reply… (Enter to send, Shift+Enter for new line)"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 resize-none leading-relaxed"
                    style={{ minHeight: '42px', maxHeight: '120px', overflowY: 'auto' }}
                  />
                  <label className="flex-shrink-0 w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <input ref={replyFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePickReplyScreenshots} />
                  </label>
                  <button
                    onClick={() => handleSendMessage(selectedTicket)}
                    disabled={updatingTicket || (!replyMessage.trim() && pendingScreenshots.length === 0)}
                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center hover:from-black hover:to-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
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
   Q&A PROPOSALS VIEW
   ═══════════════════════════════════════ */

function QAProposalsView() {
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

  // Handle approve/reject actions
  const handleApprove = async (id: string) => {
    try {
      await approveProposal(id)
      setUploadFeedback({ type: 'success', msg: 'Proposal approved and added to knowledge base!' })
      loadProposals()
    } catch (error) {
      console.error('Failed to approve:', error)
      setUploadFeedback({ type: 'error', msg: 'Failed to approve proposal.' })
    }
    setTimeout(() => setUploadFeedback(null), 4000)
  }

  const handleReject = async (id: string) => {
    try {
      await rejectProposal(id)
      setUploadFeedback({ type: 'success', msg: 'Proposal rejected.' })
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
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Bulk Upload
            </button>
            <input ref={fileInputRef} placeholder="placeholder" title="title" type="file" accept=".json" className="hidden" onChange={handleJsonUpload} />

            {/* Format Guide Popup */}
            {showFormatGuide && (
              <div className="absolute right-0 top-full mt-2 w-[380px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="bg-gray-900 text-white px-5 py-3 flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold">Bulk Upload Format</span>
                </div>
                <div className="p-5">
                  <p className="text-xs text-gray-500 mb-3">Upload a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">.json</code> file with this format:</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-[12px] text-gray-700 leading-relaxed">
                    <span className="text-gray-400">[</span>{'\n'}
                    {'  '}<span className="text-gray-400">{'{'}</span>{'\n'}
                    {'    '}<span className="text-blue-600">"title"</span>: <span className="text-emerald-600">"HP Deduction Policy"</span>,{'\n'}
                    {'    '}<span className="text-blue-600">"question"</span>: <span className="text-emerald-600">"What is the HP deduction?"</span>,{'\n'}
                    {'    '}<span className="text-blue-600">"answer"</span>: <span className="text-emerald-600">"5 HP per missed deadline"</span>{'\n'}
                    {'  '}<span className="text-gray-400">{'}'}</span>,{'\n'}
                    {'  '}<span className="text-gray-400">{'{'}...{'}'}</span>{'\n'}
                    <span className="text-gray-400">]</span>
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Each object must have <strong>question</strong> and <strong>answer</strong> fields. Title is optional. All entries will be submitted as pending proposals.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* New Proposal */}
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gray-900 px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Proposal
          </button>
        </div>
      </div>

      {/* Upload Feedback */}
      {uploadFeedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          uploadFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {uploadFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {uploadFeedback.msg}
        </div>
      )}

      {/* Proposal Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Propose New Q&A Pair</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Short descriptive title, e.g. 'HP Deduction Policy'" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Question</label>
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What question should Vi-Sakha answer?" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Answer</label>
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="The correct answer Vi-Sakha should give..." rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-4 py-2 hover:text-gray-700">Cancel</button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
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
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Question</th>
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Title</th>
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
              <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Loading proposals...</p>
                </td>
              </tr>
            ) : proposals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                  No proposals found. Create one using the button above!
                </td>
              </tr>
            ) : (
              proposals.map(row => (
                <tr key={row._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{row.question}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{row.answer}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{row.title || '-'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-400">{formatDate(row.createdAt)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={row.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    {row.status === 'pending' && (
                      <div className="flex gap-1.5 justify-end">
                        <button 
                          onClick={() => handleApprove(row._id)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleReject(row._id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   ANALYTICS VIEW
   ═══════════════════════════════════════ */

function AnalyticsView() {
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)

  useEffect(() => {
    async function loadTicketStats() {
      try {
        const stats = await getTicketStats()
        setTicketStats(stats)
      } catch (error) {
        console.error('Failed to load ticket stats:', error)
      }
    }

    loadTicketStats()
  }, [])

  const barData = [
    { label: 'Mon', value: 32 }, { label: 'Tue', value: 45 }, { label: 'Wed', value: 28 },
    { label: 'Thu', value: 56 }, { label: 'Fri', value: 41 }, { label: 'Sat', value: 18 }, { label: 'Sun', value: 12 },
  ]
  const maxBar = Math.max(...barData.map(d => d.value))

  const topicData = [
    { topic: 'ViBe Issues', pct: 28 }, { topic: 'HP Queries', pct: 21 }, { topic: 'Case Studies', pct: 18 },
    { topic: 'Deadlines', pct: 15 }, { topic: 'Discord/Access', pct: 10 }, { topic: 'Other', pct: 8 },
  ]

  const cohortData = [
    { cohort: 'Euclideans', queries: 42, resolved: 38, color: '#6366f1' },
    { cohort: 'Dijkstrians', queries: 35, resolved: 30, color: '#06b6d4' },
    { cohort: 'Kruskalians', queries: 28, resolved: 25, color: '#10b981' },
    { cohort: 'AKSians', queries: 31, resolved: 27, color: '#f59e0b' },
    { cohort: 'RSAians', queries: 24, resolved: 19, color: '#ef4444' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Vi-Sakha performance and student engagement</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Queries', value: '1,247', change: '+12%', icon: MessagesSquare, color: 'bg-blue-50 text-blue-600' },
          { label: 'AI Resolution', value: '87%', change: '+3%', icon: Bot, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Avg Response', value: '1.2s', change: '-0.3s', icon: Clock, color: 'bg-purple-50 text-purple-600' },
          {
            label: 'Ticket Resolution',
            value: ticketStats ? `${ticketStats.resolutionRate}%` : '—',
            change: ticketStats ? `${ticketStats.resolved}/${ticketStats.total}` : '—',
            icon: Ticket,
            color: 'bg-amber-50 text-amber-600',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${kpi.color}`}><kpi.icon className="w-5 h-5" /></div>
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600"><TrendingUp className="w-3 h-3" />{kpi.change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Ticket Health</h3>
        <p className="text-xs text-gray-400 mb-4">Live support ticket metrics</p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Open</p>
            <p className="text-2xl font-bold text-amber-600">{ticketStats?.open ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Resolved</p>
            <p className="text-2xl font-bold text-emerald-600">{ticketStats?.resolved ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Avg Resolution Time</p>
            <p className="text-2xl font-bold text-gray-900">{ticketStats ? `${ticketStats.avgResolutionHours}h` : '—'}</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>Resolution Rate</span>
            <span>{ticketStats?.resolutionRate ?? 0}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${ticketStats?.resolutionRate ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Daily Queries</h3>
          <p className="text-xs text-gray-400 mb-6">This week</p>
          <div className="flex items-end gap-3 h-40">
            {barData.map(bar => (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-500">{bar.value}</span>
                <div className="w-full bg-blue-500 rounded-t-lg transition-all duration-500 hover:bg-blue-600" style={{ height: `${(bar.value / maxBar) * 100}%`, minHeight: '8px' }} />
                <span className="text-[10px] text-gray-400">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Query Topics</h3>
          <p className="text-xs text-gray-400 mb-6">Distribution this month</p>
          <div className="space-y-3">
            {topicData.map(t => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-28 truncate">{t.topic}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${t.pct}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-gray-500 w-8 text-right">{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cohort Performance */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Cohort Performance</h3>
        <p className="text-xs text-gray-400 mb-6">Queries vs AI-resolved per cohort</p>
        <div className="grid grid-cols-5 gap-4">
          {cohortData.map(c => (
            <div key={c.cohort} className="text-center">
              <div className="relative h-32 mb-3 flex items-end justify-center gap-1.5">
                <div className="w-6 rounded-t-md transition-all" style={{ height: `${(c.queries / 50) * 100}%`, backgroundColor: c.color, opacity: 0.3 }} />
                <div className="w-6 rounded-t-md transition-all" style={{ height: `${(c.resolved / 50) * 100}%`, backgroundColor: c.color }} />
              </div>
              <p className="text-xs font-semibold text-gray-700">{c.cohort}</p>
              <p className="text-[10px] text-gray-400">{Math.round((c.resolved / c.queries) * 100)}% resolved</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/30" /> Total Queries</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> AI Resolved</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════ */

export default function LabMemberDashboard() {
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

  // Dynamic sidebar items with real counts
  const sidebarItems: { icon: typeof Users; label: string; view: View; badge?: string }[] = [
    { icon: Users, label: 'Students', view: 'home' },
    { icon: MessagesSquare, label: 'Conversations', view: 'conversations', badge: sidebarStats.activeConversations > 0 ? String(sidebarStats.activeConversations) : undefined },
    { icon: Ticket, label: 'Tickets', view: 'tickets', badge: sidebarStats.openTickets > 0 ? String(sidebarStats.openTickets) : undefined },
    { icon: MessageSquarePlus, label: 'Q&A Proposals', view: 'qa', badge: sidebarStats.pendingProposals > 0 ? String(sidebarStats.pendingProposals) : undefined },
    { icon: BarChart3, label: 'Analytics', view: 'analytics' },
  ]

  return (
    <div className="flex h-screen bg-white font-['Inter']">
      {/* ── Left Sidebar (light — matching student dashboard) ── */}
      <aside className="w-[220px] bg-[#FAF9F6] border-r border-gray-200 flex flex-col justify-between py-3 flex-shrink-0">
        <div>
          {/* Logo + Role Badge */}
          <div className="px-4 mb-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="bg-gray-900 rounded-lg px-2 py-1.5">
                <span className="text-white font-bold text-xs tracking-tight">VS</span>
              </div>
              <div>
                <span className="text-gray-900 text-sm font-semibold block leading-tight">Vi-Sakha</span>
                <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium">Lab Member</span>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="space-y-0.5 px-2">
            {sidebarItems.map(item => (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === item.view
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-blue-100 text-blue-700 text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Nav */}
        <nav className="space-y-0.5 px-2">
          {bottomItems.map(item => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-white/60 transition-colors"
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && <span className="text-[11px] text-gray-400">{item.shortcut}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Banner — dismissable */}
        {showBanner && (
          <div className="bg-[#F5EFE7] border-b border-[#E8DFD3] px-6 py-2.5 flex items-center justify-between text-sm">
            <p className="text-gray-700">
              <span className="font-semibold">Lab Member Dashboard</span> — VLED Lab, IIT Ropar
            </p>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Logged in as <span className="text-gray-700 font-medium">Lab Member</span></span>
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

        <div className="max-w-5xl mx-auto px-8 py-8">
          {activeView === 'home' && <StudentsHomeView />}
          {activeView === 'conversations' && <ConversationsView />}
          {activeView === 'tickets' && <TicketsView />}
          {activeView === 'qa' && <QAProposalsView />}
          {activeView === 'analytics' && <AnalyticsView />}
        </div>
      </main>
    </div>
  )
}
