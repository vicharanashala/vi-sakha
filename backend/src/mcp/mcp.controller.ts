import { Controller, Post, Body, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { McpService } from './mcp.service';
import { McpRequestDto } from './dto/mcp-request.dto';
import { McpResponseDto } from './dto/mcp-response.dto';
import { JwtOrApiKeyGuard } from '../auth/jwt-or-api-key.guard';

@ApiTags('MCP (Model Context Protocol)')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @ApiOperation({ summary: 'Process an MCP query', description: 'Centralized entry point for answering user queries using semantic search and plugin context.' })
  @ApiResponse({ status: 200, description: 'LLM answer with aggregated context sources and confidence metrics', type: McpResponseDto })
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() dto: McpRequestDto): Promise<McpResponseDto> {
    return this.mcpService.processQuery(dto);
  }

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
}
