export type ConversationSource = 'rag' | 'discord' | 'librechat';

export interface FetchConversationOptions {
  includeMessages?: boolean;
  limit?: number;
}

export interface PluginConversationStats {
  source: ConversationSource;
  conversationCount: number;
  totalMessages: number;
  avgConfidence?: number | null;
}

export interface NormalizedMessage {
  role: 'user' | 'assistant';
  text: string;
  author?: string;
  timestamp?: string;
  type?: 'message' | 'ticket_reason';
  attachments?: string[];
}

export interface NormalizedConversation {
  conversation_id: string;
  source: ConversationSource;
  user: string;
  timestamp: string;
  message_count: number;
  confidence?: number | null;
  last_message_preview?: string;
  messages: NormalizedMessage[];
  mainReason?: string;
  registeredEmail?: string;
  cohortName?: string;
  status?: string;
}

export interface ConversationPlugin {
  name: ConversationSource;
  fetchConversations(options?: FetchConversationOptions): Promise<NormalizedConversation[]>;
  fetchConversationById?(conversationId: string): Promise<NormalizedConversation | null>;
  fetchStats?(): Promise<PluginConversationStats>;
}
