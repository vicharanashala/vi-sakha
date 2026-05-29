import type { DashboardSummary } from '@/lib/api'
import type { OperationalState } from '@/types/dashboard'

export function computeOperationalState(summary: DashboardSummary): OperationalState {
  const latency = Math.max(0, Math.round(summary.avgResponseMs ?? 0))
  const openPenalty = Math.min(12, Math.round((summary.openTickets ?? 0) * 0.5))
  const qaPenalty = Math.min(8, Math.round((summary.qaPending ?? 0) * 0.75))
  const responsePenalty = latency > 250 ? Math.round((latency - 250) / 20) : 0

  const healthScore = Math.max(0, Math.min(100, 100 - openPenalty - qaPenalty - responsePenalty))

  return {
    healthScore: Number(healthScore.toFixed(1)),
    totalQueries: summary.totalQueries,
    totalTickets: summary.totalTickets,
    openTickets: summary.openTickets,
    resolvedTickets: summary.resolvedTickets,
    aiResolutionRate: summary.aiResolutionRate,
    avgResponseMs: latency,
    slaCompliance: summary.ticketResolutionRate,
    avgResolutionHours: summary.avgResolutionHours,
    activeStudents: summary.activeStudents,
    kbEntries: summary.kbSize,
    qaApprovalRate: summary.qaApprovalRate,
    qaApproved: summary.qaApproved,
    qaPending: summary.qaPending,
    qaRejected: summary.qaRejected,
    qaTotal: summary.qaTotal,
    discordOpen: summary.discordOpen,
    discordClosed: summary.discordClosed,
    discordTotal: summary.discordTotal,
    totalUsers: summary.totalUsers,
    events: [],
    backlogTrend: [],
  }
}
