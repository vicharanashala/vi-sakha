"use client"

import * as React from "react"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { ChevronDown } from "lucide-react"

interface CohortOption {
  id: string
  label: string
  color: string
}

interface CohortDropdownProps {
  options: CohortOption[]
  selected: string
  onSelect: (id: string) => void
}

export function CohortDropdown({ options, selected, onSelect }: CohortDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.id === selected) || options[0]

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
            isOpen
              ? 'bg-gray-100 text-gray-900 border-gray-300'
              : 'bg-white text-blue-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedOption.color }}
            />
            {selectedOption.label}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                height: "auto",
                transition: { type: "spring", stiffness: 500, damping: 30 },
              }}
              exit={{
                opacity: 0,
                y: -4,
                height: 0,
                transition: { type: "spring", stiffness: 500, damping: 30 },
              }}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 min-w-[180px]"
            >
              <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-xl overflow-hidden">
                <div className="py-1 relative">
                  {/* Animated highlight */}
                  <motion.div
                    layoutId="cohort-highlight"
                    className="absolute inset-x-1 bg-blue-50 rounded-lg"
                    animate={{
                      y: options.findIndex((o) => (hoveredId || selected) === o.id) * 40,
                      height: 40,
                    }}
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />

                  {options.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => {
                        onSelect(option.id)
                        setIsOpen(false)
                      }}
                      onHoverStart={() => setHoveredId(option.id)}
                      onHoverEnd={() => setHoveredId(null)}
                      className={`relative flex w-full items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                        selected === option.id || hoveredId === option.id
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-600'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
