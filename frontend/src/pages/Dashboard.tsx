import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageCircle,
  Ticket,
  ClipboardList,
  BarChart3,
  BookOpen,
  Users,
  Search,
  Settings,
  User,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ArrowUpRight,
  X,
  Loader2,
  Paperclip,
  CheckCircle2,
  Send,
} from 'lucide-react'
import { ChatView } from '@/components/chat/ChatView'
import {
  createTicket,
  getTickets,
  getTicket,
  addTicketMessage,
  type SupportTicket,
  type TicketScreenshot,
} from '@/lib/api'

type StudentView =
  | 'Vi-Sakha Chat'
  | 'Raise Ticket'
  | 'My Tickets'
  | 'HP Dashboard'
  | 'Resources'
  | 'Cohort Info'

const bottomItems = [
  { icon: Search, label: 'Search', shortcut: '⌘ K' },
  { icon: Settings, label: 'Settings' },
  { icon: User, label: 'Profile' },
]

const onboardingSteps = [
  {
    title: 'Start a conversation with Vi-Sakha',
    description:
      'Ask any question about VInternship-ViBe modules, case studies, HP policies, deadlines, and more. Vi-Sakha is trained on the entire knowledge base.',
    cta: 'Chat with Vi-Sakha',
    link: 'https://sakha.vicharanashala.ai/',
    expanded: true,
  },
  {
    title: 'Check your ViBe progress and HP status',
    description: '',
    cta: '',
    link: 'https://sudarshansudarshan.github.io/vinternship/hp/',
  },
  {
    title: 'Raise your first ticket for lab review',
    description: '',
    cta: '',
  },
  {
    title: 'Browse FAQ and knowledge base',
    description: '',
    cta: '',
    link: 'https://sudarshansudarshan.github.io/vinternship/faq/',
  },
  {
    title: "Join your cohort's Discord channel",
    description: '',
    cta: '',
    link: 'https://discord.gg/BrdzTSmMxN',
  },
]

const goFurtherCards = [
  {
    title: 'ViBe Training Platform',
    description: 'Access your TypeScript, React, Express, MongoDB modules',
    href: 'https://sudarshansudarshan.github.io/vinternship/intro/',
  },
  {
    title: 'Case Studies & Projects',
    description: 'Practice MERN stack through hands-on problems',
    href: 'https://sudarshansudarshan.github.io/vinternship/case-studies/',
  },
  {
    title: 'Milestones & Deadlines',
    description: 'Track your cohort deadlines and completion criteria',
    href: 'https://sudarshansudarshan.github.io/vinternship/milestones/',
  },
]

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

