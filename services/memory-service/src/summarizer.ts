import { LLMFactory } from "@visakha/agent-orchestrator/dist/llm/llm-factory";
import { MEMORY_SUMMARY_TEMPLATE, renderTemplate } from "@visakha/prompts";
import { createLogger } from "@visakha/shared-utils";
import { loadPlatformConfig } from "@visakha/config";
import type { 
  ConversationSummaryRequest, 
  ConversationSummaryResult,
  SessionMessage
} from "@visakha/shared-types";

const log = createLogger("memory-summarizer");

/**
 * Memory Summarizer
 * 
 * Compresses active conversation history into a structured episode summary.
 * Extracted topics and preferences are stored in Episodic Memory.
 */
export class MemorySummarizer {
  private config = loadPlatformConfig();

  /**
   * Summarize a conversation.
   */
  async summarize(request: ConversationSummaryRequest): Promise<ConversationSummaryResult> {
    // We use the synthesizer model for summarization as it needs good reasoning
    const model = LLMFactory.createCustomModel('anthropic', this.config.memory.episodicSummaryModel);
    
    log.info("Summarizing conversation", { conversationId: request.conversationId });

    const transcript = this.buildTranscript(request.messages);

    const prompt = renderTemplate(MEMORY_SUMMARY_TEMPLATE, {
      transcript
    });

    try {
      const response = await model.invoke(prompt);
      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse summary response as JSON");
      }

      const result = JSON.parse(jsonMatch[0]) as ConversationSummaryResult;
      
      log.info("Summary generated", { 
        topics: result.topics.length, 
        prefs: result.preferences.length 
      });

      return result;
    } catch (error) {
      log.error("Summarization failed", { error: (error as Error).message });
      return {
        summary: "Conversation summary failed to generate.",
        topics: [],
        preferences: [],
        keyEntities: [],
        resolution: 'abandoned'
      };
    }
  }

  private buildTranscript(messages: SessionMessage[]): string {
    return messages
      .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n");
  }
}
