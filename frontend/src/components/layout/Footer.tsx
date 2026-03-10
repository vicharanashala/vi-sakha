const VINTERNSHIP_BASE = 'https://sudarshansudarshan.github.io/vinternship/'
const VISAKHA_URL = 'https://sakha.vicharanashala.ai/'
const DISCORD_URL = 'https://discord.gg/BrdzTSmMxN'
const YOUTUBE_URL = 'https://youtu.be/ksFx_fDMJPY?list=PL4ocL5uCKzQOHnCwuKKZGQ6N0DGXiKSS-'

const footerLinks: Record<string, { label: string; href: string }[]> = {
  'Chatbot Features': [
    { label: 'Vi-Sakha AI', href: VISAKHA_URL },
    { label: 'RAG Knowledge Base', href: '#helpdesk' },
    { label: 'Multi-cohort Support', href: VINTERNSHIP_BASE },
    { label: 'Ticket Escalation', href: '#fin-ai-agent' },
    { label: 'Conversation History', href: VISAKHA_URL },
    { label: 'Smart Suggestions', href: VISAKHA_URL },
    { label: 'FAQ Integration', href: `${VINTERNSHIP_BASE}faq/` },
  ],
  'Lab Dashboard': [
    { label: 'Ticket Queue', href: '#fin-ai-agent' },
    { label: 'Student Profiles', href: '#fin-ai-agent' },
    { label: 'Response Templates', href: '#fin-ai-agent' },
    { label: 'Analytics', href: '#fin-ai-agent' },
  ],
  Program: [
    { label: 'Introduction', href: `${VINTERNSHIP_BASE}intro/` },
    { label: 'Case Studies', href: `${VINTERNSHIP_BASE}case-studies/` },
    { label: 'Projects', href: `${VINTERNSHIP_BASE}projects/` },
    { label: 'HP System', href: `${VINTERNSHIP_BASE}hp/` },
    { label: 'Milestones', href: `${VINTERNSHIP_BASE}milestones/` },
    { label: 'Protocols & Policies', href: `${VINTERNSHIP_BASE}protocols_and_policies/` },
  ],
  Support: [
    { label: 'Discord Channel', href: DISCORD_URL },
    { label: 'FAQ Page', href: `${VINTERNSHIP_BASE}faq/` },
    { label: 'Vi-Sakha Help', href: VISAKHA_URL },
    { label: 'Escalation Protocol', href: `${VINTERNSHIP_BASE}protocols_and_policies/` },
    { label: 'Contact VLED Lab', href: 'mailto:dled@iitrpr.ac.in' },
  ],
  Community: [
    { label: 'Euclideans', href: `${VINTERNSHIP_BASE}euclideans/` },
    { label: 'Dijkstrians', href: `${VINTERNSHIP_BASE}dijkstrians/` },
    { label: 'Kruskalians', href: `${VINTERNSHIP_BASE}kruskalians/` },
    { label: 'AKSians (NPTEL)', href: `${VINTERNSHIP_BASE}aksians/` },
    { label: 'RSAians', href: `${VINTERNSHIP_BASE}rsaians/` },
    { label: 'Founders Keepers', href: `${VINTERNSHIP_BASE}founders-keepers/` },
    { label: 'VLED Connect', href: `${VINTERNSHIP_BASE}vled-connect/` },
  ],
}

const actionLinks = [
  { label: 'Try Vi-Sakha', href: VISAKHA_URL },
  { label: 'Join Discord', href: DISCORD_URL },
  { label: 'YouTube Lectures', href: YOUTUBE_URL },
  { label: 'VInternship Home', href: VINTERNSHIP_BASE },
]

export function Footer() {
  return (
    <footer style={{ backgroundColor: '#f5f5ec' }}>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-10">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-[11px] font-semibold text-gray-400 mb-4 uppercase tracking-[0.1em]">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.href.startsWith('#') ? undefined : '_blank'}
                      rel={link.href.startsWith('#') ? undefined : 'noopener noreferrer'}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-[11px] font-semibold text-gray-400 mb-4 uppercase tracking-[0.1em]">
              Quick Actions
            </h3>
            <ul className="space-y-2.5">
              {actionLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200/60">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-5">
              {[
                { label: 'Protocols & Policies', href: `${VINTERNSHIP_BASE}protocols_and_policies/` },
                { label: 'FAQ', href: `${VINTERNSHIP_BASE}faq/` },
                { label: 'Discord', href: DISCORD_URL },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <span className="text-xs text-gray-400">
              © {new Date().getFullYear()} VLED Lab, IIT Ropar. Prof. Sudarshan Iyengar.
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
