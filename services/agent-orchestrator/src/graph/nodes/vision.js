"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visionNode = visionNode;
const vision_service_1 = require("@visakha/vision-service");
const shared_utils_1 = require("@visakha/shared-utils");
const log = (0, shared_utils_1.createLogger)("vision-node");
async function visionNode(state) {
    if (!state.attachments || state.attachments.length === 0) {
        log.info("No attachments to process, skipping vision node");
        return {};
    }
    log.info("Executing vision node", { attachmentCount: state.attachments.length });
    const imageAttachments = state.attachments.filter((a) => a.mimeType.startsWith('image/'));
    if (imageAttachments.length === 0) {
        log.info("No image attachments found");
        return {};
    }
    try {
        const analysisResults = await Promise.all(imageAttachments.map((a) => vision_service_1.visionService.analyzeImage(a.data)));
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
                    type: "image",
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
                        tokensUsed: (0, shared_utils_1.estimateTokens)(visionContext),
                        status: "success",
                    }
                ]
            }
        };
    }
    catch (error) {
        log.error("Vision node failed", { error: error.message });
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
                        metadata: { error: error.message }
                    }
                ]
            }
        };
    }
}
//# sourceMappingURL=vision.js.map