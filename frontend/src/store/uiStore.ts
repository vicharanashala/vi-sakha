import { create } from 'zustand'

interface UIState {
  activeSection: string
  isMobileMenuOpen: boolean
  activeHelpdeskTab: string
  activeFinTab: string
  activeTestimonial: number
  setActiveSection: (section: string) => void
  setMobileMenuOpen: (isOpen: boolean) => void
  setActiveHelpdeskTab: (tab: string) => void
  setActiveFinTab: (tab: string) => void
  setActiveTestimonial: (index: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeSection: 'hero',
  isMobileMenuOpen: false,
  activeHelpdeskTab: 'productivity',
  activeFinTab: 'capabilities',
  activeTestimonial: 0,
  setActiveSection: (section) => set({ activeSection: section }),
  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  setActiveHelpdeskTab: (tab) => set({ activeHelpdeskTab: tab }),
  setActiveFinTab: (tab) => set({ activeFinTab: tab }),
  setActiveTestimonial: (index) => set({ activeTestimonial: index }),
}))
