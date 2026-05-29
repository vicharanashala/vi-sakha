import type { AggregatedConversation, SupportTicket } from '@/lib/api'
import type { DashboardTrendPoint } from '@/types/dashboard'

function startOfDay(value: string | Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function createBuckets(days: number) {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (days - 1 - index))
    return {
      key: date.toISOString(),
      date: date.toISOString(),
      conversations: 0,
      ticketsOpened: 0,
      ticketsResolved: 0,
      escalations: 0,
    }
  })
}

export function buildBacklogTrend(
  tickets: SupportTicket[] = [],
  conversations: AggregatedConversation[] = [],
  days = 30,
): DashboardTrendPoint[] {
  const buckets = createBuckets(days)
  const bucketByDay = new Map(buckets.map((bucket) => [startOfDay(bucket.date).toISOString(), bucket]))

  for (const conversation of conversations) {
    const dayKey = startOfDay(conversation.timestamp).toISOString()
    const bucket = bucketByDay.get(dayKey)
    if (!bucket) continue
    bucket.conversations += 1
    if ((conversation.status ?? '').toLowerCase() === 'escalated') {
      bucket.escalations += 1
    }
  }

  for (const ticket of tickets) {
    const createdKey = startOfDay(ticket.createdAt).toISOString()
    const createdBucket = bucketByDay.get(createdKey)
    if (createdBucket) {
      createdBucket.ticketsOpened += 1
    }

    if (ticket.resolvedAt) {
      const resolvedKey = startOfDay(ticket.resolvedAt).toISOString()
      const resolvedBucket = bucketByDay.get(resolvedKey)
      if (resolvedBucket) {
        resolvedBucket.ticketsResolved += 1
      }
    }
  }

  return buckets
}
