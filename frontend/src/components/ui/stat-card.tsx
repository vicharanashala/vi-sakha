import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: ReactNode
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-50',
  trend,
  className
}: StatCardProps) {
  return (
    <div className={cn('bg-white border border-gray-100 rounded-2xl p-6 shadow-sm card-hover', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
        <div className={cn('p-2 rounded-xl border border-gray-100 shadow-sm', iconBgColor)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        {trend && (
          <p
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded-full',
              trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
    </div>
  )
}
