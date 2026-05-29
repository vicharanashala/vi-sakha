export declare function createAgentGraph(): import("@langchain/langgraph").CompiledStateGraph<import("@langchain/langgraph").StateType<{
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").Attachment[], import("@visakha/shared-types").Attachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentPlan | null, import("./state").AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ContextSource[], import("@visakha/shared-types").ContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ReflectionResult[], import("@visakha/shared-types").ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }, {
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}>, import("@langchain/langgraph").UpdateType<{
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").Attachment[], import("@visakha/shared-types").Attachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentPlan | null, import("./state").AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ContextSource[], import("@visakha/shared-types").ContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ReflectionResult[], import("@visakha/shared-types").ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }, {
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}>, "vision" | "planner" | "synthesizer" | "reflector" | "retriever" | "web_search" | "__start__", {
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").Attachment[], import("@visakha/shared-types").Attachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentPlan | null, import("./state").AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ContextSource[], import("@visakha/shared-types").ContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ReflectionResult[], import("@visakha/shared-types").ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }, {
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}, {
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").Attachment[], import("@visakha/shared-types").Attachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentPlan | null, import("./state").AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ContextSource[], import("@visakha/shared-types").ContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ReflectionResult[], import("@visakha/shared-types").ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }, {
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}, import("@langchain/langgraph").StateDefinition>;
export declare const agentGraph: import("@langchain/langgraph").CompiledStateGraph<import("@langchain/langgraph").StateType<{
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").Attachment[], import("@visakha/shared-types").Attachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentPlan | null, import("./state").AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ContextSource[], import("@visakha/shared-types").ContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ReflectionResult[], import("@visakha/shared-types").ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }, {
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}>, import("@langchain/langgraph").UpdateType<{
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").Attachment[], import("@visakha/shared-types").Attachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentPlan | null, import("./state").AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ContextSource[], import("@visakha/shared-types").ContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ReflectionResult[], import("@visakha/shared-types").ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }, {
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}>, "vision" | "planner" | "synthesizer" | "reflector" | "retriever" | "web_search" | "__start__", {
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").Attachment[], import("@visakha/shared-types").Attachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentPlan | null, import("./state").AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ContextSource[], import("@visakha/shared-types").ContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ReflectionResult[], import("@visakha/shared-types").ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }, {
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}, {
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentMessage[], import("./state").AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").Attachment[], import("@visakha/shared-types").Attachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<import("./state").AgentPlan | null, import("./state").AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ContextSource[], import("@visakha/shared-types").ContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<import("@visakha/shared-types").ReflectionResult[], import("@visakha/shared-types").ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }, {
        nodes: import("@visakha/shared-types").ExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}, import("@langchain/langgraph").StateDefinition>;
