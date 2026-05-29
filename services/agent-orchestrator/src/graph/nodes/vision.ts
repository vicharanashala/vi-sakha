import { visionService } from "@visakha/vision-service";
import { createLogger, estimateTokens } from "@visakha/shared-utils";
import type { AgentState } from "../state";
import type { Attachment } from "@visakha/shared-types";

const log = createLogger("vision-node");

/**
 * Vision Node
 * 
 * Processes image attachments using the VisionService.
 * Injects OCR text and captions into the agent state.
 */
export async function visionNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.attachments || state.attachments.length === 0) {
    log.info("No attachments to process, skipping vision node");
    return {};
  }

  log.info("Executing vision node", { attachmentCount: state.attachments.length });

  // Filter for image attachments
  const imageAttachments = state.attachments.filter((a: Attachment) => 
    a.mimeType.startsWith('image/')
  );

  if (imageAttachments.length === 0) {
    log.info("No image attachments found");
    return {};
  }

  try {
    const analysisResults = await Promise.all(
      imageAttachments.map((a: Attachment) => visionService.analyzeImage(a.data))
    );

    // Format analysis for the context
    const visionContext = analysisResults.map((res, i) => {
      const filename = imageAttachments[i].name;
      return `[IMAGE ANALYSIS: ${filename}]
Caption: ${res.caption.caption}
OCR Text: ${res.ocr.text}
---`;
    }).join("\n\n");

    return {
      retrievedContext: [
        ...state.retrievedContext,
        {
          content: visionContext,
          score: 1.0,
          source: "vision-analysis",
          type: "image" as any,
          metadata: { timestamp: new Date() }
        }
      ],
      executionTrace: {
        ...state.executionTrace,
        nodes: [
          ...state.executionTrace.nodes,
          {
            nodeName: "vision",
            startTime: new Date(),
            endTime: new Date(),
            tokensUsed: estimateTokens(visionContext),
            status: "success",
          }
        ]
      }
    };
  } catch (error) {
    log.error("Vision node failed", { error: (error as Error).message });
    return {
      executionTrace: {
        ...state.executionTrace,
        nodes: [
          ...state.executionTrace.nodes,
          {
            nodeName: "vision",
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
