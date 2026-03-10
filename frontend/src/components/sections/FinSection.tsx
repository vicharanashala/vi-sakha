import { motion } from 'framer-motion'
import { ArrowUpRight, Sparkles } from 'lucide-react'

const performanceMonths = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG',
  'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR',
]

const topicCards = [
  { name: 'ViBe Platform Issues', conv: '1,842', score: '91%', color: 'bg-purple-400' },
  { name: 'HP & Milestones', conv: '1,205', score: '95%', color: 'bg-purple-300' },
  { name: 'Case Study Help', conv: '986', score: '88%', color: 'bg-purple-200' },
  { name: 'Project Submission', conv: '754', score: '92%', color: 'bg-purple-100' },
  { name: 'Ejection Policy', conv: '621', score: '97%', color: 'bg-pink-200' },
]

export function FinSection() {
  return (
    <section
      id="fin-ai-agent"
      className="py-16 relative overflow-hidden dark-section"
    >
      <div className="max-w-[1100px] mx-auto px-6 lg:px-8 relative z-10">
        {/* Hero card with dark aurora */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div className="illustration-card relative rounded-3xl overflow-hidden h-[400px] sm:h-[480px] noise-texture">
            <img
              src="/dark-aurora.png"
              alt="Ticket & Lab Dashboard"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-tight mb-4">
                Ticket System &
                <br />
                Lab Member Dashboard.
              </h2>
              <p className="text-white/65 text-sm sm:text-base max-w-lg mb-6 leading-relaxed">
                When Vi-Sakha can't resolve a query, students raise tickets that
                flow to the VLED Lab dashboard for human-in-the-loop review
              </p>
              <button className="btn-outline-intercom text-white border-white/40 btn-outline-light">
                Learn more <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Topic Explorer — Query categories */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className="text-[11px] tracking-[0.15em] uppercase font-medium text-gray-500 mb-3 block">
                Query Intelligence
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-snug">
                Built to handle every type of student query
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                From ViBe platform issues to HP milestone tracking, case study
                deadlines to project submission queries—Vi-Sakha understands
                the entire VInternship ecosystem and resolves queries across
                all categories.
              </p>
              <button className="btn-outline-intercom text-white border-white/30 btn-outline-light">
                Learn more <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Query Topics mockup */}
            <div className="dark-card rounded-2xl p-5 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">
                    Query Topics
                  </span>
                </div>
                <span className="text-[11px] text-gray-500">
                  Jan 2026 - Mar 2026
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {topicCards.map((topic, i) => (
                  <motion.div
                    key={topic.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className={`${topic.color} rounded-xl p-3 ${
                      i === 0 ? 'col-span-2' : ''
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900 mb-1">
                      {topic.name}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-700">
                      <span>{topic.conv} queries</span>
                      <span>{topic.score} resolved</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Performance section — Resolution rate */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <div className="dark-card rounded-3xl p-8 sm:p-10 border border-white/[0.06]">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="text-[11px] tracking-[0.15em] uppercase font-medium text-gray-500 mb-3 block">
                  Performance
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Reducing ticket volume every month
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Vi-Sakha's average resolution rate is 87% across all cohorts,
                  and it improves 2% every month as more lab responses feed back
                  into the training data.
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-white">87%</span>
                  <span className="text-gray-500 text-sm">
                    Avg. Query
                    <br />
                    Resolution Rate
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-end gap-1 overflow-x-auto pb-2">
                  {performanceMonths.map((month, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: 20 + i * 6 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.04 }}
                        className="w-6 rounded-t bg-gradient-to-t from-teal-600/60 to-teal-400/80"
                      />
                      <span className="text-[9px] text-gray-600 font-medium">
                        {month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Technology — RAG Architecture */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-[11px] tracking-[0.15em] uppercase font-medium text-gray-500 mb-3 block">
                Technology
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Powered by RAG Architecture
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Vi-Sakha uses Retrieval-Augmented Generation to combine the
                reasoning power of large language models with precise retrieval
                from the VInternship knowledge base—ensuring answers are
                accurate, up-to-date, and contextually relevant to each
                student's cohort and progress.
              </p>
              <button className="btn-outline-intercom text-white border-white/30 btn-outline-light">
                Learn more <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* RAG Architecture wireframe */}
            <div className="dark-card rounded-2xl p-8 border border-white/[0.06] flex items-center justify-center">
              <div className="relative w-48 h-64">
                {[0, 1, 2, 3, 4].map((layer) => (
                  <motion.div
                    key={layer}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: layer * 0.1 }}
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: `${layer * 48}px` }}
                  >
                    <div
                      className={`rounded-xl border flex items-center justify-center transition-all duration-500 ${
                        layer === 0
                          ? 'w-16 h-16 border-orange-500/40 bg-orange-500/10'
                          : layer === 4
                          ? 'w-16 h-12 border-orange-500/30 bg-orange-500/5'
                          : 'w-20 h-10 border-gray-600/40 bg-gray-800/50'
                      }`}
                    >
                      {layer === 0 && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 opacity-80" />
                      )}
                      {layer === 2 && (
                        <svg className="w-8 h-8 text-gray-500" viewBox="0 0 32 32">
                          <polygon
                            points="16,4 28,24 4,24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          <line x1="16" y1="4" x2="16" y2="24" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="4" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="0.5" />
                        </svg>
                      )}
                    </div>
                    {layer < 4 && (
                      <div className="absolute left-1/2 -translate-x-1/2 w-px h-6 bg-gray-700/50" style={{ bottom: '-24px' }} />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Testimonial — Prof quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <div className="rounded-3xl overflow-hidden">
            <div className="relative h-[300px] sm:h-[350px]">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-800/90 to-amber-700/70" />
              <div className="absolute inset-0 p-8 sm:p-10 flex items-center">
                <div className="grid lg:grid-cols-2 gap-8 items-center w-full">
                  <div>
                    <span className="text-[11px] tracking-[0.15em] uppercase font-medium text-white/50 mb-4 block">
                      VLED LAB · IIT ROPAR
                    </span>
                    <blockquote className="text-lg sm:text-xl text-white leading-relaxed mb-6">
                      "Students skip FAQs and directly raise tickets, which
                      overloads the support team. An AI assistant trained on
                      the program knowledge can handle 90% of queries—freeing
                      lab members to focus on complex issues."
                    </blockquote>
                    <div>
                      <div className="text-white font-semibold text-sm">
                        Prof. Sudarshan Iyengar
                      </div>
                      <div className="text-white/60 text-xs">
                        Faculty, IIT Ropar · VLED Lab
                      </div>
                    </div>
                  </div>
                </div>
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
          className="dark-card rounded-3xl p-8 sm:p-10 border border-white/[0.06]"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                Explore the full ticket system & lab dashboard
              </h3>
              <p className="text-gray-500 text-sm">
                See how lab members review, respond, and resolve student tickets
                with the human-in-the-loop interface.
              </p>
            </div>
            <button className="btn-outline-intercom text-white border-white/30 btn-outline-light flex-shrink-0">
              Learn more <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
