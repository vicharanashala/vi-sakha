import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

export function PricingCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="illustration-card relative rounded-3xl overflow-hidden mx-4 sm:mx-8 my-8 h-[550px] sm:h-[650px] noise-texture">
        <img
          src="/footer-background.webp"
          alt="Get started background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/15 to-black/10" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-tight mb-6">
              One platform.
              <br />
              Zero missed queries.
            </h2>

            <div className="mb-2">
              <span className="text-white/80 text-lg">Built for </span>
              <span className="text-white text-2xl sm:text-3xl font-bold">
                5,000+ students
              </span>
            </div>
            <div className="text-white/80 text-lg mb-2">
              across all VInternship cohorts
            </div>
            <p className="text-white/60 text-sm mb-8">
              Powered by VLED Lab, IIT Ropar
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <a href="https://sudarshansudarshan.github.io/vinternship/intro/" target="_blank" rel="noopener noreferrer" className="bg-white/20 backdrop-blur-sm text-white font-semibold text-sm px-6 py-3 rounded-lg border border-white/30 hover:bg-white/30 transition-colors">
                View program
              </a>
              <a href="https://sakha.vicharanashala.ai/" target="_blank" rel="noopener noreferrer" className="bg-white text-gray-900 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                Try Vi-Sakha <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
