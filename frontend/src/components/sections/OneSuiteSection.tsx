import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const features = [
  {
    title: 'A self-improving knowledge system',
    description:
      "Every resolved ticket enriches Vi-Sakha's training data. Lab member responses become part of the RAG knowledge base—making the chatbot smarter with each interaction and reducing future ticket volume automatically.",
    mockup: 'sankey',
  },
  {
    title: 'Seamless escalation workflow',
    description:
      "From chatbot conversation to ticket creation to lab member review—the entire escalation is connected. Students don't leave the interface, and lab members get full conversation context for faster resolution.",
    mockup: 'workflow',
  },
  {
    title: 'Complete analytics dashboard',
    description:
      "Monitor query trends, resolution rates, ticket volumes, and knowledge gaps in a single superadmin view. Identify which topics generate the most tickets, and proactively update the knowledge base.",
    mockup: 'dashboard',
  },
  {
    title: 'Quick setup for any cohort.',
    description:
      'Vi-Sakha adapts to each new cohort—Euclideans, Dijkstrians, Kruskalians, AKSians—with cohort-specific deadlines, schedules, and milestones loaded automatically from the VInternship configuration.',
    mockup: 'setup',
  },
]

function MockupSankey() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[8px]">
          📊
        </div>
        <span className="text-xs font-semibold text-gray-900">Query Flow</span>
      </div>
      <div className="text-[10px] text-gray-400 mb-3">How queries are handled</div>
      <div className="space-y-1.5">
        <div className="flex gap-1 items-end">
          <div className="h-16 w-8 bg-blue-500 rounded-t" />
          <div className="h-10 w-8 bg-teal-400 rounded-t" />
          <div className="h-6 w-8 bg-orange-300 rounded-t" />
          <div className="h-4 w-8 bg-gray-200 rounded-t" />
        </div>
        <div className="flex gap-1 text-[8px] text-gray-400">
          <span className="w-8 text-center">Total</span>
          <span className="w-8 text-center">AI</span>
          <span className="w-8 text-center">Ticket</span>
          <span className="w-8 text-center">Other</span>
        </div>
      </div>
    </div>
  )
}

function MockupWorkflow() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
          <div className="text-xs text-gray-500">Student asks query</div>
          <div className="flex-1 border-t border-dashed border-gray-200" />
        </div>
        <div className="ml-1.5 w-px h-4 bg-gray-200" />
        <div className="p-3 rounded-xl border-2 border-purple-200 bg-purple-50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-600 text-sm">✦</span>
            <span className="text-xs font-semibold text-purple-900">
              Vi-Sakha responds
            </span>
          </div>
          <p className="text-[10px] text-purple-600">
            RAG retrieval + LLM generates an accurate, context-aware answer.
          </p>
        </div>
        <div className="ml-1.5 w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
          <div className="text-xs text-gray-500">If not resolved → raise ticket</div>
          <div className="flex-1 border-t border-dashed border-gray-200" />
        </div>
      </div>
    </div>
  )
}

function MockupDashboard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[8px]">
          📈
        </div>
        <span className="text-xs font-semibold text-gray-900">Superadmin</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Resolution rate', value: '87%', trend: '+2%' },
          { label: 'Avg. response', value: '1.8s', trend: '-40%' },
          { label: 'Open tickets', value: '23', trend: '-15%' },
          { label: 'Total queries', value: '8.4k', trend: '+12%' },
        ].map((stat) => (
          <div key={stat.label} className="p-2 bg-gray-50 rounded-lg">
            <div className="text-[9px] text-gray-400 mb-0.5">{stat.label}</div>
            <div className="text-sm font-bold text-gray-900">{stat.value}</div>
            <div className="text-[9px] text-green-600">{stat.trend}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockupSetup() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      <div className="text-sm font-semibold text-gray-900 mb-1">Cohort Config</div>
      <div className="text-xs text-gray-500 mb-3">
        Auto-loaded ·&nbsp;Per cohort
      </div>
      <div className="space-y-2">
        {[
          { label: 'Active cohort', detail: 'AKSians (NPTEL)' },
          { label: 'ViBe deadline', detail: 'Week 4 · 10 HP' },
          { label: 'Case studies', detail: '30 submissions · 25 HP' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div>
              <div className="text-xs font-medium text-gray-900">
                {item.label}
              </div>
              <div className="text-[10px] text-gray-400">{item.detail}</div>
            </div>
            <ArrowUpRight className="w-3 h-3 text-gray-400" />
          </div>
        ))}
      </div>
    </div>
  )
}

const mockupComponents: Record<string, () => JSX.Element> = {
  sankey: MockupSankey,
  workflow: MockupWorkflow,
  dashboard: MockupDashboard,
  setup: MockupSetup,
}

export function OneSuiteSection() {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ backgroundColor: 'var(--intercom-cream)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Koi Fish illustration hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <div className="illustration-card relative rounded-3xl overflow-hidden h-[420px] sm:h-[520px] noise-texture">
            <img
              src="/one-suite-banner.webp"
              alt="One Platform"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
              <h2 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-tight mb-4">
                One Platform.
                <br />
                Complete Support.
              </h2>
              <p className="text-white/70 text-sm sm:text-base max-w-lg leading-relaxed">
                Vi-Sakha brings AI chatbot, ticket management, lab member
                dashboards, and superadmin analytics into one
                connected platform—purpose-built for the VInternship program.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bento features grid */}
        <div className="bento-grid mb-16">
          {features.map((feature, index) => {
            const MockupComponent = mockupComponents[feature.mockup]
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="bg-white rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="p-7 sm:p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-5">
                    {feature.description}
                  </p>
                </div>
                <div className="px-7 sm:px-8 pb-7 sm:pb-8">
                  <MockupComponent />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Student stories link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <button className="btn-outline-intercom text-gray-900 border-gray-300">
            View all cohort stories <ArrowUpRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
