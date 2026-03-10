import { motion } from 'framer-motion'

const logos = [
  { name: 'Amazon', color: 'from-orange-500 to-yellow-500' },
  { name: 'Shopify', color: 'from-green-500 to-emerald-500' },
  { name: 'Microsoft', color: 'from-blue-500 to-cyan-500' },
  { name: 'Notion', color: 'from-gray-500 to-gray-400' },
  { name: 'Atlassian', color: 'from-blue-600 to-blue-400' },
  { name: 'Unity', color: 'from-gray-600 to-gray-400' },
  { name: 'Spendesk', color: 'from-purple-500 to-pink-500' },
  { name: 'Living Spaces', color: 'from-amber-500 to-orange-500' },
  { name: 'Coda', color: 'from-red-500 to-pink-500' },
  { name: 'TravelPerk', color: 'from-teal-500 to-cyan-500' },
]

export function LogoCarousel() {
  return (
    <section className="py-16 overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-sm text-gray-500 mb-8"
        >
          Trusted by over 30,000 customer service leaders
        </motion.p>
      </div>

      {/* Scrolling logos */}
      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

        {/* First row - scrolling left */}
        <div className="flex animate-scroll">
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="flex-shrink-0 mx-8"
            >
              <div className={`w-32 h-12 rounded-lg bg-gradient-to-r ${logo.color} opacity-30 hover:opacity-60 transition-opacity flex items-center justify-center`}>
                <span className="text-white font-semibold text-sm">{logo.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Second row - scrolling right */}
        <div className="flex mt-6" style={{ animation: 'scroll 30s linear infinite reverse' }}>
          {[...logos.slice().reverse(), ...logos.slice().reverse()].map((logo, index) => (
            <div
              key={`${logo.name}-rev-${index}`}
              className="flex-shrink-0 mx-8"
            >
              <div className={`w-32 h-12 rounded-lg bg-gradient-to-r ${logo.color} opacity-30 hover:opacity-60 transition-opacity flex items-center justify-center`}>
                <span className="text-white font-semibold text-sm">{logo.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
