import { useEffect, useState, useCallback } from 'react'
import {
  getAggregatedConversations,
  getDashboardSummary,
  getTicketsPaginated,
} from '@/lib/api'
import { computeOperationalState } from '@/data/dashboard/metricsEngine'
import { generateEvents } from '@/data/dashboard/activityEngine'
import { buildBacklogTrend } from '@/data/dashboard/chartState'
import type { OperationalState as OpStateType } from '@/types/dashboard'

export function useDashboardState(pollMs = 30000) {
  const [opState, setOpState] = useState<OpStateType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, ticketsPage, conversationsPage] = await Promise.all([
        getDashboardSummary(),
        getTicketsPaginated({ page: 1, limit: 50 }),
        getAggregatedConversations({ page: 1, limit: 50, refresh: true }),
      ])

      const baseState = computeOperationalState(summary)
      const events = generateEvents(ticketsPage.data, conversationsPage.data)
      const backlogTrend = buildBacklogTrend(ticketsPage.data, conversationsPage.data, 30)

      setOpState({ ...baseState, events, backlogTrend })
      setLastSync(new Date().toISOString())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data'
      console.error('[useDashboardState] refresh failed', message)
      setError(message)
      setOpState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, pollMs)
    return () => clearInterval(id)
  }, [refresh, pollMs])

  return { opState, loading, error, lastSync, refresh }
}

export default useDashboardState
