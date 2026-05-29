import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FilterOption<T extends string> {
  id: T
  label: string
  count?: number
}

interface FilterTabsProps<T extends string> {
  options: FilterOption<T>[]
  selected: T
  onChange: (id: T) => void
  className?: string
}

export function FilterTabs<T extends string>({ options, selected, onChange, className }: FilterTabsProps<T>) {
  return (
    <div className={cn("flex gap-1.5 bg-gray-50 p-1.5 w-fit rounded-xl border border-gray-100", className)}>
      {options.map((option) => {
        const isSelected = selected === option.id
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative px-4 py-2 rounded-lg text-xs font-bold transition-all outline-none",
              isSelected ? "text-gray-900" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="filter-tab-indicator"
                className="absolute inset-0 bg-white rounded-lg shadow-sm border border-gray-200/50"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span className="capitalize">{option.label}</span>
              {option.count !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold",
                  isSelected ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"
                )}>
                  {option.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
