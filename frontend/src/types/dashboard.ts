export type EventPriority = 'low' | 'medium' | 'high' | 'critical'
export type EventType =
  | 'ingestion'
  | 'ai_resolution'
  | 'escalation'
  | 'compliance'
  | 'kb_sync'
  | 'system'

export interface OperationalEvent {
  id: string
  type: EventType
  priority: EventPriority
  title: string
  description: string
  timestamp: string
  meta?: string
  status?: string
}

export interface DashboardTrendPoint {
  date: string
  conversations: number
  ticketsOpened: number
  ticketsResolved: number
  escalations: number
}

export interface OperationalState {
  healthScore: number
  totalQueries: number
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  aiResolutionRate: number
  avgResponseMs: number
  slaCompliance: number
  avgResolutionHours: number
  activeStudents: number
  kbEntries: number
  qaApprovalRate: number
  qaApproved: number
  qaPending: number
  qaRejected: number
  qaTotal: number
  discordOpen: number
  discordClosed: number
  discordTotal: number
  totalUsers: number
  events: OperationalEvent[]
  backlogTrend: DashboardTrendPoint[]
}
