import { Controller, Post, Body, HttpCode, HttpStatus, Param, UseGuards, Get, Req, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { McpRequestDto } from './dto/mcp-request.dto';
import { McpResponseDto } from './dto/mcp-response.dto';
import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

@ApiTags('MCP (Model Context Protocol)')
@Controller('mcp')
export class McpController {
  private readonly mcpServer: Server;
  private readonly activeTransports = new Map<string, SSEServerTransport>();

  constructor(private readonly mcpService: McpService) {
    // Initialize standard MCP Server
    this.mcpServer = new Server(
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

    // Register all tools and handlers
    this.registerMcpHandlers();
  }

  // --- STANDARD CUSTOM HTTP API ENDPOINTS (legacy/custom web integration) ---

  @ApiBearerAuth()
  @UseGuards(JwtOrApiKeyGuard)
  @ApiOperation({ summary: 'Process an MCP query', description: 'Centralized entry point for answering user queries using semantic search and plugin context.' })
  @ApiResponse({ status: 200, description: 'LLM answer with aggregated context sources and confidence metrics', type: McpResponseDto })
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() dto: McpRequestDto): Promise<McpResponseDto> {
    return this.mcpService.processQuery(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtOrApiKeyGuard)
  @ApiOperation({ summary: 'Execute an MCP Tool', description: 'Runs a backend pipeline or maintenance task' })
  @ApiResponse({ status: 200, description: 'Tool executed successfully' })
  @Post('tools/:toolName')
  @HttpCode(HttpStatus.OK)
  async executeTool(@Param('toolName') toolName: string) {
    if (toolName === 'run_pipeline') {
      return this.mcpService.runPipeline('full');
    }
    return { success: false, error: 'Tool not found' };
  }

  // --- OFFICIAL MCP SSE SPECIFICATION ENDPOINTS FOR REMOTE CLIENTS ---

  @ApiOperation({ summary: 'Establish MCP SSE Channel', description: 'Server-Sent Events transport endpoint for remote MCP clients' })
  @Get('sse')
  async establishSse(@Req() req: Request, @Res() res: Response) {
    const connectionId = Math.random().toString(36).substring(2, 15);
    
    // SSEServerTransport parameters: 
    // 1. Endpoint where client POSTs client-to-server messages
    // 2. Express response object used to stream server-to-client events
    const transport = new SSEServerTransport(
      `/api/mcp/messages?connectionId=${connectionId}`,
      res
    );

    this.activeTransports.set(connectionId, transport);

    req.on('close', () => {
      this.activeTransports.delete(connectionId);
    });

    await this.mcpServer.connect(transport);
  }

  @ApiOperation({ summary: 'Post MCP Messages', description: 'Client-to-server channel for standard JSON-RPC packets' })
  @Post('messages')
  async handleMessage(
    @Query('connectionId') connectionId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const transport = this.activeTransports.get(connectionId);
    if (!transport) {
      return res.status(HttpStatus.BAD_REQUEST).send('Session not found or has expired.');
    }

    await transport.handleMessage(req.body);
    res.status(HttpStatus.OK).end();
  }

  private registerMcpHandlers() {
    // List tools
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
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

    // Call tool
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'mcp_query') {
        const q = String(request.params.arguments?.query);
        const cs = request.params.arguments?.context_sources as string[] | undefined;
        
        try {
          const result = await this.mcpService.processQuery({ query: q, context_sources: cs });
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
          const result = await this.mcpService.runPipeline(mode as 'full' | 'backfill_embeddings' | 'extract_qa');
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
  }
}
