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
