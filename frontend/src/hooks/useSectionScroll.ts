import { useState, useEffect, useCallback } from 'react'

interface SectionProgress {
  helpdesk: number
  fin: number
}

interface UseSectionScrollReturn {
  activeSection: 'helpdesk' | 'fin'
  isDarkMode: boolean
  progress: SectionProgress
}

export function useSectionScroll(): UseSectionScrollReturn {
  const [activeSection, setActiveSection] = useState<'helpdesk' | 'fin'>('helpdesk')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [progress, setProgress] = useState<SectionProgress>({ helpdesk: 0, fin: 0 })

  const calculateProgress = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const elementHeight = element.offsetHeight
    const viewportHeight = window.innerHeight
    
    // Calculate how much of the section has been scrolled through
    const scrolledPastTop = -rect.top
    const scrollableDistance = elementHeight - viewportHeight
    
    if (scrolledPastTop < 0) return 0
    if (scrolledPastTop > scrollableDistance) return 1
    
    return Math.max(0, Math.min(1, scrolledPastTop / scrollableDistance))
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const helpdeskEl = document.getElementById('helpdesk')
      const finEl = document.getElementById('fin-ai-agent')
      
      if (!helpdeskEl || !finEl) return

      const helpdeskRect = helpdeskEl.getBoundingClientRect()
      const finRect = finEl.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const triggerPoint = viewportHeight * 0.4 // 40% from top

      // Determine active section based on which section's top is closest to trigger point
      if (finRect.top <= triggerPoint && finRect.bottom > 0) {
        setActiveSection('fin')
        setIsDarkMode(true)
      } else if (helpdeskRect.top <= triggerPoint && helpdeskRect.bottom > 0) {
        setActiveSection('helpdesk')
        setIsDarkMode(false)
      }

      // Calculate progress for each section
      setProgress({
        helpdesk: calculateProgress(helpdeskEl),
        fin: calculateProgress(finEl),
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [calculateProgress])

  return { activeSection, isDarkMode, progress }
}
