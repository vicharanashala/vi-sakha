import type { AggregatedConversation, SupportTicket } from '@/lib/api'
import type { OperationalEvent } from '@/types/dashboard'

export function generateEvents(
  tickets: SupportTicket[] = [],
  conversations: AggregatedConversation[] = [],
): OperationalEvent[] {
  const events: OperationalEvent[] = []

  for (const ticket of tickets.slice(0, 6)) {
    const status = ticket.status
    events.push({
      id: `ticket-${ticket.id}`,
      type: status === 'resolved' ? 'ai_resolution' : 'escalation',
      priority: status === 'resolved' ? 'low' : 'high',
      title: status === 'resolved' ? `Ticket ${ticket.ticketNumber} resolved` : `Ticket ${ticket.ticketNumber} opened`,
      description: `${ticket.studentName}${ticket.cohort ? ` · ${ticket.cohort}` : ''} · ${ticket.subject}`,
      timestamp: ticket.resolvedAt ?? ticket.updatedAt ?? ticket.createdAt,
      meta: status === 'resolved' ? `Resolved by ${ticket.resolvedBy ?? 'staff'}` : `Status: ${status}`,
      status,
    })
  }

  for (const conversation of conversations.slice(0, 6)) {
    const status = (conversation.status ?? 'active').toLowerCase()
    events.push({
      id: `conversation-${conversation.conversation_id}`,
      type: status === 'escalated' ? 'escalation' : 'ingestion',
      priority: status === 'escalated' ? 'high' : 'medium',
      title: status === 'escalated' ? 'Conversation escalated' : 'Conversation synced',
      description: `${conversation.user}${conversation.cohortName ? ` · ${conversation.cohortName}` : ''} · ${conversation.source}`,
      timestamp: conversation.timestamp,
      meta: conversation.last_message_preview ?? `Messages: ${conversation.message_count}`,
      status,
    })
  }

  return events.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
}
