import type { ContextSource as IContextSource, ExecutionNode as IExecutionNode, Attachment as IAttachment, ReflectionResult } from "@visakha/shared-types";
export interface AgentMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface AgentPlan {
    intent: string;
    steps: string[];
    tools: string[];
    needs_retrieval: boolean;
}
export declare const AgentStateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    query: import("@langchain/langgraph").LastValue<string>;
    history: import("@langchain/langgraph").BinaryOperatorAggregate<AgentMessage[], AgentMessage[]>;
    conversationHistory: import("@langchain/langgraph").BinaryOperatorAggregate<AgentMessage[], AgentMessage[]>;
    attachments: import("@langchain/langgraph").BinaryOperatorAggregate<IAttachment[], IAttachment[]>;
    plan: import("@langchain/langgraph").BinaryOperatorAggregate<AgentPlan | null, AgentPlan | null>;
    toolResults: import("@langchain/langgraph").BinaryOperatorAggregate<any[], any[]>;
    retrievedContext: import("@langchain/langgraph").BinaryOperatorAggregate<IContextSource[], IContextSource[]>;
    reflections: import("@langchain/langgraph").BinaryOperatorAggregate<ReflectionResult[], ReflectionResult[]>;
    finalResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    isSatisfactory: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    loopCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    executionTrace: import("@langchain/langgraph").BinaryOperatorAggregate<{
        nodes: IExecutionNode[];
        totalTokens: number;
    }, {
        nodes: IExecutionNode[];
        totalTokens: number;
    }>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<any, any>;
}>;
export type AgentState = typeof AgentStateAnnotation.State;
