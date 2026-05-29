import { StateGraph, END } from "@langchain/langgraph";
import { AgentStateAnnotation, type AgentState } from "./state";
import { plannerNode } from "./nodes/planner";
import { retrieverNode } from "./nodes/retriever";
import { visionNode } from "./nodes/vision";
import { webSearchNode } from "./nodes/web-search";
import { synthesizerNode } from "./nodes/synthesizer";
import { reflectorNode } from "./nodes/reflector";
import { createLogger } from "@visakha/shared-utils";

const log = createLogger("agent-graph");

/**
 * Agent Execution Graph
 * 
 * Defines the flow of the agentic RAG platform.
 * 
 * Flow: planner → vision → retriever → web_search → synthesizer → reflector
 *
 * The web_search node sits between retriever and synthesizer.
 * It activates when:
 *   - The planner sets needs_web_search or needs_hp_lookup
 *   - Local KB retrieval yielded low-confidence results
 * Otherwise, it passes through without doing anything.
 */
export function createAgentGraph() {
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("planner", plannerNode)
    .addNode("vision", visionNode)
    .addNode("retriever", retrieverNode)
    .addNode("web_search", webSearchNode)
    .addNode("synthesizer", synthesizerNode)
    .addNode("reflector", reflectorNode)
    .setEntryPoint("planner")
    .addEdge("planner", "vision")
    .addEdge("vision", "retriever")
    .addEdge("retriever", "web_search")
    .addEdge("web_search", "synthesizer")
    .addEdge("synthesizer", "reflector")
    .addConditionalEdges(
      "reflector",
      (state: AgentState) => {
        if (state.finalResponse && state.finalResponse.length > 0) {
          log.info("Reflection passed or limit reached. Finishing.");
          return "end";
        }
        log.info("Reflection failed. Looping back to synthesizer.");
        return "synthesizer";
      },
      {
        end: END,
        synthesizer: "synthesizer"
      }
    );

  return workflow.compile();
}

/**
 * Singleton instance of the compiled graph.
 */
export const agentGraph = createAgentGraph();
