"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentGraph = void 0;
exports.createAgentGraph = createAgentGraph;
const langgraph_1 = require("@langchain/langgraph");
const state_1 = require("./state");
const planner_1 = require("./nodes/planner");
const retriever_1 = require("./nodes/retriever");
const vision_1 = require("./nodes/vision");
const synthesizer_1 = require("./nodes/synthesizer");
const reflector_1 = require("./nodes/reflector");
const shared_utils_1 = require("@visakha/shared-utils");
const log = (0, shared_utils_1.createLogger)("agent-graph");
function createAgentGraph() {
    const workflow = new langgraph_1.StateGraph(state_1.AgentStateAnnotation)
        .addNode("planner", planner_1.plannerNode)
        .addNode("vision", vision_1.visionNode)
        .addNode("retriever", retriever_1.retrieverNode)
        .addNode("synthesizer", synthesizer_1.synthesizerNode)
        .addNode("reflector", reflector_1.reflectorNode)
        .setEntryPoint("planner")
        .addEdge("planner", "vision")
        .addEdge("vision", "retriever")
        .addEdge("retriever", "synthesizer")
        .addEdge("synthesizer", "reflector")
        .addConditionalEdges("reflector", (state) => {
        if (state.finalResponse && state.finalResponse.length > 0) {
            log.info("Reflection passed or limit reached. Finishing.");
            return "end";
        }
        log.info("Reflection failed. Looping back to synthesizer.");
        return "synthesizer";
    }, {
        end: langgraph_1.END,
        synthesizer: "synthesizer"
    });
    return workflow.compile();
}
exports.agentGraph = createAgentGraph();
//# sourceMappingURL=agent-graph.js.map