/**
 * Agent Orchestrator
 * 
 * Main entry point for invoking the agentic platform.
 * Integrates LangGraph with the rest of the system.
 */

import { agentGraph } from "./graph/agent-graph";
import type { AgentState, AgentStreamEvent } from "@visakha/shared-types";
import { createLogger } from "@visakha/shared-utils";

const log = createLogger("agent-orchestrator");

export class AgentOrchestrator {
  /**
   * Invoke the agent graph synchronously.
   */
  async invoke(initialState: Partial<AgentState>): Promise<AgentState> {
    log.info("Invoking agent orchestrator", { query: initialState.query });
    
    try {
      const result = await agentGraph.invoke(initialState);
      return result as AgentState;
    } catch (error) {
      log.error("Agent execution failed", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Stream the agent graph execution.
   */
  async *stream(initialState: Partial<AgentState>): AsyncGenerator<AgentStreamEvent> {
    log.info("Starting agent stream", { query: initialState.query });

    try {
      // Yield first node start
      yield { type: "node", name: "planner", status: "start" };

      const stream = await agentGraph.stream(initialState, { streamMode: "updates" });
      
      let lastNode: string | null = "planner";

      for await (const update of stream) {
        // Map LangGraph updates to AgentStreamEvents
        const nodeName = Object.keys(update)[0];
        const state = update[nodeName];

        if (lastNode && lastNode !== nodeName) {
          yield { type: "node", name: lastNode, status: "end" };
          yield { type: "node", name: nodeName, status: "start" };
        }
        lastNode = nodeName;

        if (nodeName === 'planner' && state.plan) {
          yield { type: 'plan', plan: state.plan };
        }
        
        if (nodeName === 'retriever' && state.retrievedContext) {
          yield { type: 'retrieval', contexts: state.retrievedContext };
        }

        if (nodeName === 'web_search' && state.retrievedContext) {
          yield { type: 'retrieval', contexts: state.retrievedContext };
        }

        if (nodeName === 'synthesizer' && state.draftResponse) {
          // In a real implementation, we would stream tokens here
          // For now, we yield the full draft once complete
          yield { type: 'delta', text: state.draftResponse };
        }

        if (nodeName === 'reflector' && state.reflections) {
          const latestReflection = state.reflections[state.reflections.length - 1];
          yield { type: 'reflection', result: latestReflection };
        }
      }

      if (lastNode) {
        yield { type: "node", name: lastNode, status: "end" };
      }

      yield { type: 'done', assistantMessageId: "generated", trace: {} as any };
    } catch (error) {
      log.error("Agent stream failed", { error: (error as Error).message });
      yield { type: 'error', message: (error as Error).message };
    }
  }
}
