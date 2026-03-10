import { useState, useEffect } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const VISAKHA_URL = 'https://sakha.vicharanashala.ai/'
const VINTERNSHIP_BASE = 'https://sudarshansudarshan.github.io/vinternship/'
const DISCORD_URL = 'https://discord.gg/BrdzTSmMxN'

const navItems = [
  { label: 'Home', hasDropdown: false, href: VINTERNSHIP_BASE },
  {
    label: 'Features',
    hasDropdown: true,
    items: [
      { label: 'Vi-Sakha Chatbot', href: VISAKHA_URL },
      { label: 'Ticket System', href: '#helpdesk' },
      { label: 'Lab Dashboard', href: '#fin-ai-agent' },
      { label: 'Analytics', href: '#fin-ai-agent' },
    ],
  },
  {
    label: 'Program',
    hasDropdown: true,
    items: [
      { label: 'Introduction', href: `${VINTERNSHIP_BASE}intro/` },
      { label: 'Case Studies', href: `${VINTERNSHIP_BASE}case-studies/` },
      { label: 'Projects', href: `${VINTERNSHIP_BASE}projects/` },
      { label: 'Milestones', href: `${VINTERNSHIP_BASE}milestones/` },
      { label: 'Health Points', href: `${VINTERNSHIP_BASE}hp/` },
    ],
  },
  {
    label: 'Resources',
    hasDropdown: true,
    items: [
      { label: 'FAQ', href: `${VINTERNSHIP_BASE}faq/` },
      { label: 'Protocols & Policies', href: `${VINTERNSHIP_BASE}protocols_and_policies/` },
      { label: 'YouTube Lectures', href: 'https://youtu.be/ksFx_fDMJPY?list=PL4ocL5uCKzQOHnCwuKKZGQ6N0DGXiKSS-' },
      { label: 'Discord', href: DISCORD_URL },
    ],
  },
  { label: 'Cohorts', hasDropdown: false, href: VINTERNSHIP_BASE },
]

export function Navigation() {
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled ? 'nav-frosted' : 'nav-transparent'
      )}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <a href={VINTERNSHIP_BASE} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors duration-500',
                  scrolled ? 'bg-gray-900' : 'bg-white/20 backdrop-blur-sm'
                )}
              >
                <span className="text-white font-bold text-sm tracking-tight">VS</span>
                <ChevronDown className="w-3 h-3 text-white ml-0.5" />
              </div>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() =>
                    item.hasDropdown && setActiveDropdown(item.label)
                  }
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  {item.hasDropdown ? (
                    <button
                      className={cn(
                        'flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors duration-300 rounded-lg',
                        scrolled
                          ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/60'
                          : 'text-white/90 hover:text-white',
                        activeDropdown === item.label &&
                          (scrolled ? 'text-gray-900' : 'text-white')
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 transition-transform duration-200',
                          activeDropdown === item.label && 'rotate-180'
                        )}
                      />
                    </button>
                  ) : (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors duration-300 rounded-lg',
                        scrolled
                          ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/60'
                          : 'text-white/90 hover:text-white'
                      )}
                    >
                      {item.label}
                    </a>
                  )}

                  {/* Dropdown */}
                  {item.hasDropdown && activeDropdown === item.label && (
                    <div className="absolute top-full left-0 pt-2">
                      <div className="bg-white border border-gray-200/80 rounded-xl p-1.5 min-w-[200px] shadow-xl shadow-black/5">
                        {item.items?.map((subItem) => (
                          <a
                            key={subItem.label}
                            href={subItem.href}
                            target={subItem.href.startsWith('#') ? undefined : '_blank'}
                            rel={subItem.href.startsWith('#') ? undefined : 'noopener noreferrer'}
                            className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            {subItem.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-5">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'text-sm font-medium transition-colors duration-300',
                scrolled
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-white/85 hover:text-white'
              )}
            >
              Discord
            </a>
            <a
              href={VINTERNSHIP_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'text-sm font-medium transition-colors duration-300',
                scrolled
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-white/85 hover:text-white'
              )}
            >
              VInternship
            </a>
            <a
              href={VISAKHA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-300 border',
                scrolled
                  ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
                  : 'bg-white text-gray-900 border-white hover:bg-gray-50'
              )}
            >
              Try Vi-Sakha
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className={cn(
              'lg:hidden p-2 transition-colors',
              scrolled ? 'text-gray-900' : 'text-white'
            )}
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-6 space-y-1">
            {navItems.map((item) =>
              item.hasDropdown ? (
                item.items?.map((subItem) => (
                  <a
                    key={subItem.label}
                    href={subItem.href}
                    target={subItem.href.startsWith('#') ? undefined : '_blank'}
                    rel={subItem.href.startsWith('#') ? undefined : 'noopener noreferrer'}
                    className="block px-4 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium"
                  >
                    {subItem.label}
                  </a>
                ))
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium"
                >
                  {item.label}
                </a>
              )
            )}
            <div className="pt-4 space-y-2 px-4">
              <a
                href={VISAKHA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors text-center"
              >
                Try Vi-Sakha
              </a>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
              >
                Join Discord
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
