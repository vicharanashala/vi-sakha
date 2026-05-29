"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStateAnnotation = void 0;
const langgraph_1 = require("@langchain/langgraph");
exports.AgentStateAnnotation = langgraph_1.Annotation.Root({
    query: (0, langgraph_1.Annotation)(),
    history: (0, langgraph_1.Annotation)({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    conversationHistory: (0, langgraph_1.Annotation)({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    attachments: (0, langgraph_1.Annotation)({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    plan: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y ?? x,
        default: () => null,
    }),
    toolResults: (0, langgraph_1.Annotation)({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    retrievedContext: (0, langgraph_1.Annotation)({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    reflections: (0, langgraph_1.Annotation)({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    finalResponse: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
    draftResponse: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
    isSatisfactory: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y ?? x,
        default: () => false,
    }),
    revisionCount: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y ?? x,
        default: () => 0,
    }),
    loopCount: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y ?? x,
        default: () => 0,
    }),
    executionTrace: (0, langgraph_1.Annotation)({
        reducer: (x, y) => ({
            nodes: x.nodes.concat(y.nodes),
            totalTokens: x.totalTokens + y.totalTokens
        }),
        default: () => ({ nodes: [], totalTokens: 0 }),
    }),
    error: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y ?? x,
        default: () => null,
    }),
});
//# sourceMappingURL=state.js.map