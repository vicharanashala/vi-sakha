import type { Attachment, ContextSource, ExecutionNode, ReflectionResult } from './agent.types';

/**
 * Agent Stream Events
 * 
 * Defines the structure of events emitted during agent execution.
 */
export type AgentStreamEvent = 
  | { type: 'node'; name: string; status: 'start' | 'end' }
  | { type: 'plan'; plan: any }
  | { type: 'retrieval'; contexts: ContextSource[] }
  | { type: 'token'; token: string }
  | { type: 'delta'; text: string }
  | { type: 'reflection'; result: ReflectionResult }
  | { type: 'error'; error?: any; message: string }
  | { type: 'final'; answer: string }
  | { type: 'done'; assistantMessageId?: string; trace?: any };

/**
 * Re-export core types
 */
export * from './agent.types';
export * from './memory.types';
export * from './mcp.types';
export * from './retrieval.types';
export * from './vision.types';
