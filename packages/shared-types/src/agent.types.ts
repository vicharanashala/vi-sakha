/**
 * Attachment Interface
 */
export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64
}

/**
 * Context Source Interface
 */
export interface ContextSource {
  content: string;
  score: number;
  source: string;
  type: "vector" | "keyword" | "image" | "manual" | "qa_pair" | "chunk" | "web";
  metadata: Record<string, any>;
}

/**
 * Execution Node
 */
export interface ExecutionNode {
  nodeName: string;
  startTime: Date;
  endTime: Date;
  status: 'success' | 'failure';
  tokensUsed: number;
  metadata?: Record<string, any>;
}

/**
 * Reflection Result
 */
export interface ReflectionResult {
  isSatisfactory?: boolean;
  critique?: string;
  suggestions?: string[];
  shouldRetry: boolean;
  iteration: number;
  quality?: string;
  score?: number;
  issues?: string[];
}

/**
 * Agent State
 */
export interface AgentState {
  query: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  attachments: Attachment[];
  retrievedContext: ContextSource[];
  finalResponse: string;
  draftResponse: string;
  isSatisfactory: boolean;
  revisionCount: number;
  loopCount: number;
  executionTrace: {
    nodes: ExecutionNode[];
    totalTokens: number;
  };
  error: any | null;
  suggestions?: string[];
  cohort?: string;
  studentEmail?: string;
  studentName?: string;
}
