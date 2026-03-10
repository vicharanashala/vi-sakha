import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Users, TrendingUp } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const steps = [
  {
    icon: Bot,
    title: 'Vi-Sakha handles most student queries instantly.',
    description:
      'RAG-trained on the entire VInternship knowledge base—ViBe modules, case studies, HP system, policies, and FAQs—to give accurate answers 24/7.',
    color: '#22c55e',
  },
  {
    icon: Users,
    title: 'Lab members handle escalated tickets.',
    description:
      'When Vi-Sakha can\'t resolve a query, students raise a ticket that goes to the VLED Lab team for human-in-the-loop review and response.',
    color: '#8b5cf6',
  },
  {
    icon: TrendingUp,
    title: 'The system learns and improves continuously.',
    description:
      'Every resolved ticket feeds back into Vi-Sakha\'s knowledge. Lab responses become training data—making the chatbot smarter with each interaction.',
    color: '#3b82f6',
  },
]

export function BuiltTogether() {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 20%',
        end: 'bottom 60%',
        onUpdate: (self) => {
          const progress = self.progress
          if (progress < 0.33) setActiveStep(0)
          else if (progress < 0.66) setActiveStep(1)
          else setActiveStep(2)
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-32 relative overflow-hidden"
      style={{ backgroundColor: 'var(--intercom-cream)' }}
    >
      <div className="absolute top-0 left-8 right-8">
        <hr className="dotted-divider" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-gray-900 leading-tight">
            Built to work together as one.
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Animated path */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center"
          >
            <div className="relative w-[320px] h-[320px]">
              <svg
                viewBox="0 0 320 320"
                className="w-full h-full"
                fill="none"
              >
                <ellipse
                  cx="160"
                  cy="160"
                  rx="120"
                  ry="100"
                  stroke="#d1d1c4"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  fill="none"
                />
                <ellipse
                  cx="160"
                  cy="160"
                  rx="120"
                  ry="100"
                  stroke={steps[activeStep].color}
                  strokeWidth="2.5"
                  fill="none"
                  strokeDasharray="628"
                  strokeDashoffset={628 - (628 * (activeStep + 1)) / 3}
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              <motion.div
                className="absolute w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 transition-colors duration-500"
                style={{
                  borderColor: steps[activeStep].color,
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
                animate={{ scale: activeStep === 0 ? 1.15 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <Bot
                  className="w-5 h-5"
                  style={{ color: steps[activeStep].color }}
                />
              </motion.div>

              <motion.div
                className="absolute w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 transition-colors duration-500"
                style={{
                  borderColor:
                    activeStep >= 1 ? steps[activeStep].color : '#d1d1c4',
                  bottom: '10px',
                  right: '10px',
                }}
                animate={{ scale: activeStep === 1 ? 1.15 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <Users
                  className="w-5 h-5"
                  style={{
                    color:
                      activeStep >= 1 ? steps[activeStep].color : '#a0a090',
                  }}
                />
              </motion.div>

              <motion.div
                className="absolute w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 transition-colors duration-500"
                style={{
                  borderColor:
                    activeStep >= 2 ? steps[activeStep].color : '#d1d1c4',
                  bottom: '10px',
                  left: '10px',
                }}
                animate={{ scale: activeStep === 2 ? 1.15 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <TrendingUp
                  className="w-5 h-5"
                  style={{
                    color:
                      activeStep >= 2 ? steps[activeStep].color : '#a0a090',
                  }}
                />
              </motion.div>

              {/* Center logo */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">VS</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Step cards */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`p-6 rounded-2xl border transition-all duration-500 cursor-pointer ${
                  activeStep === index
                    ? 'bg-white border-gray-200 shadow-lg shadow-black/5'
                    : 'bg-transparent border-transparent hover:bg-white/50'
                }`}
                onClick={() => setActiveStep(index)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-500"
                    style={{
                      backgroundColor:
                        activeStep === index ? step.color + '15' : '#f0f0e5',
                    }}
                  >
                    <step.icon
                      className="w-4 h-4 transition-colors duration-500"
                      style={{
                        color: activeStep === index ? step.color : '#a0a090',
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {step.title}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed transition-all duration-500 ${
                        activeStep === index
                          ? 'text-gray-600 max-h-20 opacity-100'
                          : 'text-gray-400 max-h-0 opacity-0 overflow-hidden'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
