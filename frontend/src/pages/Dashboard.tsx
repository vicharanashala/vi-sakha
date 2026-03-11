import { useState } from 'react'
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
  ExternalLink,
  ArrowUpRight,
  X,
} from 'lucide-react'
import { ChatView } from '@/components/chat/ChatView'

/* ── Sidebar Nav ────────────────────────────── */
const sidebarItems = [
  { icon: MessageCircle, label: 'Vi-Sakha Chat', badge: '', active: true },
  { icon: Ticket, label: 'Raise Ticket', badge: '' },
  { icon: ClipboardList, label: 'My Tickets', badge: '2' },
  { icon: BarChart3, label: 'HP Dashboard', badge: '' },
  { icon: BookOpen, label: 'Resources', badge: '' },
  { icon: Users, label: 'Cohort Info', badge: '' },
]

const bottomItems = [
  { icon: Search, label: 'Search', shortcut: '⌘ K' },
  { icon: Settings, label: 'Settings' },
  { icon: User, label: 'Profile' },
]

/* ── Onboarding Steps ────────────────────────── */
const onboardingSteps = [
  {
    title: 'Start a conversation with Vi-Sakha',
    description: 'Ask any question about VInternship—ViBe modules, case studies, HP policies, deadlines, and more. Vi-Sakha is trained on the entire knowledge base.',
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

/* ── Quick Stats ────────────────────────────── */
const quickStats = [
  { label: 'All queries', count: 47, icon: '🌐' },
  { label: 'Vi-Sakha', count: 21, icon: '🤖' },
  { label: 'Tickets', count: 14, icon: '🎫' },
  { label: 'Discord', count: 7, icon: '💬' },
  { label: 'FAQ', count: 5, icon: '📖' },
]

/* ── Go Further Cards ────────────────────────── */
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

export default function Dashboard() {
  const [activeItem, setActiveItem] = useState('Vi-Sakha Chat')
  const [showChat, setShowChat] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

  // Mock student info - in production this would come from auth/session
  const studentInfo = {
    studentId: 'student-001',
    studentName: 'Student',
    studentEmail: 'student@example.com',
    cohort: 'Euclideans',
  }

  return (
    <div className="flex h-screen bg-white">
      {/* ── Left Sidebar ── */}
      <aside className="w-[220px] bg-[#FAF9F6] border-r border-gray-200 flex flex-col justify-between py-3 flex-shrink-0">
        {/* Logo */}
        <div>
          <div className="px-4 mb-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-gray-900 rounded-lg px-2 py-1.5">
                <span className="text-white font-bold text-xs tracking-tight">VS</span>
              </div>
            </Link>
          </div>

          {/* Main Nav */}
          <nav className="space-y-0.5 px-2">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setActiveItem(item.label)
                  if (item.label === 'Vi-Sakha Chat') setShowChat(true)
                  else setShowChat(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeItem === item.label
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
          {bottomItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-white/60 transition-colors"
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-[11px] text-gray-400">{item.shortcut}</span>
              )}
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
              Welcome to <span className="font-semibold">Vi-Sakha</span>. Your AI-powered VInternship support assistant.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveItem('Vi-Sakha Chat'); setShowChat(true) }}
                className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Open Vi-Sakha
              </button>
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

        {showChat ? (
          /* ── Chat View ── */
          <ChatView
            onRaiseTicket={() => {
              setActiveItem('Raise Ticket')
              setShowChat(false)
            }}
            studentInfo={studentInfo}
          />
        ) : (
          /* ── Onboarding View ── */
          <div className="max-w-4xl mx-auto px-8 py-10">
            <h1 className="text-[2rem] font-light text-gray-900 mb-8 tracking-tight">
              Get started with <span className="font-semibold">Vi-Sakha</span> support
            </h1>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              <span>Get set up · 0 / {onboardingSteps.length} steps</span>
            </div>

            {/* Steps + Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
              {/* Onboarding Steps */}
              <div className="space-y-1">
                {onboardingSteps.map((step, i) => (
                  <div
                    key={i}
                    className={`border border-gray-200 rounded-xl p-5 transition-colors hover:border-gray-300 ${
                      step.expanded ? 'bg-white shadow-sm' : 'bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                        {step.expanded && step.description && (
                          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                            {step.description}
                          </p>
                        )}
                        {step.expanded && step.cta && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-3 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                          >
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

              {/* Quick Stats Card */}
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm h-fit">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/beauty scene.jpg"
                    alt="Stats"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                    <span className="text-lg">▶</span>
                  </div>
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

            {/* Go Further */}
            <div className="mt-12">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Go further</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {goFurtherCards.map((card) => (
                  <a
                    key={card.title}
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
                  >
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
        )}
      </main>
    </div>
  )
}
