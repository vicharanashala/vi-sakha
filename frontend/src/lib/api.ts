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
