import { createLogger, estimateTokens } from "@visakha/shared-utils";
import type { AgentState } from "../state";
import { loadPlatformConfig } from "@visakha/config";
import type { ContextSource } from "@visakha/shared-types";
import { HybridRetriever } from "@visakha/retrieval-service/dist/hybrid-retriever";

const log = createLogger("retriever-node");
const config = loadPlatformConfig();
const retrievalService = new HybridRetriever();

/**
 * Retriever Node
 * 
 * Fetches relevant knowledge base content using the HybridRetriever service.
 */
export async function retrieverNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.plan?.needs_retrieval) {
    log.info("Skipping retrieval node — not needed per plan");
    return {};
  }

  log.info("Executing retriever node", { query: state.query });

  try {
    const retrievedContext = await retrievalService.retrieve({
      text: state.query,
      topK: 5,
      topN: 3,
      minScore: 0.1,
      hybrid: false
    }) as any[];

    log.info(`Retrieved ${retrievedContext.length} contexts`);

    return {
      retrievedContext,
      executionTrace: {
        ...state.executionTrace,
        nodes: [
          ...state.executionTrace.nodes,
          {
            nodeName: "retriever",
            startTime: new Date(),
            endTime: new Date(),
            tokensUsed: 0, // Retrieval doesn't use LLM tokens usually
            status: "success",
            metadata: { count: retrievedContext.length }
          }
        ]
      }
    };
  } catch (error) {
    log.error("Retriever node failed", { error: (error as Error).message });
    return {
      error: {
        code: "RETRIEVAL_FAILURE",
        message: "Failed to fetch relevant context",
        node: "retriever",
        recoverable: true,
      }
    };
  }
}
