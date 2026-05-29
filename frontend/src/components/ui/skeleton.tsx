import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-shimmer rounded-xl bg-gray-100", className)} />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4", className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  )
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <div className="flex items-end justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonTableRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-4 py-4 px-5 border-b border-gray-50", className)}>
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  )
}
