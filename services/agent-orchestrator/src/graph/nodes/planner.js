"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerNode = plannerNode;
const llm_factory_1 = require("../../llm/llm-factory");
const prompts_1 = require("@visakha/prompts");
const shared_utils_1 = require("@visakha/shared-utils");
const log = (0, shared_utils_1.createLogger)("planner-node");
async function plannerNode(state) {
    const model = llm_factory_1.LLMFactory.getModel('planner');
    log.info("Executing planner node", { query: state.query });
    const historyStr = state.conversationHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
    const prompt = `${prompts_1.PLANNER_SYSTEM_PROMPT}

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
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Failed to parse planner response as JSON");
        }
        const plan = JSON.parse(jsonMatch[0]);
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
                        tokensUsed: (0, shared_utils_1.estimateTokens)(prompt) + (0, shared_utils_1.estimateTokens)(content),
                        status: "success",
                    }
                ]
            }
        };
    }
    catch (error) {
        log.error("Planner node failed", { error: error.message });
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
                        metadata: { error: error.message }
                    }
                ]
            }
        };
    }
}
//# sourceMappingURL=planner.js.map