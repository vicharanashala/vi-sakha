/**
 * QA Proposals API Service
 * Handles all API calls to the qa-proposals backend endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  return localStorage.getItem('vs_token')
}

/**
 * Drop-in replacement for fetch() that automatically adds the Authorization
 * header when a JWT is present in localStorage.
 */
function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> ?? {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(url, { ...init, headers })
}

export interface UserAttribution {
  userId: string;
  name: string;
  role: string;
}

export interface QaProposal {
  _id: string;
  question: string;
  answer: string;
  title?: string;
  status: 'pending' | 'approved' | 'rejected';
  proposedBy?: UserAttribution;
  reviewedBy?: UserAttribution;
  reviewedAt?: string;
  rejectionReason?: string;
  /** @deprecated Legacy field — older documents may still have it. */
  source?: string;
  /** @deprecated Legacy field — older documents may still have it. */
  submittedBy?: string;
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
  let url = `${API_BASE}/qa-proposals`;
  if (status && status !== 'all') {
    url += `?status=${encodeURIComponent(status)}`;
  }

  const response = await authFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch proposals: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get proposal statistics
 */
export async function fetchProposalStats(): Promise<ProposalStats> {
  const response = await authFetch(`${API_BASE}/qa-proposals/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a single proposal
 */
export async function createProposal(dto: CreateProposalDto): Promise<{ success: boolean; data: QaProposal }> {
  const response = await authFetch(`${API_BASE}/qa-proposals`, {
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
  const response = await authFetch(`${API_BASE}/qa-proposals/bulk`, {
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
  const response = await authFetch(`${API_BASE}/qa-proposals/${id}/approve`, {
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
  const response = await authFetch(`${API_BASE}/qa-proposals/${id}/reject`, {
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
  const response = await authFetch(`${API_BASE}/qa-proposals/${id}`, {
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
  type?: 'text' | 'meeting';
  meetingLink?: string;
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
  title?: string;
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
  type?: 'message' | 'ticket_reason';
  attachments?: string[];
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
  mainReason?: string;
  registeredEmail?: string;
  cohortName?: string;
  status?: string;
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

export interface TicketMessage {
  id?: string;
  ticketId?: string;
  senderRole: TicketSenderRole;
  senderName: string;
  message: string;
  type?: 'text' | 'meeting';
  meetingLink?: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  screenshots?: TicketScreenshot[];
}

export interface StartSupportSessionResponse {
  meetingLink: string;
  message: TicketMessage;
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
  conversationId?: string;
  messageId?: string;
  originalQuery?: string;
  botResponse?: string;
  screenshots: TicketScreenshot[];
  messages: TicketMessage[];
  messagesPagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
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

declare global {
  interface Window {
    io?: (url: string, options?: Record<string, unknown>) => any;
  }
}

let ticketsSocket: any | null = null;
let socketIoLoaderPromise: Promise<void> | null = null;

function getTicketsSocketUrl() {
  return API_BASE.replace(/\/api\/?$/, '');
}

function loadSocketIoClient() {
  if (window.io) {
    return Promise.resolve();
  }

  if (socketIoLoaderPromise) {
    return socketIoLoaderPromise;
  }

  socketIoLoaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
    script.async = true;
    script.onload = () => {
      if (!window.io) {
        reject(new Error('Socket.IO client failed to load'));
        return;
      }
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Socket.IO client script'));
    document.head.appendChild(script);
  });

  return socketIoLoaderPromise;
}

async function getTicketsSocket() {
  await loadSocketIoClient();

  if (!ticketsSocket) {
    ticketsSocket = window.io?.(`${getTicketsSocketUrl()}/tickets`, {
      transports: ['websocket'],
      withCredentials: true,
    });
  }

  return ticketsSocket;
}

export function subscribeToTicketMessages(
  ticketId: string,
  onMessage: (message: TicketMessage) => void,
): () => void {
  let isDisposed = false;
  let socket: any | null = null;
  const handler = (payload: TicketMessage & { ticketId: string }) => {
    if (payload.ticketId !== ticketId) return;
    onMessage(payload);
  };

  void getTicketsSocket()
    .then((connectedSocket) => {
      if (isDisposed) return;
      socket = connectedSocket;
      socket.emit('ticket:join', { ticketId });
      socket.on('ticket:message.created', handler);
    })
    .catch((error) => {
      console.error('Failed to initialize ticket websocket:', error);
    });

  return () => {
    isDisposed = true;
    if (!socket) return;
    socket.off('ticket:message.created', handler);
    socket.emit('ticket:leave', { ticketId });
  };
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
  const response = await authFetch(`${API_BASE}/chat/message`, {
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
 * Stream event types from the /chat/message/stream SSE endpoint
 */
export type ChatStreamEvent =
  | { type: 'metadata'; conversationId: string; userMessageId: string }
  | { type: 'sources'; sources: any[]; confidence: number; status: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; assistantMessageId: string }
  | { type: 'error'; message: string };

/**
 * Send a message and stream the response via SSE (ndjson).
 * Calls `onEvent` for each chunk as it arrives from the server.
 */
export async function sendChatMessageStream(
  content: string,
  onEvent: (event: ChatStreamEvent) => void,
  conversationId?: string,
  studentInfo?: {
    studentId?: string;
    studentName?: string;
    studentEmail?: string;
    cohort?: string;
  }
): Promise<void> {
  const response = await authFetch(`${API_BASE}/chat/message/stream`, {
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

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed) as ChatStreamEvent;
        onEvent(event);
      } catch {
        // Skip malformed lines
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer.trim()) as ChatStreamEvent;
      onEvent(event);
    } catch {
      // ignore
    }
  }
}

/**
 * Add feedback to a message (like/dislike)
 */
export async function addMessageFeedback(
  messageId: string,
  feedback: 'like' | 'dislike',
  comment?: string
): Promise<{ id: string; feedback: string; feedbackAt: string }> {
  const response = await authFetch(`${API_BASE}/chat/messages/${messageId}/feedback`, {
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
  const response = await authFetch(`${API_BASE}/chat/conversations/${conversationId}`);
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
  feedbackFilter?: 'all' | 'liked' | 'disliked' | 'no-feedback';
  page?: number;
  limit?: number;
}): Promise<{
  conversations: Conversation[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> {
  let url = `${API_BASE}/chat/conversations`;
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  if (filter?.cohort) params.set('cohort', filter.cohort);
  if (filter?.feedbackFilter) params.set('feedbackFilter', filter.feedbackFilter);
  if (filter?.page) params.set('page', filter.page.toString());
  if (filter?.limit) params.set('limit', filter.limit.toString());

  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  const response = await authFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get conversations: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get chat statistics
 */
export async function getChatStats(): Promise<ChatStats> {
  const response = await authFetch(`${API_BASE}/chat/stats`);
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
  const response = await authFetch(`${API_BASE}/chat/conversations/${conversationId}/resolve`, {
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
  const response = await authFetch(`${API_BASE}/chat/conversations/${conversationId}/escalate`, {
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
  let url = `${API_BASE}/chat/feedback`;
  if (type) url += `?type=${encodeURIComponent(type)}`;

  const response = await authFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get feedback: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a new conversation for multi-chat sidebar
 */
export async function createChatConversation(studentInfo?: {
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  cohort?: string;
}): Promise<{ conversationId: string }> {
  const response = await authFetch(`${API_BASE}/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: studentInfo?.studentId || 'user_1',
      studentName: studentInfo?.studentName || 'Student',
      studentEmail: studentInfo?.studentEmail,
      cohort: studentInfo?.cohort,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get student's conversation history
 */
export async function getStudentConversations(studentId: string): Promise<Conversation[]> {
  const response = await authFetch(`${API_BASE}/chat/students/${studentId}/conversations`);
  if (!response.ok) {
    throw new Error(`Failed to get student conversations: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Generate a Q&A proposal from a conversation using Claude
 */
export async function generateQaFromConversation(
  source: string,
  conversationId: string,
): Promise<{ title: string; question: string; answer: string }> {
  const response = await authFetch(`${API_BASE}/conversations/generate-qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, conversationId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to generate Q&A: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteChatConversation(conversationId: string): Promise<void> {
  const response = await authFetch(`${API_BASE}/chat/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete conversation: ${response.statusText}`);
  }
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
  let url = `${API_BASE}/${endpoint}`;
  
  const params = new URLSearchParams();
  if (filter?.source && filter.source !== 'all') {
    params.set('source', filter.source);
  }
  if (filter?.page) {
    params.set('page', String(filter.page));
  }
  if (filter?.limit) {
    params.set('limit', String(filter.limit));
  }

  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  const response = await authFetch(url);
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
  const response = await authFetch(
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
  let url = `${API_BASE}/conversations/stats`;

  if (filter?.refresh) {
    url += '?refresh=true';
  }

  const response = await authFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get aggregated conversation stats: ${response.statusText}`);
  }

  return response.json();
}

export async function createTicket(payload: {
  studentName: string;
  studentEmail?: string;
  cohort?: string;
  subject: string;
  reason: string;
  conversationId?: string;
  messageId?: string;
  originalQuery?: string;
  botResponse?: string;
  screenshots?: TicketScreenshot[];
}): Promise<SupportTicket> {
  const response = await authFetch(`${API_BASE}/tickets`, {
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
  let url = `${API_BASE}/tickets`;
  const params = new URLSearchParams();
  if (filter?.studentId) params.set('studentId', filter.studentId);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.assignment) params.set('assignment', filter.assignment);
  if (filter?.instructorName) params.set('instructorName', filter.instructorName);

  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  const response = await authFetch(url);
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
  let url = `${API_BASE}/tickets/paginated`;
  const params = new URLSearchParams();
  if (filter?.studentId) params.set('studentId', filter.studentId);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.assignment) params.set('assignment', filter.assignment);
  if (filter?.instructorName) params.set('instructorName', filter.instructorName);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.limit) params.set('limit', String(filter.limit));

  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  const response = await authFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get paginated tickets: ${response.statusText}`);
  }

  return response.json();
}

export async function getTicketStats(): Promise<TicketStats> {
  const response = await authFetch(`${API_BASE}/tickets/stats`);
  if (!response.ok) {
    throw new Error(`Failed to get ticket stats: ${response.statusText}`);
  }

  return response.json();
}

export async function resolveTicket(
  ticketId: string,
  payload: { resolutionNote?: string },
): Promise<SupportTicket> {
  const response = await authFetch(`${API_BASE}/tickets/${ticketId}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function assignTicket(ticketId: string, instructorId: string): Promise<SupportTicket> {
  const response = await authFetch(`${API_BASE}/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructorId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to assign ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function transferTicket(ticketId: string, toInstructorId: string): Promise<SupportTicket> {
  const response = await authFetch(`${API_BASE}/tickets/${ticketId}/transfer`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toInstructorId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to transfer ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function addTicketMessage(
  ticketId: string,
  payload: {
    message: string;
    screenshots?: TicketScreenshot[];
  },
): Promise<SupportTicket> {
  const response = await authFetch(`${API_BASE}/tickets/${ticketId}/messages`, {
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
  payload: { resolutionNote?: string },
): Promise<SupportTicket> {
  const response = await authFetch(`${API_BASE}/tickets/${ticketId}/close`, {
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
  const response = await authFetch(`${API_BASE}/tickets/${ticketId}`);

  if (!response.ok) {
    throw new Error(`Failed to get ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function getTicketMessages(
  ticketId: string,
  filter?: { page?: number; limit?: number },
): Promise<{
  data: TicketMessage[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> {
  let url = `${API_BASE}/tickets/${ticketId}/messages`;
  const params = new URLSearchParams();
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.limit) params.set('limit', String(filter.limit));

  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  const response = await authFetch(url);

  if (!response.ok) {
    throw new Error(`Failed to get ticket messages: ${response.statusText}`);
  }

  return response.json();
}

export async function startSupportSession(
  ticketId: string,
): Promise<StartSupportSessionResponse> {
  const response = await authFetch(`${API_BASE}/tickets/start-meeting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start support session: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// FEEDBACK ANALYTICS API
// =============================================================================


export interface FeedbackRatio {
  positive: number;
  negative: number;
  total: number;
}

export interface FeedbackHotspot {
  topic: string;
  total: number;
  negative: number;
  negativeRatio: number;
}

export interface FeedbackDrilldownItem {
  id: string;
  conversationId: string;
  messageId: string;
  topic: string;
  rating: 'up' | 'down';
  createdAt: string;
}

export interface DashboardSummary {
  totalQueries: number;
  totalTickets: number;
  aiResolutionRate: number;
  avgResponseMs: number;
  activeStudents: number;
  kbSize: number;
  qaApprovalRate: number;
  qaApproved: number;
  qaPending: number;
  qaRejected: number;
  qaTotal: number;
  openTickets: number;
  resolvedTickets: number;
  ticketResolutionRate: number;
  avgResolutionHours: number;
  discordOpen: number;
  discordClosed: number;
  discordTotal: number;
  totalUsers: number;
  studentCount: number;
  staffCount: number;
}

export interface QaGrowthPoint {
  date: string;
  count: number;
}

export interface MemberPerformance {
  name: string;
  count: number;
}

/**
 * Store analytics feedback (topic-classified) for a chatbot message
 */
export async function postFeedback(payload: {
  conversationId: string;
  messageId: string;
  rating: 'up' | 'down';
  messageContent: string;
}): Promise<void> {
  await authFetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Get feedback hotspots sorted by negative ratio (admin only)
 */
export async function getFeedbackHotspots(): Promise<FeedbackHotspot[]> {
  const response = await authFetch(`${API_BASE}/analytics/hotspots`);
  if (!response.ok) {
    throw new Error(`Failed to fetch feedback hotspots: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get negative feedback drilldown for a specific topic (admin only)
 */
export async function getFeedbackByTopic(topic: string): Promise<FeedbackDrilldownItem[]> {
  const response = await authFetch(`${API_BASE}/analytics/topic/${encodeURIComponent(topic)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch topic drilldown: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get aggregated dashboard summary KPIs
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await authFetch(`${API_BASE}/analytics/dashboard-summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
  }
  return response.json();
}

// =============================================================================
// ADMIN API
// =============================================================================

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'lab_member' | 'admin';
  isActive: boolean;
  isApproved: boolean;
  provider: string;
  createdBy?: string;
  createdAt: string;
}

export interface AdminStats {
  total: number;
  students: number;
  labMembers: number;
  admins: number;
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const response = await authFetch(`${API_BASE}/admin/users`);
  if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);
  return response.json();
}

export async function adminChangeRole(
  userId: string,
  role: 'student' | 'lab_member' | 'admin',
): Promise<AdminUser> {
  const response = await authFetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Failed to change role: ${response.statusText}`);
  }
  return response.json();
}

export async function adminSetStatus(userId: string, isActive: boolean): Promise<AdminUser> {
  const response = await authFetch(`${API_BASE}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Failed to update status: ${response.statusText}`);
  }
  return response.json();
}

export async function adminDeleteUser(userId: string): Promise<{ deleted: boolean }> {
  const response = await authFetch(`${API_BASE}/admin/users/${userId}`, { method: 'DELETE' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Failed to delete user: ${response.statusText}`);
  }
  return response.json();
}

export async function adminListLabMembers(): Promise<AdminUser[]> {
  const response = await authFetch(`${API_BASE}/admin/lab-members`);
  if (!response.ok) throw new Error(`Failed to fetch lab members: ${response.statusText}`);
  return response.json();
}

export async function adminCreateLabMember(data: {
  name: string;
  email: string;
  password: string;
}): Promise<AdminUser> {
  const response = await authFetch(`${API_BASE}/admin/lab-members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Failed to create lab member: ${response.statusText}`);
  }
  return response.json();
}

export async function adminUpdateLabMember(
  id: string,
  data: { name?: string; email?: string; password?: string },
): Promise<AdminUser> {
  const response = await authFetch(`${API_BASE}/admin/lab-members/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Failed to update lab member: ${response.statusText}`);
  }
  return response.json();
}

export async function adminDeleteLabMember(id: string): Promise<{ deleted: boolean }> {
  const response = await authFetch(`${API_BASE}/admin/lab-members/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Failed to delete lab member: ${response.statusText}`);
  }
  return response.json();
}

export async function adminGetStats(): Promise<AdminStats> {
  const response = await authFetch(`${API_BASE}/admin/stats`);
  if (!response.ok) throw new Error(`Failed to fetch admin stats: ${response.statusText}`);
  return response.json();
}

/**
 * Get QA accumulation metrics (admin only)
 */
export async function adminGetQaGrowth(): Promise<QaGrowthPoint[]> {
  const response = await authFetch(`${API_BASE}/admin/analytics/qa-growth`);
  if (!response.ok) throw new Error(`Failed to fetch QA growth: ${response.statusText}`);
  return response.json();
}

/**
 * Get Lab Member Performance metrics (admin only)
 */
export async function adminGetPerformance(): Promise<MemberPerformance[]> {
  const response = await authFetch(`${API_BASE}/admin/analytics/performance`);
  if (!response.ok) throw new Error(`Failed to fetch member performance: ${response.statusText}`);
  return response.json();
}

// =============================================================================
// DISCORD INGESTION API
// =============================================================================

export interface DiscordMessageItem {
  role: 'user' | 'agent' | 'system';
  type: 'message' | 'ticket_reason';
  text: string;
  attachments: string[];
  timestamp: string;
  authorName?: string;
  authorId?: string;
}

export interface DiscordConversationSummary {
  _id: string;
  ticketNumber: string;
  discordChannelId: string;
  status: 'open' | 'closed';
  source: 'discord_live' | 'discord_transcript';
  transcriptProcessed: boolean;
  /** Discord user ID of the student who opened this ticket. */
  ticketOwnerId?: string;
  /** Display name of the ticket owner. */
  ticketOwnerName?: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscordConversationDetail extends DiscordConversationSummary {
  messages: DiscordMessageItem[];
}

export interface DiscordStats {
  total: number;
  open: number;
  closed: number;
}

export async function getDiscordConversations(
  status?: 'open' | 'closed',
): Promise<DiscordConversationSummary[]> {
  let url = `${API_BASE}/discord-ingestion/conversations`;
  if (status) url += `?status=${encodeURIComponent(status)}`;
  const response = await authFetch(url);
  if (!response.ok) throw new Error(`Failed to fetch Discord conversations: ${response.statusText}`);
  return response.json();
}

export async function getDiscordConversation(
  ticketNumber: string,
): Promise<DiscordConversationDetail> {
  const response = await authFetch(`${API_BASE}/discord-ingestion/conversations/${ticketNumber}`);
  if (!response.ok) throw new Error(`Failed to fetch Discord conversation: ${response.statusText}`);
  return response.json();
}

export async function getDiscordStats(): Promise<DiscordStats> {
  const response = await authFetch(`${API_BASE}/discord-ingestion/stats`);
  if (!response.ok) throw new Error(`Failed to fetch Discord stats: ${response.statusText}`);
  return response.json();
}

let discordSocket: any | null = null;

function getDiscordSocketUrl() {
  return API_BASE.replace(/\/api\/?$/, '');
}

async function getDiscordSocket() {
  await loadSocketIoClient();
  if (!discordSocket) {
    discordSocket = window.io?.(`${getDiscordSocketUrl()}/discord`, {
      transports: ['websocket'],
      withCredentials: true,
      // Automatically reconnect with short backoff
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return discordSocket;
}

export function subscribeToDiscordTicket(
  ticketNumber: string,
  onMessage: (payload: { ticketNumber: string; message: DiscordMessageItem }) => void,
  onTranscriptReady: (payload: { ticketNumber: string; messageCount: number }) => void,
): () => void {
  let isDisposed = false;
  let socket: any | null = null;

  const msgHandler = (payload: { ticketNumber: string; message: DiscordMessageItem }) => {
    if (payload.ticketNumber !== ticketNumber) return;
    onMessage(payload);
  };

  const transcriptHandler = (payload: { ticketNumber: string; messageCount: number }) => {
    if (payload.ticketNumber !== ticketNumber) return;
    onTranscriptReady(payload);
  };

  // Re-join the room after every reconnect so messages resume streaming
  const reconnectHandler = () => {
    if (!isDisposed && socket) {
      socket.emit('ticket:join', { ticketNumber });
    }
  };

  void getDiscordSocket()
    .then((sock) => {
      if (isDisposed) return;
      socket = sock;
      socket.emit('ticket:join', { ticketNumber });
      socket.on('new_message', msgHandler);
      socket.on('transcript_ready', transcriptHandler);
      socket.on('connect', reconnectHandler);
    })
    .catch((err: unknown) => console.error('Discord WS error:', err));

  return () => {
    isDisposed = true;
    if (!socket) return;
    socket.off('new_message', msgHandler);
    socket.off('transcript_ready', transcriptHandler);
    socket.off('connect', reconnectHandler);
    socket.emit('ticket:leave', { ticketNumber });
  };
}

/**
 * Subscribe to global Discord activity events (not room-specific).
 * Used by the list view to refresh counts/status when any ticket has activity.
 *
 * Events: 'new_message' | 'transcript_ready' | 'ticket_created'
 */
export function subscribeToDiscordActivity(
  onActivity: (payload: {
    ticketNumber: string;
    event: 'new_message' | 'transcript_ready' | 'ticket_created' | 'ticket_closed';
  }) => void,
): () => void {
  let isDisposed = false;
  let socket: any | null = null;

  const handler = (payload: {
    ticketNumber: string;
    event: 'new_message' | 'transcript_ready' | 'ticket_created' | 'ticket_closed';
  }) => {
    onActivity(payload);
  };

  void getDiscordSocket()
    .then((sock) => {
      if (isDisposed) return;
      socket = sock;
      socket.on('discord_activity', handler);
    })
    .catch((err: unknown) => console.error('Discord activity WS error:', err));

  return () => {
    isDisposed = true;
    if (!socket) return;
    socket.off('discord_activity', handler);
  };
}

// =============================================================================
// QA PAIRS MANAGEMENT API (admin — qa_pairs_v2)
// =============================================================================

export interface QaPairV2 {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  model?: string;
  dimensions?: number;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QaPairsPaginatedResponse {
  data: QaPairV2[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export async function adminListQaPairs(
  page = 1,
  limit = 20,
  search?: string,
): Promise<QaPairsPaginatedResponse> {
  let url = `${API_BASE}/admin/qa-pairs`;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (search) params.set('search', search);

  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  const response = await authFetch(url);
  if (!response.ok) throw new Error(`Failed to fetch QA pairs: ${response.statusText}`);
  return response.json();
}

export async function adminUpdateQaPair(
  id: string,
  data: { question?: string; answer?: string; category?: string },
): Promise<QaPairV2> {
  const response = await authFetch(`${API_BASE}/admin/qa-pairs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Failed to update QA pair: ${response.statusText}`);
  }
  return response.json();
}

export async function adminDeleteQaPair(id: string): Promise<{ deleted: boolean }> {
  const response = await authFetch(`${API_BASE}/admin/qa-pairs/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).message || `Failed to delete QA pair: ${response.statusText}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// AI Analytics API
// ---------------------------------------------------------------------------

export interface AIInsight {
  title: string;
  summary: string;
  insight: string;
  confidence_score: number;
  recommended_actions: string[];
  is_verified: boolean;
}

export interface NLQResponse {
  query: string;
  data: any[];
  summary: string;
  chart: {
    type: 'line' | 'bar' | 'pie' | 'kpi';
    config: any;
  };
}

export async function getAiInsights(metric: 'queries' | 'tickets', forceRefresh: boolean = false): Promise<AIInsight[]> {
  const response = await authFetch(`${API_BASE}/ai/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric, forceRefresh }),
  });
  if (!response.ok) throw new Error('Failed to fetch AI insights');
  return response.json();
}

export async function askYourData(query: string): Promise<NLQResponse> {
  const response = await authFetch(`${API_BASE}/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'NLQ processing failed');
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Unified API Object
// ---------------------------------------------------------------------------

export const api = {
  auth: {
    async firebaseSync(idToken: string) {
      const response = await fetch(`${API_BASE}/auth/firebase-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Verification sync failed');
      }
      return response.json();
    },
    async getProfile() {
      const response = await authFetch(`${API_BASE}/auth/me`);
      if (!response.ok) throw new Error('Failed to get profile');
      return response.json();
    }
  },
  proposals: {
    fetch: fetchProposals,
    stats: fetchProposalStats,
    create: createProposal,
    createBulk: createBulkProposals,
    approve: approveProposal,
    reject: rejectProposal,
    delete: deleteProposal,
  },
  chat: {
    sendMessage: sendChatMessage,
    sendMessageStream: sendChatMessageStream,
    addFeedback: addMessageFeedback,
    getConversation,
    getConversations,
    getStats: getChatStats,
    resolve: resolveConversation,
    escalate: escalateConversation,
    getFeedback: getMessagesWithFeedback,
    createConversation: createChatConversation,
    getStudentConversations,
    generateQa: generateQaFromConversation,
    deleteConversation: deleteChatConversation,
  },
  conversations: {
    list: getAggregatedConversations,
    detail: getAggregatedConversationDetail,
    stats: getAggregatedConversationStats,
  },
  // Generic methods for axios-like compatibility
  async get(url: string, init?: RequestInit) {
    const response = await authFetch(url.startsWith('/') ? `${API_BASE}${url}` : url, { 
      ...init, 
      method: 'GET' 
    });
    if (!response.ok) throw new Error(`GET ${url} failed: ${response.statusText}`);
    return { data: await response.json(), status: response.status, ok: response.ok };
  },
  async post(url: string, body?: any, init?: RequestInit) {
    const response = await authFetch(url.startsWith('/') ? `${API_BASE}${url}` : url, {
      ...init,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`POST ${url} failed: ${response.statusText}`);
    return { data: await response.json(), status: response.status, ok: response.ok };
  },
  async patch(url: string, body?: any, init?: RequestInit) {
    const response = await authFetch(url.startsWith('/') ? `${API_BASE}${url}` : url, {
      ...init,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`PATCH ${url} failed: ${response.statusText}`);
    return { data: await response.json(), status: response.status, ok: response.ok };
  },
  async delete(url: string, init?: RequestInit) {
    const response = await authFetch(url.startsWith('/') ? `${API_BASE}${url}` : url, {
      ...init,
      method: 'DELETE'
    });
    if (!response.ok && response.status !== 204) throw new Error(`DELETE ${url} failed: ${response.statusText}`);
    return { data: response.status === 204 ? null : await response.json(), status: response.status, ok: response.ok };
  }
};
