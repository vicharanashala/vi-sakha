import { Annotation } from "@langchain/langgraph";
import type { 
  AgentState as IAgentState,
  ContextSource as IContextSource,
  ExecutionNode as IExecutionNode,
  Attachment as IAttachment,
  ReflectionResult
} from "@visakha/shared-types";

/**
 * Agent State Definitions
 */

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentPlan {
  intent: string;
  steps: string[];
  tools: string[];
  needs_retrieval: boolean;
  needs_web_search: boolean;
  needs_hp_lookup: boolean;
}

/**
 * LangGraph State Annotation
 * 
 * Defines how the state is updated as it flows through the graph.
 */
export const AgentStateAnnotation = Annotation.Root({
  query: Annotation<string>(),
  
  history: Annotation<AgentMessage[]>({
    reducer: (x: AgentMessage[], y: AgentMessage[]) => x.concat(y),
    default: () => [],
  }),

  conversationHistory: Annotation<AgentMessage[]>({
    reducer: (x: AgentMessage[], y: AgentMessage[]) => x.concat(y),
    default: () => [],
  }),

  attachments: Annotation<IAttachment[]>({
    reducer: (x: IAttachment[], y: IAttachment[]) => x.concat(y),
    default: () => [],
  }),

  plan: Annotation<AgentPlan | null>({
    reducer: (x: AgentPlan | null, y: AgentPlan | null) => y ?? x,
    default: () => null,
  }),

  /** Results from tool executions */
  toolResults: Annotation<any[]>({
    reducer: (x: any[], y: any[]) => x.concat(y),
    default: () => [],
  }),

  retrievedContext: Annotation<IContextSource[]>({
    reducer: (x: IContextSource[], y: IContextSource[]) => x.concat(y),
    default: () => [],
  }),

  reflections: Annotation<ReflectionResult[]>({
    reducer: (x: ReflectionResult[], y: ReflectionResult[]) => x.concat(y),
    default: () => [],
  }),

  finalResponse: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => "",
  }),

  draftResponse: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => "",
  }),

  isSatisfactory: Annotation<boolean>({
    reducer: (x: boolean, y: boolean) => y ?? x,
    default: () => false,
  }),

  revisionCount: Annotation<number>({
    reducer: (x: number, y: number) => y ?? x,
    default: () => 0,
  }),

  loopCount: Annotation<number>({
    reducer: (x: number, y: number) => y ?? x,
    default: () => 0,
  }),

  executionTrace: Annotation<{ nodes: IExecutionNode[]; totalTokens: number }>({
    reducer: (x: { nodes: IExecutionNode[]; totalTokens: number }, y: { nodes: IExecutionNode[]; totalTokens: number }) => ({
      nodes: x.nodes.concat(y.nodes),
      totalTokens: x.totalTokens + y.totalTokens
    }),
    default: () => ({ nodes: [], totalTokens: 0 }),
  }),

  error: Annotation<any | null>({
    reducer: (x: any, y: any) => y ?? x,
    default: () => null,
  }),

  cohort: Annotation<string | null>({
    reducer: (x: string | null, y: string | null) => y ?? x,
    default: () => null,
  }),

  studentEmail: Annotation<string | null>({
    reducer: (x: string | null, y: string | null) => y ?? x,
    default: () => null,
  }),

  studentName: Annotation<string | null>({
    reducer: (x: string | null, y: string | null) => y ?? x,
    default: () => null,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
