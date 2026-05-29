import { NestFactory } from '@nestjs/core';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { AppModule } from '../../../app.module';
import { McpService } from './mcp.service';

/**
 * Standard MCP Server implementation over Stdio.
 * 
 * NOTE: NestJS default logging is disabled (logger: false) to prevent
 * console logs from writing to stdout and corrupting the JSON-RPC
 * message stream expected by Model Context Protocol clients.
 */
async function bootstrap() {
  // Create headless NestJS application context securely
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  
  // Resolve McpService from the context
  const mcpService = app.get(McpService);

  // Initialize MCP Server
  const server = new Server(
    {
      name: "vinternship-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Expose Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "mcp_query",
          description: "Process an MCP query to answer questions using semantic search and internal contexts (RAG).",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The semantic question or context search query."
              },
              context_sources: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Optional array of context scopes (e.g. ['discord_ticket_123', 'qa_pairs'])"
              }
            },
            required: ["query"]
          }
        },
        {
          name: "run_pipeline",
          description: "Execute backend system pipeline tools such as embeddings backfill.",
          inputSchema: {
            type: "object",
            properties: {
              mode: {
                type: "string",
                description: "The pipeline mode to execute (e.g., 'full', 'backfill_embeddings', 'extract_qa')"
              }
            },
            required: ["mode"]
          }
        }
      ]
    };
  });

  // Handle Tool Calling
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'mcp_query') {
      const q = String(request.params.arguments?.query);
      const cs = request.params.arguments?.context_sources as string[] | undefined;
      
      try {
        const result = await mcpService.processQuery({ query: q, context_sources: cs });
        return {
          content: [
            {
              type: "text",
              text: result.answer + (result.references?.length ? '\n\nSources used: ' + JSON.stringify(result.references) : '')
            }
          ]
        };
      } catch (err: any) {
         return {
            isError: true,
            content: [{ type: "text", text: `Error processing query: ${err.message}` }]
         };
      }
    }

    if (request.params.name === 'run_pipeline') {
      const mode = String(request.params.arguments?.mode);
      try {
        const result = await mcpService.runPipeline(mode as 'full' | 'backfill_embeddings' | 'extract_qa');
        return {
          content: [
            {
              type: "text",
              text: `Pipeline execution triggered. Response: ${JSON.stringify(result)}`
            }
          ]
        };
      } catch (err: any) {
         return {
           isError: true,
           content: [{ type: "text", text: `Error executing pipeline: ${err.message}` }]
         };
      }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  });

  // Connect Transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // stderr is safe for informational logs during an active Stdio connection
  console.error("VInternship Native MCP Server running gracefully on stdio.");
}

bootstrap().catch(err => {
  console.error("Fatal initialization error:", err);
  process.exit(1);
});
