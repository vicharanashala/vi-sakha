import { LLMFactory } from "../../llm/llm-factory";
import { SYNTHESIZER_SYSTEM_PROMPT, renderTemplate, CONTEXT_ASSEMBLY_TEMPLATE } from "@visakha/prompts";
import { createLogger, estimateTokens } from "@visakha/shared-utils";
import type { AgentState } from "../state";

const log = createLogger("synthesizer-node");

/**
 * Synthesizer Node
 * 
 * Combines retrieved context, history, and query into a helpful response.
 */
export async function synthesizerNode(state: AgentState): Promise<Partial<AgentState>> {
  const model = LLMFactory.getModel('synthesizer');
  
  log.info("Executing synthesizer node");

  // Assemble context using the prompt template
  const contextStr = renderTemplate(CONTEXT_ASSEMBLY_TEMPLATE, {
    contexts: state.retrievedContext,
    query: state.query
  });

  const historyStr = state.conversationHistory
    .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `${SYNTHESIZER_SYSTEM_PROMPT}

<CONTEXT>
CONVERSATION HISTORY:
${historyStr || "None"}

RETRIEVED KNOWLEDGE:
${contextStr}

TOOL RESULTS:
${JSON.stringify(state.toolResults)}
</CONTEXT>

USER QUERY: ${state.query}`;

  try {
    const response = await model.invoke(prompt);
    const draftResponse = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    log.info("Draft response synthesized", { length: draftResponse.length });

    return {
      draftResponse,
      executionTrace: {
        ...state.executionTrace,
        nodes: [
          ...state.executionTrace.nodes,
          {
            nodeName: "synthesizer",
            startTime: new Date(),
            endTime: new Date(),
            tokensUsed: estimateTokens(prompt) + estimateTokens(draftResponse),
            status: "success",
          }
        ]
      }
    };
  } catch (error) {
    log.error("Synthesizer node failed", { error: (error as Error).message });
    return {
      error: {
        code: "SYNTHESIS_FAILURE",
        message: "Failed to synthesize response",
        node: "synthesizer",
        recoverable: true,
      }
    };
  }
}
