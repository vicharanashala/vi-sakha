import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, clearAuth } from '@/lib/auth'
import {
  MessageCircle,
  Ticket,
  ClipboardList,
  BookOpen,
  HelpCircle,
  Settings,
  LogOut,
  ChevronLeft,
  ArrowUpRight,
  X,
  Loader2,
  Paperclip,
  CheckCircle2,
  Send,
  Plus,
  ChevronDown,
  ExternalLink,
  Search,
} from 'lucide-react'
import { ChatView } from '@/components/chat/ChatView'
import {
  createTicket,
  getTickets,
  getTicket,
  getTicketMessages,
  addTicketMessage,
  subscribeToTicketMessages,
  getStudentConversations,
  createChatConversation,
  deleteChatConversation,
  type SupportTicket,
  type TicketMessage,
  type TicketScreenshot,
  type Conversation,
} from '@/lib/api'

type StudentView =
  | 'Chat'
  | 'Raise Ticket'
  | 'My Tickets'
  | 'Resources'
  | 'FAQ'
  | 'Settings'

function TicketStatusPill({ status }: { status: 'open' | 'resolved' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
        status === 'resolved'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      {status}
    </span>
  )
}

function formatDate(date?: string) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function sortTicketMessagesAsc(messages: TicketMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const authUser = getUser()
  const [activeItem, setActiveItem] = useState<StudentView>('Chat')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<Conversation[]>([])
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketLoading, setTicketLoading] = useState(false)
  const [subject, setSubject] = useState('')
  const [reason, setReason] = useState('')
  const [screenshots, setScreenshots] = useState<TicketScreenshot[]>([])
  const [ticketSubmitting, setTicketSubmitting] = useState(false)
  const [ticketFeedback, setTicketFeedback] = useState<string | null>(null)
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [ticketReply, setTicketReply] = useState('')
  const [ticketUpdating, setTicketUpdating] = useState(false)
  const [pendingReplyScreenshots, setPendingReplyScreenshots] = useState<TicketScreenshot[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)

  const studentInfo = {
    studentId: authUser?.id ?? '',
    studentName: authUser?.name ?? 'Student',
    studentEmail: authUser?.email ?? '',
    cohort: '',
  }

  const loadChatHistory = async () => {
    setChatHistoryLoading(true)
    try {
      const convos = await getStudentConversations(studentInfo.studentId)
      setChatHistory(convos)
    } catch {
      // silent — sidebar is non-critical
    } finally {
      setChatHistoryLoading(false)
    }
  }

  const handleNewChat = async () => {
    try {
      const { conversationId } = await createChatConversation(studentInfo)
      setActiveChatId(conversationId)
      setActiveItem('Chat')
      await loadChatHistory()
    } catch {
      console.error('Failed to create new chat')
    }
  }

  const handleDeleteChat = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
    setDeletingChatId(conversationId)
    try {
      await deleteChatConversation(conversationId)
      setChatHistory((prev) => prev.filter((c) => c.id !== conversationId))
      if (activeChatId === conversationId) setActiveChatId(null)
    } catch {
      console.error('Failed to delete conversation')
    } finally {
      setDeletingChatId(null)
    }
  }

  const fetchMyTickets = async () => {
    setTicketLoading(true)
    try {
      const result = await getTickets({ studentId: studentInfo.studentId })
      setTickets(result)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setTicketLoading(false)
    }
  }

  useEffect(() => {
    fetchMyTickets()
    loadChatHistory()
  }, [])

  const openTickets = tickets.filter((ticket) => ticket.status === 'open').length

  const filteredTickets = useMemo(() => {
    if (ticketFilter === 'all') return tickets
    return tickets.filter((ticket) => ticket.status === ticketFilter)
  }, [ticketFilter, tickets])

  const onPickFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    const picked = await Promise.all(
      files.slice(0, 4).map(async (file) => ({
        fileName: file.name,
        mimeType: file.type || 'image/png',
        dataUrl: await fileToDataUrl(file),
      })),
    )
    setScreenshots((prev) => [...prev, ...picked].slice(0, 4))
    event.target.value = ''
  }

  const submitTicket = async () => {
    if (!subject.trim() || !reason.trim()) {
      setTicketFeedback('Subject and reason are required.')
      return
    }
    setTicketSubmitting(true)
    try {
      await createTicket({
        studentName: studentInfo.studentName,
        studentEmail: studentInfo.studentEmail,
        cohort: studentInfo.cohort,
        subject: subject.trim(),
        reason: reason.trim(),
        screenshots,
      })
      setTicketFeedback('Ticket created successfully.')
      setSubject('')
      setReason('')
      setScreenshots([])
      await fetchMyTickets()
      setActiveItem('My Tickets')
    } catch (error) {
      console.error('Failed to create ticket:', error)
      setTicketFeedback('Failed to create ticket. Please try again.')
    } finally {
      setTicketSubmitting(false)
      setTimeout(() => setTicketFeedback(null), 3000)
    }
  }

  const openTicketDetail = async (ticket: SupportTicket) => {
    try {
      const [detailed, history] = await Promise.all([
        getTicket(ticket.id),
        getTicketMessages(ticket.id, { page: 1, limit: 100 }),
      ])
      setSelectedTicket({
        ...detailed,
        messages: sortTicketMessagesAsc(history.data),
        messagesPagination: history.pagination,
      })
    } catch (error) {
      console.error('Failed to fetch ticket detail:', error)
      setSelectedTicket(ticket)
    }
  }

  useEffect(() => {
    if (!selectedTicket?.id) return
    const unsubscribe = subscribeToTicketMessages(selectedTicket.id, (message) => {
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
    return () => { unsubscribe() }
  }, [selectedTicket?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedTicket?.messages])

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
    setPendingReplyScreenshots((prev) => [...prev, ...picked].slice(0, 4))
    e.target.value = ''
  }

  const sendStudentTicketReply = async () => {
    if (!selectedTicket || (!ticketReply.trim() && pendingReplyScreenshots.length === 0)) return
    setTicketUpdating(true)
    try {
      const updated = await addTicketMessage(selectedTicket.id, {
        message: ticketReply.trim() || '📷 Screenshot(s) attached',
        screenshots: pendingReplyScreenshots.length > 0 ? pendingReplyScreenshots : undefined,
      })
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== updated.id) return prev
        return {
          ...prev,
          ...updated,
          messages: sortTicketMessagesAsc(updated.messages ?? []),
        }
      })
      setTicketReply('')
      setPendingReplyScreenshots([])
      await fetchMyTickets()
    } catch (error) {
      console.error('Failed to send ticket reply:', error)
    } finally {
      setTicketUpdating(false)
    }
  }

  // ── Render functions ───────────────────────────────────────────────────────

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Account</h2>
        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Name</label>
            <p className="mt-1 text-sm font-medium text-gray-900">{authUser?.name || '—'}</p>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</label>
            <p className="mt-1 text-sm font-medium text-gray-900">{authUser?.email || '—'}</p>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Role</label>
            <p className="mt-1 text-sm font-medium text-gray-900 capitalize">{authUser?.role || '—'}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Danger Zone</h2>
        <button
          onClick={() => { clearAuth(); navigate('/login') }}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  const renderResources = () => (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <p className="mt-1 text-sm text-gray-500">Quick access to essential Vinternship platforms and guides.</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[
          { title: 'Vinternship Website', desc: 'Main site with milestones, FAQ & dashboard', url: 'https://sudarshansudarshan.github.io/vinternship/', color: 'from-blue-500 to-indigo-600' },
          { title: 'ViBe Platform', desc: 'Online learning platform for MERN modules', url: 'https://vibe.vicharanashala.ai/auth', color: 'from-emerald-500 to-teal-600' },
          { title: 'ViSakha Support', desc: 'AI-powered support assistant for queries', url: 'https://sakha.vicharanashala.ai/', color: 'from-violet-500 to-purple-600' },
          { title: 'Case Studies', desc: 'Hands-on MERN coding exercises by technology', url: 'https://sudarshansudarshan.github.io/vinternship/', color: 'from-orange-500 to-amber-600' },
          { title: 'Live Session Recordings', desc: 'YouTube playlist of all recorded sessions', url: 'https://www.youtube.com/playlist?list=PL4ocL5uCKzQOv6Pu81GwG2Q28cViFK3QV', color: 'from-red-500 to-rose-600' },
          { title: 'Discord Community', desc: 'Join breakout rooms and discussion channels', url: 'https://discord.com/invite/BrdzTSmMxN', color: 'from-sky-500 to-cyan-600' },
        ].map((link) => (
          <a key={link.title} href={link.url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center mb-3 shadow-sm`}>
              <ExternalLink className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{link.title}</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{link.desc}</p>
          </a>
        ))}
      </div>

      {/* Protocols & Policies */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">Protocols & Policies</h2>
      <div className="space-y-3 mb-10">
        {[
          { title: 'Support Resolution Path', desc: '1) Check FAQ & ViSakha → 2) Discord support desk (response within 2 hrs, 9 AM–9 PM) → 3) Follow-up ticket after 24 hrs → 4) Email escalation after 48 hrs.' },
          { title: 'Completion Criteria', desc: 'Complete all ViBe modules, finish case studies, pass peer endorsement (viva), and contribute to a real-time project.' },
          { title: 'Ejection Policy', desc: 'Automated algorithm-based removal if daily ViBe progress < 3.33% AND you fall in the bottom 10% of the cohort. Forward eject rewards top performers.' },
          { title: 'Discontinuation Policy', desc: 'Prolonged inactivity leads to administrative removal. Appeals accepted via the official form. Rejoining is possible with a valid reason.' },
          { title: 'Health Points', desc: 'Earned through ViBe progress, case study completion, endorsements, and project contributions. Penalties apply for audit failures.' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* GitHub Guide */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">GitHub & Project Guide</h2>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Use your <strong>registered name and email</strong> across all platforms (ViBe, GitHub, Zoom).</li>
          <li>• Project repos are listed on the <a href="https://sudarshansudarshan.github.io/vinternship/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Vinternship Projects page</a>.</li>
          <li>• Get mentor guidance before raising PRs. Contributions are evaluated by mentors for HP.</li>
          <li>• Case study submissions: compress multi-file lessons into a single ZIP before uploading.</li>
        </ul>
      </div>
    </div>
  )

  const faqData = [
    {
      category: 'Internship Overview',
      items: [
        { q: 'What is this internship about?', a: 'Vinternship is organized by VLED Lab at IIT Ropar in online mode. It\'s a comprehensive full-stack development internship focused on the MERN stack (MongoDB, Express.js, React, Node.js/TypeScript).' },
        { q: 'Is this internship time-bound or duration-based?', a: 'The internship follows a structured timeline with specific milestones and deliverables. The maximum duration is 2.5 months.' },
        { q: 'What is the mode of this internship?', a: 'The internship will be conducted in online mode only.' },
        { q: 'Are there fixed timings for live sessions?', a: 'The program includes scheduled live sessions, workshops, and mentorship meetings. Timings are conveyed in advance via the cohort-specific dashboard.' },
      ],
    },
    {
      category: 'Mode of Internship & Attendance',
      items: [
        { q: 'Is attendance tracked?', a: 'Attendance is NOT compulsory for all standups and live sessions. However, attendance is tracked for live session activities. Camera must be on for the session to count as full attendance.' },
        { q: 'Do I need to use a specific name or email?', a: 'Yes. Use the same registered name and email across all platforms (ViBe, GitHub, Zoom etc.) for automated tracking. For Discord, you can use personal mail with your name and a formal DP.' },
      ],
    },
    {
      category: 'Support & Resolution',
      items: [
        { q: 'Where do I raise my concern initially?', a: 'First try the FAQ and ViSakha (sakha.vicharanashala.ai). Check the Discord Announcement channel, then ask fellow interns in Breakout sessions. If unresolved, send to the Support desk in Discord. Responses within 2 hours (9 AM–9 PM).' },
        { q: 'What if I don\'t receive a response in 24 hours?', a: 'Raise a second ticket with subject: "Attention Please – Follow-up on Ticket #[Original Number]". This will be escalated to the Mentors Team for a voice call discussion.' },
        { q: 'What happens if I miss a deadline?', a: 'Failure to meet a task or milestone deadline may impact your Health Points and could lead to discontinuation from the cohort. Extensions are generally not provided unless explicitly communicated via appeal form.' },
        { q: 'Where can I find live session recordings?', a: 'Available on YouTube: https://www.youtube.com/playlist?list=PL4ocL5uCKzQOv6Pu81GwG2Q28cViFK3QV' },
      ],
    },
    {
      category: 'Completion & Certification',
      items: [
        { q: 'What are the program completion criteria?', a: 'Completion of all ViBe modules, case studies, Viva/endorsement for the Case Study, and contribution to real-time projects.' },
        { q: 'Will recommendation letters be provided?', a: 'Not guaranteed. You may request one from the course instructor after completing the internship, subject to their discretion based on performance.' },
      ],
    },
    {
      category: 'ViBe Platform',
      items: [
        { q: 'How do I log in to ViBe?', a: 'Go to vibe.vicharanashala.ai/auth → Sign up as a student with your registered email → Check the Notifications tab → Accept the course invite for your MERN Course.' },
        { q: 'Invite accepted but shows "No course enrolled"?', a: 'Ensure you\'re using the correct email. Try logging out and back in. Use personal Wi-Fi instead of college Wi-Fi. If issues persist, enable third-party cookies and change DNS to Google DNS (8.8.8.8 / 8.8.4.4).' },
        { q: 'Can I use a mobile or tablet?', a: 'No, only desktop/laptop is supported.' },
        { q: 'Videos are stuck or repeating?', a: 'Videos must be watched fully and in sequence. Camera and mic permissions must be enabled. Avoid switching tabs or staying idle. Use a quiet, well-lit environment.' },
      ],
    },
    {
      category: 'MERN Case Studies',
      items: [
        { q: 'What are Case Studies?', a: 'Structured, documentation-based lessons to apply ViBe training through hands-on coding. They cover TypeScript, React, Express.js, and MongoDB with real-world problem-solving.' },
        { q: 'Are Case Studies mandatory?', a: 'Yes. They are a required component for completing the Vinternship program after ViBe training and before the Projects phase.' },
        { q: 'How do I submit case studies?', a: 'Visit the submission form on your cohort-specific page. Fill in your details, select the technology and lesson number, and upload your solution file (.js, .ts, .txt, or .zip).' },
      ],
    },
    {
      category: 'Endorsement Network (PES)',
      items: [
        { q: 'What is the Self-Healing Endorsement Network?', a: 'A peer-driven evaluation system where interns endorse each other\'s learning. All endorsement chains must connect to a certified "Jedi" (Silver/Bronze/Gold ticket holder). Disconnected groups (floating islands) are invalid.' },
        { q: 'Is endorsement mandatory?', a: 'Yes. Every non-Jedi intern must receive one valid endorsement within the deadline to complete the internship.' },
        { q: 'What incentives exist?', a: 'When a new intern joins a valid endorsement group, every existing member receives a 5% health point increase. Poor endorsements can trigger audit cascades with 50% HP penalties.' },
      ],
    },
    {
      category: 'Health Points & Breakout Sessions',
      items: [
        { q: 'How do I access my Health Points?', a: 'Go to vinternship website → your Cohort page → Dashboard → Health Points tab → Individual HP.' },
        { q: 'When are Zoom breakout rooms opened?', a: 'Usually after standups (around 9:45 PM). Participation is optional. Announcements are made in Discord when rooms go live.' },
      ],
    },
    {
      category: 'Projects',
      items: [
        { q: 'Group or individual projects?', a: 'Depends on the project and feature. Reach out to mentors listed on the projects site for clarity.' },
        { q: 'Is the project phase necessary?', a: 'Yes, it is necessary for internship completion. You can continue working on projects after the internship based on mentor\'s discretion.' },
        { q: 'How to contribute to existing projects?', a: 'View git repositories on the projects site. Get guidance from mentors on usage and how to raise PRs.' },
      ],
    },
  ]

  const [faqSearch, setFaqSearch] = useState('')
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null)

  const renderFAQ = () => {
    const filtered = faqSearch.trim()
      ? faqData.map(cat => ({
          ...cat,
          items: cat.items.filter(it =>
            it.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
            it.a.toLowerCase().includes(faqSearch.toLowerCase())
          ),
        })).filter(cat => cat.items.length > 0)
      : faqData

    return (
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <p className="mt-1 text-sm text-gray-500">Everything you need to know about the Vinternship program.</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No questions match your search.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((cat, catIdx) => (
              <div key={cat.category}>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{cat.category}</h2>
                <div className="space-y-2">
                  {cat.items.map((item, itemIdx) => {
                    const globalIdx = catIdx * 100 + itemIdx
                    const isOpen = openFaqIdx === globalIdx
                    return (
                      <div key={globalIdx} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <button
                          onClick={() => setOpenFaqIdx(isOpen ? null : globalIdx)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                        >
                          <span className="text-sm font-semibold text-gray-800 pr-4">{item.q}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 pt-0">
                            <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer link */}
        <div className="mt-10 text-center">
          <a href="https://sudarshansudarshan.github.io/vinternship/faq/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
            View complete FAQ on Vinternship website <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    )
  }

  const renderRaiseTicket = () => (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Raise Ticket</h1>
        <p className="mt-1 text-sm text-gray-500">Share issue details and optional screenshots for lab review.</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600">Subject</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Short ticket title"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600">Reason</label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={5}
              placeholder="Describe the issue in detail. Include what you tried and what happened."
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600">Screenshots (optional)</label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <Paperclip className="h-4 w-4" /> Attach Images
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
            </label>
            {screenshots.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {screenshots.map((shot, index) => (
                  <div key={`${shot.fileName}-${index}`} className="relative overflow-hidden rounded-xl border border-gray-200">
                    <img src={shot.dataUrl} alt={shot.fileName} className="h-24 w-full object-cover" />
                    <button
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
                      onClick={() => setScreenshots((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {ticketFeedback && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">{ticketFeedback}</div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setActiveItem('My Tickets')} className="rounded-xl px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              View My Tickets
            </button>
            <button
              onClick={submitTicket}
              disabled={ticketSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {ticketSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderMyTickets = () => (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">Track all tickets, resolution status, and submitted screenshots.</p>
        </div>
      </div>
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['all', 'open', 'resolved'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setTicketFilter(filter)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              ticketFilter === filter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
      {ticketLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">No tickets found.</div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => openTicketDetail(ticket)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                  <TicketStatusPill status={ticket.status} />
                </div>
                <span className="text-[11px] text-gray-400">Raised: {formatDate(ticket.createdAt)}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{ticket.subject}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{ticket.reason}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>{ticket.screenshots.length} screenshot(s)</span>
                <span>{ticket.messages?.length ?? 0} message(s)</span>
                {ticket.assignedInstructor && <span>Assigned to: {ticket.assignedInstructor}</span>}
                {ticket.resolvedBy && <span>Resolved by: {ticket.resolvedBy}</span>}
                {ticket.resolvedAt && <span>Resolved at: {formatDate(ticket.resolvedAt)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="w-[min(92vw,1120px)] h-[min(82vh,640px)] flex rounded-2xl shadow-2xl overflow-hidden bg-white">
            {/* Left sidebar: ticket info */}
            <div className="w-[260px] flex-shrink-0 border-r border-gray-800 bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a] flex flex-col overflow-y-auto">
              <div className="px-4 py-3 border-b border-gray-800">
                <button
                  onClick={() => { setSelectedTicket(null); setPendingReplyScreenshots([]); setTicketReply('') }}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to tickets
                </button>
              </div>
              <div className="px-4 py-4 border-b border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-gray-500">{selectedTicket.ticketNumber}</span>
                  <TicketStatusPill status={selectedTicket.status} />
                </div>
                <h3 className="text-sm font-bold text-white leading-snug mb-3">{selectedTicket.subject}</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium w-16 flex-shrink-0">Raised</span>
                    <span className="text-gray-300">{formatDate(selectedTicket.createdAt)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium w-16 flex-shrink-0">Assigned</span>
                    <span className={selectedTicket.assignedInstructor ? 'text-emerald-400 font-medium' : 'text-amber-500'}>
                      {selectedTicket.assignedInstructor || 'Unassigned'}
                    </span>
                  </div>
                  {selectedTicket.resolvedBy && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 font-medium w-16 flex-shrink-0">Closed by</span>
                      <span className="text-gray-300">{selectedTicket.resolvedBy}</span>
                    </div>
                  )}
                </div>
              </div>
              {selectedTicket.screenshots.length > 0 && (
                <div className="px-4 py-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Screenshots</p>
                  <div className="space-y-2">
                    {selectedTicket.screenshots.map((shot, i) => (
                      <a key={`init-${i}`} href={shot.dataUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-gray-700">
                        <img src={shot.dataUrl} alt={shot.fileName} className="w-full h-24 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: chat panel */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Support Ticket</p>
                  <h2 className="text-base font-bold text-gray-900 truncate">{selectedTicket.subject}</h2>
                </div>
                {ticketUpdating && <Loader2 className="h-4 w-4 animate-spin text-gray-400 flex-shrink-0" />}
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="flex justify-end">
                  <div className="flex gap-3 max-w-[72%] flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                      {studentInfo.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="items-end flex flex-col">
                      <div className="flex items-baseline gap-2 mb-1 flex-row-reverse">
                        <span className="text-xs font-semibold text-gray-700">You</span>
                        <span className="text-[10px] text-gray-400">{formatDate(selectedTicket.createdAt)}</span>
                      </div>
                      <div className="bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                        <p className="text-sm whitespace-pre-wrap">{selectedTicket.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {(selectedTicket.messages ?? []).map((msg, index) => {
                  const isStudent = msg.senderRole === 'student'
                  if (msg.type === 'meeting' && msg.meetingLink) {
                    return (
                      <div key={`${selectedTicket.id}-${index}`} className="flex justify-center">
                        <div className="w-full max-w-sm rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                          <p className="text-sm font-bold text-indigo-900">Support Session Started</p>
                          <p className="mt-1 text-xs text-indigo-700">Instructor started a support session</p>
                          <a
                            href={msg.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Join Now <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={`${selectedTicket.id}-${index}`} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[72%] ${isStudent ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isStudent ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {msg.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div className={isStudent ? 'items-end flex flex-col' : ''}>
                          <div className={`flex items-baseline gap-2 mb-1 ${isStudent ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs font-semibold text-gray-700">{isStudent ? 'You' : msg.senderName}</span>
                            <span className="text-[10px] text-gray-400">{formatDate(msg.timestamp)}</span>
                          </div>
                          <div className={`rounded-2xl px-4 py-3 ${isStudent ? 'bg-gray-900 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
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

                {selectedTicket.status === 'resolved' && (
                  <div className="flex justify-center">
                    <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-4 py-1.5 text-xs font-semibold">
                      This ticket has been resolved by {selectedTicket.resolvedBy || 'the lab team'}
                      {selectedTicket.resolutionNote && ` — ${selectedTicket.resolutionNote}`}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {selectedTicket.status === 'open' && (
                <div className="border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0">
                  {pendingReplyScreenshots.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {pendingReplyScreenshots.map((shot, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                          <img src={shot.dataUrl} alt={shot.fileName} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setPendingReplyScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
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
                      value={ticketReply}
                      onChange={(e) => setTicketReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendStudentTicketReply()
                        }
                      }}
                      rows={1}
                      placeholder="Write a reply… (Enter to send, Shift+Enter for new line)"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 resize-none leading-relaxed"
                      style={{ minHeight: '42px', maxHeight: '120px', overflowY: 'auto' }}
                    />
                    <label className="flex-shrink-0 w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <input ref={replyFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePickReplyScreenshots} />
                    </label>
                    <button
                      onClick={sendStudentTicketReply}
                      disabled={ticketUpdating || (!ticketReply.trim() && pendingReplyScreenshots.length === 0)}
                      className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center hover:from-black hover:to-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
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

  // ── Sidebar nav items ──────────────────────────────────────────────────────

  const navItems = [
    { icon: Ticket, label: 'Raise Ticket' as StudentView, badge: '' },
    {
      icon: ClipboardList,
      label: 'My Tickets' as StudentView,
      badge: tickets.length > 0 ? String(tickets.length) : '',
      badgeAlert: openTickets > 0,
    },
    { icon: BookOpen, label: 'Resources' as StudentView, badge: '' },
    { icon: HelpCircle, label: 'FAQ' as StudentView, badge: '' },
  ]

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-[#212121]">
      {/* ── Dark sidebar ── */}
      <aside className="w-[260px] flex-shrink-0 flex flex-col bg-[#171717] border-r border-white/5">
        {/* Logo */}
        <div className="px-3 pt-4 pb-2">
          <Link to="/" className="flex items-center gap-2.5 px-2 py-2 mb-3">
            <div className="bg-white rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-900 font-bold text-xs tracking-tight">VS</span>
            </div>
            <span className="text-white font-semibold text-sm">Vi-Sakha</span>
          </Link>

          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            New Chat
          </button>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto px-2 py-1 min-h-0">
          {chatHistoryLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            </div>
          ) : chatHistory.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-6 text-center">No conversations yet</p>
          ) : (
            <>
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-3 py-2">Recent</p>
              {chatHistory.map((conv) => (
                <div
                  key={conv.id}
                  className="group relative"
                >
                  <button
                    onClick={() => { setActiveChatId(conv.id); setActiveItem('Chat') }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeChatId === conv.id && activeItem === 'Chat'
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                      <p className="truncate pr-5 text-[13px]">{conv.title || 'New Chat'}</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteChat(e, conv.id)}
                    disabled={deletingChatId === conv.id}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-600 hover:text-red-400 transition-all disabled:opacity-50"
                    aria-label="Delete conversation"
                  >
                    {deletingChatId === conv.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <X className="w-3 h-3" />
                    }
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Nav items */}
        <div className="px-2 py-2 border-t border-white/5">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveItem(item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeItem === item.label
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  item.badgeAlert ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bottom: Settings + user */}
        <div className="px-2 py-2 border-t border-white/5">
          <button
            onClick={() => navigate('/dashboard/settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeItem === 'Settings'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Settings
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[11px] text-white font-semibold flex-shrink-0">
              {(authUser?.name || 'S')[0].toUpperCase()}
            </div>
            <span className="flex-1 text-xs text-gray-400 truncate">{authUser?.name || 'Student'}</span>
            <button
              onClick={() => { clearAuth(); navigate('/login') }}
              className="text-gray-600 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 bg-white overflow-y-auto">
        {activeItem === 'Chat' && (
          <div className="h-full">
            <ChatView
              onRaiseTicket={() => setActiveItem('Raise Ticket')}
              studentInfo={studentInfo}
              activeConversationId={activeChatId}
              onConversationCreated={(id) => {
                setActiveChatId(id)
                loadChatHistory()
              }}
              onMessageSent={loadChatHistory}
            />
          </div>
        )}
        {activeItem === 'Raise Ticket' && renderRaiseTicket()}
        {activeItem === 'My Tickets' && renderMyTickets()}
        {activeItem === 'Settings' && renderSettings()}
        {activeItem === 'Resources' && renderResources()}
        {activeItem === 'FAQ' && renderFAQ()}
      </main>
    </div>
  )
}
