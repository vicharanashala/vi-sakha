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
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
} from 'lucide-react'
import {
  fetchProposals,
  createProposal,
  createBulkProposals,
  approveProposal,
  rejectProposal,
  type QaProposal,
  getConversations,
  getConversation,
  getChatStats,
  resolveConversation,
  type Conversation,
  type ChatMessage,
  type ChatStats,
} from '../lib/api'

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

const mockTickets = [
  { id: 'TKT-001', student: 'Meera D.', cohort: 'Dijkstrians', subject: 'ViBe platform crash on case study 4', priority: 'high', status: 'open', created: '2026-03-09 13:20', messages: 2 },
  { id: 'TKT-002', student: 'Karan S.', cohort: 'AKSians', subject: 'Incorrect HP deduction — submitted before deadline', priority: 'high', status: 'open', created: '2026-03-09 12:10', messages: 4 },
  { id: 'TKT-003', student: 'Rohit G.', cohort: 'RSAians', subject: 'Express case study 7 — test runner issue', priority: 'medium', status: 'open', created: '2026-03-08 22:15', messages: 3 },
  { id: 'TKT-004', student: 'Ananya B.', cohort: 'Euclideans', subject: 'Need extension for React module deadline', priority: 'low', status: 'resolved', created: '2026-03-07 09:30', messages: 5 },
  { id: 'TKT-005', student: 'Vikram N.', cohort: 'Kruskalians', subject: 'Cannot access MongoDB Atlas cluster', priority: 'medium', status: 'resolved', created: '2026-03-06 16:45', messages: 3 },
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
  const [filterType, setFilterType] = useState<'all' | 'active' | 'resolved' | 'escalated'>('all')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState<ChatStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<{
    conversation: Conversation;
    messages: ChatMessage[];
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Fetch conversations and stats
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [convResult, statsResult] = await Promise.all([
          getConversations(filterType !== 'all' ? { status: filterType } : undefined),
          getChatStats(),
        ])
        setConversations(convResult.conversations)
        setStats(statsResult)
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [filterType])

  // Open conversation detail
  const openConversation = async (conv: Conversation) => {
    setDetailLoading(true)
    try {
      const result = await getConversation(conv.id)
      setSelectedConversation(result)
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  // Mark conversation as resolved
  const handleResolve = async (conv: Conversation) => {
    try {
      await resolveConversation(conv.id)
      // Refresh conversations
      const result = await getConversations(filterType !== 'all' ? { status: filterType } : undefined)
      setConversations(result.conversations)
      if (selectedConversation?.conversation.id === conv.id) {
        setSelectedConversation(null)
      }
    } catch (error) {
      console.error('Failed to resolve conversation:', error)
    }
  }

  // Format date
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

  const getStatusColor = (status: Conversation['status']) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-500'
      case 'escalated': return 'bg-red-500'
      default: return 'bg-amber-500'
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chatbot Conversations</h1>
          <p className="text-sm text-gray-500 mt-1">Review student interactions with Vi-Sakha</p>
        </div>
        <button className="inline-flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Conversations', value: stats?.totalConversations ?? '—', icon: MessagesSquare, color: 'text-blue-600 bg-blue-50' },
          { label: 'Resolved by AI', value: stats?.resolvedConversations ?? '—', icon: Bot, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Needs Review', value: stats?.escalatedConversations ?? '—', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
          { label: 'Avg Confidence', value: stats?.averageConfidence !== undefined ? `${normalizeConfidence(stats.averageConfidence)}%` : '—', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
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

      {/* Feedback Stats */}
      {stats && (
        <div className="flex items-center gap-6 mb-4 px-4 py-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-gray-700">{stats.totalLikes} helpful</span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-gray-700">{stats.totalDislikes} unhelpful</span>
          </div>
          <div className="text-sm text-gray-500">
            {stats.totalMessages} total messages
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'active', 'resolved', 'escalated'] as const).map(f => (
          <button key={f} onClick={() => setFilterType(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filterType === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f}
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
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getStatusColor(conv.status)}`}>
                  {conv.studentName?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{conv.studentName || 'Unknown Student'}</span>
                    <span className="text-[11px] text-gray-400">· {conv.cohort || 'No cohort'} · {conv.messageCount} msgs</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.lastMessagePreview || 'No messages'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-gray-400">{formatDate(conv.lastMessageAt)}</span>
                    {conv.averageConfidence !== undefined && (
                      <span className={`text-[11px] font-medium ${normalizeConfidence(conv.averageConfidence)! >= 80 ? 'text-emerald-600' : normalizeConfidence(conv.averageConfidence)! >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                        {normalizeConfidence(conv.averageConfidence)}% confidence
                      </span>
                    )}
                    {/* Feedback indicators */}
                    {(conv.likeCount > 0 || conv.dislikeCount > 0) && (
                      <div className="flex items-center gap-2">
                        {conv.likeCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-emerald-600">
                            <ThumbsUp className="w-3 h-3" /> {conv.likeCount}
                          </span>
                        )}
                        {conv.dislikeCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-red-500">
                            <ThumbsDown className="w-3 h-3" /> {conv.dislikeCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={conv.status} />
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conversation Detail Modal */}
      {(selectedConversation || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {detailLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-gray-500">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${getStatusColor(selectedConversation!.conversation.status)}`}>
                      {selectedConversation!.conversation.studentName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">{selectedConversation!.conversation.studentName}</h2>
                      <p className="text-xs text-gray-500">{selectedConversation!.conversation.cohort} · {selectedConversation!.conversation.messageCount} messages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedConversation!.conversation.status} />
                    {selectedConversation!.conversation.status === 'active' && (
                      <button
                        onClick={() => handleResolve(selectedConversation!.conversation)}
                        className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </>
              )}
              <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-gray-100 rounded-xl" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            {!detailLoading && selectedConversation && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3' : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3'}`}>
                      <div className="text-sm">
                        {msg.role === 'assistant' ? renderMarkdown(msg.content) : <p className="whitespace-pre-wrap">{msg.content}</p>}
                      </div>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            {msg.confidence !== undefined && (
                              <span className={`text-[10px] font-medium ${msg.confidence >= 0.8 ? 'text-emerald-600' : msg.confidence >= 0.6 ? 'text-amber-600' : 'text-red-500'}`}>
                                {Math.round(msg.confidence * 100)}% confident
                              </span>
                            )}
                            {msg.sources && msg.sources.length > 0 && (
                              <span className="text-[10px] text-gray-400">{msg.sources.length} sources</span>
                            )}
                          </div>
                          {/* Feedback indicator */}
                          {msg.feedback && (
                            <span className={`flex items-center gap-1 text-[10px] ${msg.feedback === 'like' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {msg.feedback === 'like' ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                              {msg.feedback === 'like' ? 'Helpful' : 'Unhelpful'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer with stats */}
            {!detailLoading && selectedConversation && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Started: {new Date(selectedConversation.conversation.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3 text-emerald-500" /> {selectedConversation.conversation.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3 text-red-400" /> {selectedConversation.conversation.dislikeCount}
                  </span>
                  {selectedConversation.conversation.averageConfidence !== undefined && (
                    <span>Avg confidence: {normalizeConfidence(selectedConversation.conversation.averageConfidence)}%</span>
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
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? mockTickets : mockTickets.filter(t => t.status === filter)
  const openCount = mockTickets.filter(t => t.status === 'open').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">{openCount} open tickets need your attention</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {['all', 'open', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f} {f === 'open' ? `(${openCount})` : ''}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(ticket => (
          <div key={ticket.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">{ticket.id}</span>
                <StatusBadge status={ticket.status} />
                <StatusBadge status={ticket.priority} />
              </div>
              <span className="text-[11px] text-gray-400">{ticket.created}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{ticket.subject}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{ticket.student}</span><span>·</span><span>{ticket.cohort}</span><span>·</span><span>{ticket.messages} messages</span>
              </div>
              {ticket.status === 'open' && (
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  Reply <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
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
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> New Proposal
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
          { label: 'Active Students', value: '423', change: '+8%', icon: Users, color: 'bg-amber-50 text-amber-600' },
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
        const [chatStats, proposalsResult] = await Promise.all([
          getChatStats(),
          fetchProposals(),
        ])
        setSidebarStats({
          activeConversations: chatStats.activeConversations,
          openTickets: 3, // TODO: Replace with real ticket count when implemented
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
