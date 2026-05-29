import { LLMFactory } from "../../llm/llm-factory";
import { PLANNER_SYSTEM_PROMPT } from "@visakha/prompts";
import { createLogger, estimateTokens } from "@visakha/shared-utils";
import type { AgentState, AgentPlan, AgentMessage } from "../state";

const log = createLogger("planner-node");

/**
 * Planner Node
 * 
 * First node in the agent graph. Classifies intent and decides which tools to call.
 */
export async function plannerNode(state: AgentState): Promise<Partial<AgentState>> {
  const model = LLMFactory.getModel('planner');
  
  log.info("Executing planner node", { query: state.query });

  const historyStr = state.conversationHistory
    .map((m: AgentMessage) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `${PLANNER_SYSTEM_PROMPT}

<CONTEXT>
CONVERSATION HISTORY:
${historyStr || "None"}

USER QUERY:
${state.query}

ATTACHMENTS:
${state.attachments.length} files attached
</CONTEXT>`;

  try {
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse planner response as JSON");
    }

    const plan = JSON.parse(jsonMatch[0]) as AgentPlan;
    
    log.info("Plan generated", { intent: plan.intent, tools: plan.tools });

    return {
      plan,
      executionTrace: {
        ...state.executionTrace,
        nodes: [
          ...state.executionTrace.nodes,
          {
            nodeName: "planner",
            startTime: new Date(),
            endTime: new Date(),
            tokensUsed: estimateTokens(prompt) + estimateTokens(content),
            status: "success",
          }
        ]
      }
    };
  } catch (error) {
    log.error("Planner node failed", { error: (error as Error).message });
    return {
      finalResponse: "I encountered an error while planning your request. Please try again.",
      executionTrace: {
        ...state.executionTrace,
        nodes: [
          ...state.executionTrace.nodes,
          {
            nodeName: "planner",
            startTime: new Date(),
            endTime: new Date(),
            tokensUsed: 0,
            status: "failure",
            metadata: { error: (error as Error).message }
          }
        ]
      }
    };
  }
}
