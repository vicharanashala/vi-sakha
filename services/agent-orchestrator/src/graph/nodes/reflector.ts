import { LLMFactory } from "../../llm/llm-factory";
import { REFLECTOR_SYSTEM_PROMPT } from "@visakha/prompts";
import { createLogger, estimateTokens } from "@visakha/shared-utils";
import type { AgentState } from "../state";
import type { ReflectionResult } from "@visakha/shared-types";
import { loadPlatformConfig } from "@visakha/config";

const log = createLogger("reflector-node");
const config = loadPlatformConfig();

/**
 * Reflector Node
 * 
 * Evaluates the draft response for quality and accuracy.
 */
export async function reflectorNode(state: AgentState): Promise<Partial<AgentState>> {
  const model = LLMFactory.getModel('reflector');
  const loopCount = state.loopCount + 1;
  
  log.info(`Executing reflector node (iteration ${loopCount})`);

  // Don't reflect if we've reached the limit
  if (loopCount > config.agent.maxReflectionLoops) {
    log.info("Reflection limit reached, accepting current draft");
    return {
      finalResponse: state.draftResponse,
      loopCount
    };
  }

  const prompt = `${REFLECTOR_SYSTEM_PROMPT}

<INPUT>
USER QUERY: ${state.query}

RETRIEVED CONTEXT:
${state.retrievedContext.map((c: any) => c.content).join("\n\n")}

DRAFT RESPONSE:
${state.draftResponse}
</INPUT>`;

  try {
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse reflector response as JSON");
    }

    const reflection = JSON.parse(jsonMatch[0]) as ReflectionResult;
    reflection.iteration = loopCount;

    log.info("Reflection completed", { quality: reflection.quality, shouldRetry: reflection.shouldRetry });

    const updates: Partial<AgentState> = {
      reflections: [...state.reflections, reflection],
      loopCount,
      executionTrace: {
        ...state.executionTrace,
        nodes: [
          ...state.executionTrace.nodes,
          {
            nodeName: "reflector",
            startTime: new Date(),
            endTime: new Date(),
            tokensUsed: estimateTokens(prompt) + estimateTokens(content),
            status: "success",
            metadata: { quality: reflection.quality }
          }
        ]
      }
    };

    if (!reflection.shouldRetry) {
      updates.finalResponse = state.draftResponse;
    }

    return updates;
  } catch (error) {
    log.error("Reflector node failed", { error: (error as Error).message });
    // If reflector fails, we fall back to the draft response rather than failing the whole graph
    return {
      finalResponse: state.draftResponse,
      loopCount,
      reflections: [...state.reflections, { 
        iteration: loopCount, 
        quality: 'failed', 
        score: 0, 
        issues: ["Reflector service failure"], 
        suggestions: [], 
        shouldRetry: false 
      }]
    };
  }
}