export default function Dashboard() {
  const [activeItem, setActiveItem] = useState<StudentView>('Vi-Sakha Chat')
  const [showBanner, setShowBanner] = useState(true)
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
    studentId: 'student-001',
    studentName: 'Student',
    studentEmail: 'student@example.com',
    cohort: 'Euclideans',
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
  }, [])

  const openTickets = tickets.filter((ticket) => ticket.status === 'open').length

  const sidebarItems = [
    { icon: MessageCircle, label: 'Vi-Sakha Chat' as StudentView, badge: '' },
    { icon: Ticket, label: 'Raise Ticket' as StudentView, badge: '' },
    {
      icon: ClipboardList,
      label: 'My Tickets' as StudentView,
      badge: tickets.length > 0 ? String(tickets.length) : '',
    },
    { icon: BarChart3, label: 'HP Dashboard' as StudentView, badge: '' },
    { icon: BookOpen, label: 'Resources' as StudentView, badge: '' },
    { icon: Users, label: 'Cohort Info' as StudentView, badge: '' },
  ]

  const quickStats = [
    { label: 'All queries', count: 47, icon: '🌐' },
    { label: 'Vi-Sakha', count: 21, icon: '🤖' },
    { label: 'Tickets', count: tickets.length, icon: '🎫' },
    { label: 'Open Tickets', count: openTickets, icon: '🟠' },
    { label: 'Resolved', count: tickets.filter((ticket) => ticket.status === 'resolved').length, icon: '✅' },
  ]

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
        studentId: studentInfo.studentId,
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
      const detailed = await getTicket(ticket.id)
      setSelectedTicket(detailed)
    } catch (error) {
      console.error('Failed to fetch ticket detail:', error)
      setSelectedTicket(ticket)
    }
  }

  // Auto-scroll to latest message when ticket is open
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
    if (!selectedTicket || (!ticketReply.trim() && pendingReplyScreenshots.length === 0)) {
      return
    }

    setTicketUpdating(true)
    try {
      const updated = await addTicketMessage(selectedTicket.id, {
        senderName: studentInfo.studentName,
        senderRole: 'student',
        message: ticketReply.trim() || '📷 Screenshot(s) attached',
        screenshots: pendingReplyScreenshots.length > 0 ? pendingReplyScreenshots : undefined,
      })
      setSelectedTicket(updated)
      setTicketReply('')
      setPendingReplyScreenshots([])
      await fetchMyTickets()
    } catch (error) {
      console.error('Failed to send ticket reply:', error)
    } finally {
      setTicketUpdating(false)
    }
  }

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
        /* ── Intercom-style popup ticket chat (student view) ── */
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

            {/* Initial screenshots submitted with the ticket */}
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

          {/* Right: full chat panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium mb-0.5">Support Ticket</p>
                <h2 className="text-base font-bold text-gray-900 truncate">{selectedTicket.subject}</h2>
              </div>
              {ticketUpdating && <Loader2 className="h-4 w-4 animate-spin text-gray-400 flex-shrink-0" />}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Original ticket reason */}
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

              {/* Chat messages */}
              {(selectedTicket.messages ?? []).map((msg, index) => {
                const isStudent = msg.senderRole === 'student'
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

              {/* Resolved banner */}
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

            {/* Composer */}
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

  const renderOnboarding = () => (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <h1 className="text-[2rem] font-light text-gray-900 mb-8 tracking-tight">
        Get started with <span className="font-semibold">Vi-Sakha</span> support
      </h1>

      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        <span>Get set up · 0 / {onboardingSteps.length} steps</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-1">
          {onboardingSteps.map((step, i) => (
            <div key={i} className={`border border-gray-200 rounded-xl p-5 transition-colors hover:border-gray-300 ${step.expanded ? 'bg-white shadow-sm' : 'bg-gray-50/50'}`}>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                  {step.expanded && step.description && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{step.description}</p>}
                  {step.expanded && step.cta && (
                    <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                      {step.cta}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm h-fit">
          <div className="relative h-48 overflow-hidden">
            <img src="/beauty scene.jpg" alt="Stats" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center shadow-lg"><span className="text-lg">▶</span></div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-900">Query Channels</span>
              <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>
            <div className="space-y-2.5">
              {quickStats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3 text-sm">
                  <span className="text-base">{stat.icon}</span>
                  <span className="flex-1 text-gray-700">{stat.label}</span>
                  <span className="text-gray-400 font-medium">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Go further</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goFurtherCards.map((card) => (
            <a key={card.title} href={card.href} target="_blank" rel="noopener noreferrer" className="group border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all bg-white">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-white">
      <aside className="w-[220px] bg-[#FAF9F6] border-r border-gray-200 flex flex-col justify-between py-3 flex-shrink-0">
        <div>
          <div className="px-4 mb-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-gray-900 rounded-lg px-2 py-1.5"><span className="text-white font-bold text-xs tracking-tight">VS</span></div>
            </Link>
          </div>

          <nav className="space-y-0.5 px-2">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveItem(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeItem === item.label
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && <span className="bg-blue-100 text-blue-700 text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{item.badge}</span>}
              </button>
            ))}
          </nav>
        </div>

        <nav className="space-y-0.5 px-2">
          {bottomItems.map((item) => (
            <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-white/60 transition-colors">
              <item.icon className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && <span className="text-[11px] text-gray-400">{item.shortcut}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {showBanner && (
          <div className="bg-[#F5EFE7] border-b border-[#E8DFD3] px-6 py-2.5 flex items-center justify-between text-sm">
            <p className="text-gray-700">Welcome to <span className="font-semibold">Vi-Sakha</span>. Your AI-powered VInternship support assistant.</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveItem('Vi-Sakha Chat')} className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                Open Vi-Sakha
              </button>
              <button onClick={() => setShowBanner(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-white/60 transition-colors" aria-label="Dismiss banner">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeItem === 'Vi-Sakha Chat' && (
          <ChatView
            onRaiseTicket={() => setActiveItem('Raise Ticket')}
            studentInfo={studentInfo}
          />
        )}
        {activeItem === 'Raise Ticket' && renderRaiseTicket()}
        {activeItem === 'My Tickets' && renderMyTickets()}
        {activeItem !== 'Vi-Sakha Chat' && activeItem !== 'Raise Ticket' && activeItem !== 'My Tickets' && renderOnboarding()}
      </main>
    </div>
  )
}
