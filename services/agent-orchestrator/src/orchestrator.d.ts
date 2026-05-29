import type { AgentState, AgentStreamEvent } from "@visakha/shared-types";
export declare class AgentOrchestrator {
    invoke(initialState: Partial<AgentState>): Promise<AgentState>;
    stream(initialState: Partial<AgentState>): AsyncGenerator<AgentStreamEvent>;
}
