import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, MessageSquare, BookOpen, BarChart3, Trophy } from 'lucide-react'

const chatbotFeatures = [
  {
    badge: 'RAG-POWERED',
    title: 'AI trained on VInternship knowledge base',
    description:
      'Vi-Sakha is trained on the entire VInternship corpus—ViBe modules, case study guides, HP policies, escalation protocols, cohort schedules, and FAQs—to answer student queries with pinpoint accuracy.',
    icon: MessageSquare,
  },
  {
    badge: 'SMART TICKETS',
    title: 'Intelligent ticket escalation to lab members',
    description:
      'When Vi-Sakha can\'t resolve a query, students can raise a ticket directly from the chat. Tickets are routed to VLED Lab members who act as human-in-the-loop reviewers, reducing the support burden on the team.',
    icon: BookOpen,
  },
  {
    badge: 'ANALYTICS',
    title: 'Query analytics and knowledge gap insights',
    description:
      'Track common student pain points, measure resolution rates, identify knowledge gaps in the FAQ, and continuously improve Vi-Sakha\'s training data—so fewer tickets are raised over time.',
    icon: BarChart3,
  },
]

const rankings = [
  { name: 'Vi-Sakha', score: 94, color: '#1a1a1a' },
  { name: 'FAQ Page', score: 45, color: '#94a3b8' },
  { name: 'Discord Only', score: 32, color: '#94a3b8' },
]

export function HelpdeskSection() {
  return (
    <section
      id="helpdesk"
      className="py-16 relative overflow-hidden"
      style={{ backgroundColor: 'var(--intercom-cream)' }}
    >
      <div className="max-w-[1100px] mx-auto px-6 lg:px-8">
        {/* Hero illustration card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div className="illustration-card relative rounded-3xl overflow-hidden h-[400px] sm:h-[480px] noise-texture">
            <img
              src="/beauty scene.jpg"
              alt="Vi-Sakha Chatbot"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-tight mb-4">
                Vi-Sakha: The AI Chatbot
                <br />
                for VInternship students.
              </h2>
              <p className="text-white/75 text-sm sm:text-base max-w-lg mb-6 leading-relaxed">
                RAG-trained on the entire program knowledge base—ViBe modules,
                case studies, HP milestones, policies, and escalation
                protocols—so students get instant, accurate answers.
              </p>
              <button className="btn-outline-intercom text-white border-white/50 btn-outline-light">
                Learn more <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Feature cards */}
        <div className="space-y-12 mb-16">
          {chatbotFeatures.map((feature, index) => (
            <motion.div
              key={feature.badge}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: index * 0.05 }}
            >
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="grid lg:grid-cols-2">
                  <div className="p-8 sm:p-10">
                    <span className="text-[11px] tracking-[0.15em] uppercase font-medium text-gray-400 mb-3 block">
                      {feature.badge}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-snug">
                      {feature.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-5">
                      {feature.description}
                    </p>
                    <button className="btn-outline-intercom text-gray-900 border-gray-300">
                      Learn more <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-gray-50 p-8 flex items-center justify-center border-l border-gray-100">
                    <div className="w-full max-w-sm">
                      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                            <feature.icon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {feature.badge.charAt(0) + feature.badge.slice(1).toLowerCase().replace('-', ' ')}
                            </div>
                            <div className="text-xs text-gray-400">
                              Active
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          <div className="h-2.5 bg-gray-100 rounded-full w-full" />
                          <div className="h-2.5 bg-gray-100 rounded-full w-4/5" />
                          <div className="h-2.5 bg-gray-100 rounded-full w-3/5" />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <div className="px-2.5 py-1 bg-purple-50 rounded-lg text-[11px] text-purple-600 font-medium">
                            AI Resolved
                          </div>
                          <div className="px-2.5 py-1 bg-blue-50 rounded-lg text-[11px] text-blue-600 font-medium">
                            Escalated
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Query Resolution Rankings */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200/60">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="text-[11px] tracking-[0.15em] uppercase font-medium text-gray-400">
                    Resolution Efficiency
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                  94% of queries resolved without a ticket
                </h3>
                <p className="text-gray-500 text-sm mb-5">
                  Vi-Sakha reduces the support load on lab members by resolving
                  the vast majority of student queries instantly, compared to FAQ
                  pages or Discord-only support.
                </p>
                <div className="flex gap-3">
                  <button className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
                    See analytics
                  </button>
                  <button className="btn-outline-intercom text-gray-600 border-gray-300 text-sm">
                    Student stories <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {rankings.map((item, index) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-900 font-semibold">
                        {item.name}
                      </span>
                      <span className="text-gray-400 font-medium">
                        {item.score}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: index * 0.15 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200/60"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                See all of Vi-Sakha's capabilities
              </h3>
              <p className="text-gray-500 text-sm">
                Explore how the chatbot handles ViBe questions, HP queries,
                case study help, and ticket escalation.
              </p>
            </div>
            <button className="btn-outline-intercom text-gray-900 border-gray-300 flex-shrink-0">
              Learn more <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
