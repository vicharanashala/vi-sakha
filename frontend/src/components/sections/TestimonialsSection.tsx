import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const testimonials = [
  {
    company: 'Euclideans',
    quote:
      'Vi-Sakha helped me figure out my ViBe progress was stuck because of tab-switching detection. Instead of waiting hours for a Discord response, I got an instant answer with exact steps to fix it. Saved me a whole day of confusion.',
    author: 'Arjun M.',
    role: 'Euclideans Cohort · VInternship',
    initial: 'A',
    bgColor: 'from-teal-300 to-cyan-400',
  },
  {
    company: 'Dijkstrians',
    quote:
      "I was confused about the HP deduction policy when I missed a live session. Vi-Sakha pulled up the exact attendance policy and explained that my camera being off was the issue. The ticket system's also great—when I needed manual help with my project, a lab member responded within an hour.",
    author: 'Priya S.',
    role: 'Dijkstrians Cohort · VInternship',
    initial: 'P',
    bgColor: 'from-rose-300 to-pink-400',
  },
  {
    company: 'AKSians',
    quote:
      'As an NPTEL student new to VInternship, I had dozens of questions about case study submissions and the ViBe platform. Vi-Sakha answered 95% of them correctly—and the few times it couldn\'t, raising a ticket was seamless. Way better than scrolling through Discord.',
    author: 'Rahul K.',
    role: 'AKSians Cohort (NPTEL) · VInternship',
    initial: 'R',
    bgColor: 'from-purple-300 to-indigo-400',
  },
]

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(1)

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-stone-300/60 via-stone-200/40 to-blue-200/30" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #888 0.5px, transparent 0.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 mb-5">
            Loved by VInternship students
            <br />
            across all cohorts
          </h2>
          <a
            href="https://sudarshansudarshan.github.io/vinternship/case-studies/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-intercom text-gray-900 border-gray-400 inline-flex items-center gap-2"
          >
            View all student stories <ArrowUpRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Cohort tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            {testimonials.map((t, index) => (
              <button
                key={t.company}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'px-6 py-3 text-sm font-medium transition-all duration-300 relative',
                  activeIndex === index
                    ? 'text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {t.company}
                {activeIndex === index && (
                  <motion.div
                    layoutId="testimonial-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Testimonial card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto"
          >
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm">
              <div className="grid lg:grid-cols-5">
                <div className="lg:col-span-2 relative min-h-[300px] lg:min-h-[400px]">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${testimonials[activeIndex].bgColor} opacity-20`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-32 h-32 rounded-full bg-gradient-to-br ${testimonials[activeIndex].bgColor} flex items-center justify-center shadow-lg`}
                    >
                      <span className="text-white text-4xl font-bold">
                        {testimonials[activeIndex].initial}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 p-8 sm:p-10 flex flex-col justify-center">
                  <span className="text-sm font-semibold text-gray-900 mb-4 block">
                    {testimonials[activeIndex].company}
                  </span>
                  <blockquote className="text-lg sm:text-xl lg:text-[1.35rem] text-gray-900 leading-relaxed mb-8">
                    "{testimonials[activeIndex].quote}"
                  </blockquote>
                  <div className="border-t border-gray-100 pt-5">
                    <div className="text-sm font-semibold text-gray-900">
                      {testimonials[activeIndex].author}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonials[activeIndex].role}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
