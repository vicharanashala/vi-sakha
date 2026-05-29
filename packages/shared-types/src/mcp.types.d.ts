export interface McpToolRegistry {
    tools: McpToolDefinition[];
    version: string;
    serverName: string;
}
export interface McpToolDefinition {
    name: string;
    description: string;
    category: McpToolCategory;
    inputSchema: JsonSchema;
    outputSchema?: JsonSchema;
    isAsync: boolean;
    supportsStreaming: boolean;
    timeoutMs: number;
    maxRetries: number;
    requiredPermissions: McpPermission[];
}
export type McpToolCategory = 'retrieval' | 'memory' | 'vision' | 'document' | 'external' | 'pipeline' | 'utility';
export interface McpToolRequest {
    toolName: string;
    arguments: Record<string, unknown>;
    context: McpRequestContext;
}
export interface McpToolResponse {
    success: boolean;
    content: McpContent[];
    metadata: McpResponseMetadata;
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
export type McpErrorCode = 'TOOL_NOT_FOUND' | 'INVALID_INPUT' | 'EXECUTION_FAILED' | 'TIMEOUT' | 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
export interface McpRequestContext {
    userId: string;
    sessionId: string;
    traceId: string;
    permissions: McpPermission[];
    apiKeyId?: string;
}
export type McpPermission = 'read:knowledge' | 'write:knowledge' | 'read:memory' | 'write:memory' | 'execute:vision' | 'execute:pipeline' | 'execute:external' | 'admin:tools';
export type McpStreamEvent = {
    type: 'tool_start';
    toolName: string;
} | {
    type: 'progress';
    toolName: string;
    progress: number;
    message: string;
} | {
    type: 'delta';
    text: string;
} | {
    type: 'tool_complete';
    toolName: string;
    result: McpToolResponse;
} | {
    type: 'error';
    error: McpError;
} | {
    type: 'done';
};
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
