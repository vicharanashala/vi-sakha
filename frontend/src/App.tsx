import { useEffect, useRef, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Lenis from '@studio-freight/lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
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
import ApiDocs from '@/pages/ApiDocs'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

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
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => { lenis.raf(time * 1000) })
    gsap.ticker.lagSmoothing(0)
    return () => { lenis.destroy(); gsap.ticker.remove(lenis.raf) }
  }, [])

  useEffect(() => {
    const handleLoad = () => { setTimeout(() => setIsLoading(false), 1800) }
    if (document.readyState === 'complete') handleLoad()
    else {
      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    }
  }, [])

  return (
    <>
      {isLoading && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700"
          style={{ backgroundColor: 'var(--intercom-cream)' }}
        >
          <UniqueLoading variant="morph" size="lg" className="mb-6" />
          <p className="text-gray-400 text-sm font-medium tracking-widest uppercase">
            Vi-Sakha
          </p>
        </div>
      )}

      <div className="min-h-screen" style={{ backgroundColor: 'var(--intercom-cream)' }}>
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
        <Footer />
      </div>
    </>
  )
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
        path="/api-docs"
        element={
          <ProtectedRoute roles={['lab_member', 'admin']}>
            <ApiDocs />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
