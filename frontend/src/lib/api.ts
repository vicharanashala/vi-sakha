/**
 * QA Proposals API Service
 * Handles all API calls to the qa-proposals backend endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface QaProposal {
  _id: string;
  question: string;
  answer: string;
  title?: string;
  source: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProposalDto {
  question: string;
  answer: string;
  title?: string;
}

export interface ProposalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * Fetch all proposals with optional status filter
 */
export async function fetchProposals(status?: string): Promise<{ count: number; data: QaProposal[] }> {
  const url = new URL(`${API_BASE}/qa-proposals`);
  if (status && status !== 'all') {
    url.searchParams.set('status', status);
  }
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch proposals: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get proposal statistics
 */
export async function fetchProposalStats(): Promise<ProposalStats> {
  const response = await fetch(`${API_BASE}/qa-proposals/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a single proposal
 */
export async function createProposal(dto: CreateProposalDto): Promise<{ success: boolean; data: QaProposal }> {
  const response = await fetch(`${API_BASE}/qa-proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to create proposal: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Bulk create proposals
 */
export async function createBulkProposals(
  proposals: CreateProposalDto[]
): Promise<{ success: boolean; count: number; data: QaProposal[] }> {
  const response = await fetch(`${API_BASE}/qa-proposals/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proposals),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to create proposals: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Approve a proposal
 */
export async function approveProposal(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/qa-proposals/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to approve proposal: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Reject a proposal
 */
export async function rejectProposal(
  id: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/qa-proposals/${id}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectionReason: reason }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to reject proposal: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Delete a proposal
 */
export async function deleteProposal(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/qa-proposals/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete proposal: ${response.statusText}`);
  }
  return response.json();
}

// =============================================================================
// CHAT API
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  confidence?: number;
  sources?: Array<{
    question: string;
    answer: string;
    score: number;
  }>;
  feedback?: 'like' | 'dislike';
  feedbackComment?: string;
  isEscalated?: boolean;
  responseTimeMs?: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  studentId: string;
  studentName: string;
  cohort?: string;
  status: 'active' | 'resolved' | 'escalated';
  messageCount: number;
  likeCount: number;
  dislikeCount: number;
  averageConfidence?: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
}

export interface SendMessageResponse {
  conversationId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  status: 'answered' | 'escalated' | 'error';
}

export interface ChatStats {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  escalatedConversations: number;
  totalMessages: number;
  totalLikes: number;
  totalDislikes: number;
  averageConfidence: number;
  averageResponseTime: number;
}

export type ConversationSource = 'rag' | 'discord' | 'librechat';

export interface AggregatedConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  author?: string;
  timestamp?: string;
}

export interface AggregatedConversation {
  conversation_id: string;
  source: ConversationSource;
  user: string;
  timestamp: string;
  message_count: number;
  confidence?: number | null;
  last_message_preview?: string;
  messages: AggregatedConversationMessage[];
}

export interface AggregatedConversationStats {
  totalConversations: number;
  totalMessages: number;
  sourceCounts: Record<ConversationSource, number>;
  avgRagConfidence: number | null;
}

