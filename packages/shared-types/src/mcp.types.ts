/**
 * MCP (Model Context Protocol) Types
 *
 * Types for the expanded MCP tool server with proper schema-driven
 * tool registry, authentication, and streaming support.
 */

// ── Tool Registry ────────────────────────────────────────────────────────────

export interface McpToolRegistry {
  tools: McpToolDefinition[];
  version: string;
  serverName: string;
}

export interface McpToolDefinition {
  /** Unique tool identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Tool category for routing */
  category: McpToolCategory;

  /** JSON Schema for input validation */
  inputSchema: JsonSchema;

  /** JSON Schema for output validation */
  outputSchema?: JsonSchema;

  /** Whether this tool supports async execution */
  isAsync: boolean;

  /** Whether this tool supports streaming output */
  supportsStreaming: boolean;

  /** Maximum execution time in milliseconds */
  timeoutMs: number;

  /** Maximum retry count on failure */
  maxRetries: number;

  /** Required permissions to invoke this tool */
  requiredPermissions: McpPermission[];
}

export type McpToolCategory =
  | 'retrieval'
  | 'memory'
  | 'vision'
  | 'document'
  | 'external'
  | 'pipeline'
  | 'utility';

// ── Tool Execution ───────────────────────────────────────────────────────────

export interface McpToolRequest {
  /** Tool to invoke */
  toolName: string;

  /** Validated input arguments */
  arguments: Record<string, unknown>;

  /** Request context (user, session, trace) */
  context: McpRequestContext;
}

export interface McpToolResponse {
  /** Whether execution succeeded */
  success: boolean;

  /** Tool output content */
  content: McpContent[];

  /** Execution metadata */
  metadata: McpResponseMetadata;

  /** Error details (if !success) */
  error?: McpError;
}

export interface McpContent {
  type: 'text' | 'image' | 'json' | 'error';
  text?: string;
  data?: unknown;
  mimeType?: string;
}

export interface McpResponseMetadata {
  executionTimeMs: number;
  tokensUsed: number;
  toolName: string;
  traceId: string;
}

export interface McpError {
  code: McpErrorCode;
  message: string;
  details?: unknown;
}

export type McpErrorCode =
  | 'TOOL_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'EXECUTION_FAILED'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// ── Authentication & Permissions ─────────────────────────────────────────────

export interface McpRequestContext {
  userId: string;
  sessionId: string;
  traceId: string;
  permissions: McpPermission[];
  apiKeyId?: string;
}

export type McpPermission =
  | 'read:knowledge'
  | 'write:knowledge'
  | 'read:memory'
  | 'write:memory'
  | 'execute:vision'
  | 'execute:pipeline'
  | 'execute:external'
  | 'admin:tools';

// ── Streaming ────────────────────────────────────────────────────────────────

export type McpStreamEvent =
  | { type: 'tool_start'; toolName: string }
  | { type: 'progress'; toolName: string; progress: number; message: string }
  | { type: 'delta'; text: string }
  | { type: 'tool_complete'; toolName: string; result: McpToolResponse }
  | { type: 'error'; error: McpError }
  | { type: 'done' };

// ── Transport ────────────────────────────────────────────────────────────────

export type McpTransportType = 'stdio' | 'websocket' | 'sse' | 'http';

export interface McpServerConfig {
  name: string;
  version: string;
  transports: McpTransportType[];
  authentication: McpAuthConfig;
  rateLimiting: McpRateLimitConfig;
}

export interface McpAuthConfig {
  type: 'api_key' | 'jwt' | 'none';
  headerName: string;
}

export interface McpRateLimitConfig {
  maxRequestsPerMinute: number;
  maxConcurrentTools: number;
  maxTokensPerMinute: number;
}

// ── JSON Schema Helper ───────────────────────────────────────────────────────

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  description?: string;
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  items?: JsonSchemaProperty;
  enum?: string[];
  default?: unknown;
}
