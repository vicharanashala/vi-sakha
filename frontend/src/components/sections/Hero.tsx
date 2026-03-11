import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TextRoll } from '@/components/ui/text-roll'
import { SmokeOverlay } from '@/components/ui/smoke-card'

const logos = [
  { name: 'iit-ropar', display: 'IIT Ropar', style: 'font-bold text-sm tracking-wide' },
  { name: 'vled', display: 'VLED Lab', style: 'tracking-[0.15em] text-[11px] font-medium' },
  { name: 'nptel', display: 'NPTEL', style: 'font-bold tracking-wider text-xs' },
  { name: 'vibe', display: '▶ ViBe', style: 'font-medium text-sm' },
  { name: 'mern', display: 'MERN Stack', style: 'font-medium text-sm' },
  { name: 'euclideans', display: 'Euclideans', style: 'italic font-light text-lg tracking-tight' },
  { name: 'dijkstrians', display: 'Dijkstrians', style: 'font-medium text-sm' },
  { name: 'aksians', display: 'AKSians', style: 'tracking-[0.1em] text-[11px] font-medium' },
]

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const floatingRef1 = useRef<HTMLDivElement>(null)
  const floatingRef2 = useRef<HTMLDivElement>(null)
  const logoBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    gsap.to(floatingRef1.current, {
      y: -60,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      },
    })

    gsap.to(floatingRef2.current, {
      y: -40,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
      },
    })

    // Logo bar scroll animation - starts higher, settles at bottom
    gsap.fromTo(
      logoBarRef.current,
      { y: -150 },
      {
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '30% top',
          scrub: 1,
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col pt-16 overflow-hidden"
    >
      {/* Background illustration */}
      <div className="absolute inset-0">
        <img
          src="/beauty scene.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/50" />
      </div>

      {/* Noise texture */}
      <div className="absolute inset-0 noise-texture" />

      {/* Smoke particle effect — hero only */}
      <SmokeOverlay />

      {/* Floating UI mockup — Student Query Panel */}
      <div
        ref={floatingRef1}
        className="absolute top-[25%] right-[8%] hidden lg:block animate-float z-20"
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 w-[280px] border border-gray-200/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">🎓</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-900">
                Student Queries
              </div>
              <div className="text-[10px] text-gray-500">5 pending</div>
            </div>
          </div>
          <div className="space-y-2">
            {['ViBe progress stuck...', 'Case study deadline?', 'HP deduction query'].map(
              (text, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex-shrink-0 ${
                      i === 0
                        ? 'bg-purple-100'
                        : i === 1
                        ? 'bg-blue-100'
                        : 'bg-green-100'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-gray-700 truncate">
                      {text}
                    </div>
                  </div>
                  {i === 0 && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Floating UI mockup — Vi-Sakha AI Response */}
      <div
        ref={floatingRef2}
        className="absolute bottom-[28%] right-[3%] hidden lg:block animate-float-slow z-20"
        style={{ animationDelay: '2s' }}
      >
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/10 p-4 w-[240px] border border-gray-200/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">VS</span>
            </div>
            <span className="text-xs font-semibold text-gray-900">
              Vi-Sakha
            </span>
          </div>
          <div className="bg-purple-50 rounded-lg p-2.5">
            <p className="text-[11px] text-purple-900 leading-relaxed">
              Your ViBe progress is at 68%. Complete the React module by
              Friday to earn 7.5 HP and stay on track!
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex-1 max-w-[1400px] mx-auto px-6 lg:px-8 w-full pt-16 lg:pt-24">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* Left - Main headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-[2.75rem] sm:text-[3.5rem] md:text-[4rem] lg:text-[4.75rem] font-bold tracking-tight leading-[1.05]">
                <span className="text-white drop-shadow-lg">
                  Your AI-Powered
                </span>
                <br />
                <span className="text-white drop-shadow-lg">
                  <TextRoll
                    className="text-white drop-shadow-lg"
                    duration={0.6}
                    getEnterDelay={(i) => i * 0.08 + 1.0}
                    getExitDelay={(i) => i * 0.08 + 1.2}
                    repeat={true}
                    repeatInterval={5000}
                  >
                    VInternship
                  </TextRoll>
                </span>
                <br />
                <span className="text-white drop-shadow-lg">Support</span>
                <br />
                <span className="text-white drop-shadow-lg">
                  Assistant.
                </span>
              </h1>
            </motion.div>

            {/* Right - Description and CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.9,
                delay: 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="lg:pt-6"
            >
              <div className="w-10 h-px bg-white/50 mb-5" />

              <p className="text-white/70 text-xs font-medium tracking-[0.15em] uppercase mb-5">
                Vi-Sakha Chatbot + Ticket System
              </p>

              <p className="text-[15px] text-white/85 leading-relaxed mb-7 max-w-md">
                An agentic AI chatbot trained on VInternship's knowledge base to
                instantly resolve student queries—with smart ticket escalation
                to lab members when needed. Built for Prof. Sudarshan Iyengar's
                VLED Lab at IIT Ropar.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3">
                <a href="https://sudarshansudarshan.github.io/vinternship/intro/" target="_blank" rel="noopener noreferrer" className="btn-outline-intercom text-white border-white/60 btn-outline-light">
                  View program <ArrowRight className="w-4 h-4" />
                </a>
                <a href="https://sakha.vicharanashala.ai/" target="_blank" rel="noopener noreferrer" className="bg-white text-gray-900 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Try Vi-Sakha
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom trust + logos */}
        <motion.div
          ref={logoBarRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-auto pb-8"
        >
          <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
            <p className="text-white/80 text-sm font-medium mb-5 drop-shadow-sm">
              Trusted by 5+ active cohorts across the VInternship program
            </p>
            {/* Marquee container */}
            <div className="relative overflow-hidden">
              <div className="flex animate-marquee">
                {/* First set of logos */}
                {logos.map((logo) => (
                  <div
                    key={logo.name}
                    className={`flex-shrink-0 text-white/60 whitespace-nowrap px-6 ${logo.style}`}
                  >
                    {logo.display}
                  </div>
                ))}
                {/* Duplicate for seamless loop */}
                {logos.map((logo) => (
                  <div
                    key={`${logo.name}-dup`}
                    className={`flex-shrink-0 text-white/60 whitespace-nowrap px-6 ${logo.style}`}
                  >
                    {logo.display}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