export interface AggregatedConversationListResponse {
  data: AggregatedConversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export type TicketStatus = 'open' | 'resolved';

export type TicketSenderRole = 'student' | 'instructor';

export interface TicketScreenshot {
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  cohort?: string;
  subject: string;
  reason: string;
  screenshots: TicketScreenshot[];
  messages: Array<{
    senderRole: TicketSenderRole;
    senderName: string;
    message: string;
    timestamp: string;
    screenshots?: TicketScreenshot[];
  }>;
  status: TicketStatus;
  assignedInstructor?: string;
  instructors: string[];
  resolvedBy?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketStats {
  total: number;
  open: number;
  resolved: number;
  resolutionRate: number;
  avgResolutionHours: number;
}

/**
 * Send a message to the chatbot
 */
export async function sendChatMessage(
  content: string,
  conversationId?: string,
  studentInfo?: {
    studentId?: string;
    studentName?: string;
    studentEmail?: string;
    cohort?: string;
  }
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      conversationId,
      ...studentInfo,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Add feedback to a message (like/dislike)
 */
export async function addMessageFeedback(
  messageId: string,
  feedback: 'like' | 'dislike',
  comment?: string
): Promise<{ id: string; feedback: string; feedbackAt: string }> {
  const response = await fetch(`${API_BASE}/chat/messages/${messageId}/feedback`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback, comment }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add feedback: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get a conversation with all messages
 */
export async function getConversation(conversationId: string): Promise<{
  conversation: Conversation;
  messages: ChatMessage[];
}> {
  const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}`);
  if (!response.ok) {
    throw new Error(`Failed to get conversation: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get all conversations (for lab members)
 */
export async function getConversations(filter?: {
  status?: string;
  cohort?: string;
  page?: number;
  limit?: number;
}): Promise<{
  conversations: Conversation[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> {
  const url = new URL(`${API_BASE}/chat/conversations`);
  if (filter?.status) url.searchParams.set('status', filter.status);
  if (filter?.cohort) url.searchParams.set('cohort', filter.cohort);
  if (filter?.page) url.searchParams.set('page', filter.page.toString());
  if (filter?.limit) url.searchParams.set('limit', filter.limit.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to get conversations: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get chat statistics
 */
export async function getChatStats(): Promise<ChatStats> {
  const response = await fetch(`${API_BASE}/chat/stats`);
  if (!response.ok) {
    throw new Error(`Failed to get stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Resolve a conversation
 */
export async function resolveConversation(conversationId: string): Promise<{
  id: string;
  status: string;
  resolvedAt: string;
}> {
  const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/resolve`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve conversation: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Escalate a conversation
 */
export async function escalateConversation(
  conversationId: string,
  reason: string
): Promise<{
  id: string;
  status: string;
  escalatedAt: string;
  escalationReason: string;
}> {
  const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/escalate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw new Error(`Failed to escalate conversation: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get messages with feedback
 */
export async function getMessagesWithFeedback(type?: 'like' | 'dislike'): Promise<ChatMessage[]> {
  const url = new URL(`${API_BASE}/chat/feedback`);
  if (type) url.searchParams.set('type', type);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to get feedback: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get student's conversation history
 */
export async function getStudentConversations(studentId: string): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE}/chat/students/${studentId}/conversations`);
  if (!response.ok) {
    throw new Error(`Failed to get student conversations: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get normalized conversations from all plugins
 */
export async function getAggregatedConversations(filter?: {
  source?: 'all' | ConversationSource;
  refresh?: boolean;
  page?: number;
  limit?: number;
}): Promise<AggregatedConversationListResponse> {
  const endpoint = filter?.refresh ? 'conversations/refresh' : 'conversations';
  const url = new URL(`${API_BASE}/${endpoint}`);

  if (filter?.source && filter.source !== 'all') {
    url.searchParams.set('source', filter.source);
  }
  if (filter?.page) {
    url.searchParams.set('page', String(filter.page));
  }
  if (filter?.limit) {
    url.searchParams.set('limit', String(filter.limit));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to get aggregated conversations: ${response.statusText}`);
  }

  const payload = await response.json();

  if (Array.isArray(payload)) {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? payload.length;

    return {
      data: payload,
      pagination: {
        total: payload.length,
        page,
        limit,
        pages: Math.max(1, Math.ceil(payload.length / Math.max(limit, 1))),
      },
    };
  }

  return payload;
}

export async function getAggregatedConversationDetail(
  source: ConversationSource,
  conversationId: string,
): Promise<AggregatedConversation | null> {
  const response = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(source)}/${encodeURIComponent(conversationId)}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to get aggregated conversation detail: ${response.statusText}`);
  }

  return response.json();
}

export async function getAggregatedConversationStats(filter?: {
  refresh?: boolean;
}): Promise<AggregatedConversationStats> {
  const url = new URL(`${API_BASE}/conversations/stats`);

  if (filter?.refresh) {
    url.searchParams.set('refresh', 'true');
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to get aggregated conversation stats: ${response.statusText}`);
  }

  return response.json();
}

export async function createTicket(payload: {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  cohort?: string;
  subject: string;
  reason: string;
  screenshots?: TicketScreenshot[];
}): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function getTickets(filter?: {
  studentId?: string;
  status?: TicketStatus;
  assignment?: 'all' | 'unassigned' | 'assigned' | 'mine';
  instructorName?: string;
}): Promise<SupportTicket[]> {
  const url = new URL(`${API_BASE}/tickets`);
  if (filter?.studentId) {
    url.searchParams.set('studentId', filter.studentId);
  }
  if (filter?.status) {
    url.searchParams.set('status', filter.status);
  }
  if (filter?.assignment) {
    url.searchParams.set('assignment', filter.assignment);
  }
  if (filter?.instructorName) {
    url.searchParams.set('instructorName', filter.instructorName);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to get tickets: ${response.statusText}`);
  }

  return response.json();
}

export async function getTicketsPaginated(filter?: {
  studentId?: string;
  status?: TicketStatus;
  assignment?: 'all' | 'unassigned' | 'assigned' | 'mine';
  instructorName?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: SupportTicket[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> {
  const url = new URL(`${API_BASE}/tickets/paginated`);
  if (filter?.studentId) {
    url.searchParams.set('studentId', filter.studentId);
  }
  if (filter?.status) {
    url.searchParams.set('status', filter.status);
  }
  if (filter?.assignment) {
    url.searchParams.set('assignment', filter.assignment);
  }
  if (filter?.instructorName) {
    url.searchParams.set('instructorName', filter.instructorName);
  }
  if (filter?.page) {
    url.searchParams.set('page', String(filter.page));
  }
  if (filter?.limit) {
    url.searchParams.set('limit', String(filter.limit));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to get paginated tickets: ${response.statusText}`);
  }

  return response.json();
}

export async function getTicketStats(): Promise<TicketStats> {
  const response = await fetch(`${API_BASE}/tickets/stats`);
  if (!response.ok) {
    throw new Error(`Failed to get ticket stats: ${response.statusText}`);
  }

  return response.json();
}

export async function resolveTicket(
  ticketId: string,
  payload: { resolvedBy: string; resolutionNote?: string },
): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function assignTicket(ticketId: string, instructorName: string): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructorName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to assign ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function transferTicket(ticketId: string, toInstructor: string): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/transfer`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toInstructor }),
  });

  if (!response.ok) {
    throw new Error(`Failed to transfer ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function addTicketMessage(
  ticketId: string,
  payload: {
    senderName: string;
    senderRole: TicketSenderRole;
    message: string;
    screenshots?: TicketScreenshot[];
  },
): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/messages`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to add ticket message: ${response.statusText}`);
  }

  return response.json();
}

export async function closeTicket(
  ticketId: string,
  payload: { closedBy: string; resolutionNote?: string },
): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/close`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to close ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function getTicket(ticketId: string): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}`);

  if (!response.ok) {
    throw new Error(`Failed to get ticket: ${response.statusText}`);
  }

  return response.json();
}
