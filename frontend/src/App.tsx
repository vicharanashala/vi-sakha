import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import Lenis from '@studio-freight/lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigation } from '@/layouts/Navigation'
import { Footer } from '@/layouts/Footer'
import { Hero } from '@/components/sections/Hero'
import { BuiltTogether } from '@/components/sections/BuiltTogether'
import { HelpdeskSection } from '@/components/sections/HelpdeskSection'
import { FinSection } from '@/components/sections/FinSection'
import { OneSuiteSection } from '@/components/sections/OneSuiteSection'
import { TestimonialsSection } from '@/components/sections/TestimonialsSection'
import { PricingCTA } from '@/components/sections/PricingCTA'
import { useSectionScroll } from '@/hooks/useSectionScroll'
import UniqueLoading from '@/components/ui/morph-loading'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard from '@/pages/Dashboard'
import LabMemberDashboard from '@/pages/LabMemberDashboard'
import Settings from '@/pages/Settings'
import OpsDashboard from '@/pages/LabMemberDashboard'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Nexar from '@/pages/Nexar'

gsap.registerPlugin(ScrollTrigger)

/* ─── Landing Page (existing content) ─── */
function LandingPage() {
  const lenisRef = useRef<Lenis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { activeSection, isDarkMode, progress } = useSectionScroll()

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenisRef.current = lenis

    // Initial state: stop scrolling if still loading
    if (isLoading) lenis.stop()

    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => { lenis.raf(time * 1000) })
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.destroy()
      gsap.ticker.remove(lenis.raf)
    }
  }, [])

  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => {
        setIsLoading(false)
        if (lenisRef.current) lenisRef.current.start()
      }, 1800)
    }

    if (document.readyState === 'complete') handleLoad()
    else {
      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    }
  }, [])

  // Lock body scroll during initial load
  useEffect(() => {
    if (isLoading) {
      document.body.style.overflow = 'hidden'
      document.body.style.height = '100vh'
    } else {
      document.body.style.overflow = ''
      document.body.style.height = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
    }
  }, [isLoading])

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="loader"
              initial={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.8, ease: "easeInOut" }
              }}
              className="fixed inset-0 z-[99999] flex flex-col items-center justify-center pointer-events-auto"
              style={{ backgroundColor: 'var(--intercom-cream)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <UniqueLoading variant="morph" size="lg" className="mb-6" />
              <p className="text-gray-400 text-sm font-medium tracking-widest uppercase">
                Vi-Sakha
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="relative w-full min-h-screen" style={{ backgroundColor: 'var(--intercom-cream)' }}>
        {/* Main content sits above the fixed footer */}
        <div className="relative z-10 w-full min-h-screen rounded-b-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]" style={{ backgroundColor: 'var(--intercom-cream)' }}>
          <Navigation />
          <main>
            <Hero />
            <BuiltTogether />
            <div className={`sections-wrapper relative ${isDarkMode ? 'dark-mode' : ''}`}>
              <div className="dark-bg-overlay" />
              <div className="flex">
                <div className="hidden lg:block w-[280px] flex-shrink-0">
                  <div className="sticky-sidebar pl-8 pt-16" id="section-sidebar">
                    <div className="space-y-4">
                      <div>
                        <div
                          className={`sticky-sidebar-item-light sticky-sidebar-item ${activeSection === 'helpdesk' ? 'active' : ''}`}
                          data-section="helpdesk"
                          onClick={() => document.getElementById('helpdesk')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          VI-SAKHA CHATBOT
                        </div>
                        <div className="sticky-sidebar-progress sticky-sidebar-progress-light">
                          <div className="sticky-sidebar-progress-fill" style={{ width: `${progress.helpdesk * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div
                          className={`sticky-sidebar-item-light sticky-sidebar-item ${activeSection === 'fin' ? 'active' : ''}`}
                          data-section="fin"
                          onClick={() => document.getElementById('fin-ai-agent')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          TICKET SYSTEM
                        </div>
                        <div className="sticky-sidebar-progress sticky-sidebar-progress-light">
                          <div className="sticky-sidebar-progress-fill" style={{ width: `${progress.fin * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <HelpdeskSection />
                  <FinSection />
                </div>
              </div>
            </div>
            <OneSuiteSection />
            <TestimonialsSection />
            <PricingCTA />
          </main>
        </div>

        {/* Cinematic Footer — revealed via scroll */}
        <Footer />
      </div>
    </>
  )
}

/* ─── Redirect /dashboard/tickets/:ticketNumber → appropriate dashboard ─── */
import { getUser } from '@/lib/auth'

function TicketRedirect() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>()
  const user = getUser()

  if (user && (user.role === 'lab_member' || user.role === 'admin')) {
    return <Navigate to={`/labmember?ticket=${ticketNumber}`} replace />
  }

  return <Navigate to={`/dashboard?ticket=${ticketNumber}`} replace />
}

/* ─── App Router ─── */
function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['student']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/tickets/:ticketNumber"
        element={
          <ProtectedRoute roles={['student', 'lab_member', 'admin']}>
            <TicketRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute roles={['student', 'lab_member', 'admin']}>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labmember"
        element={
          <ProtectedRoute roles={['lab_member', 'admin']}>
            <LabMemberDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops-dashboard"
        element={
          <ProtectedRoute roles={['lab_member', 'admin']}>
            <OpsDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/nexar" element={<Nexar />} />
    </Routes>
  )
}

export default App
