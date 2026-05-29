# Agent Orchestrator Service

LangGraph-based agent orchestration engine.

## Architecture

```
User Query
  → Planner (classify intent, select tools)
  → Router (conditional dispatch)
  → Tool Execution (retrieval, vision, memory — parallel where possible)
  → Synthesizer (combine results into coherent response)
  → Reflector (quality gate, max 2 retry loops)
  → Response
```

## Key Files (Phase 2)

- `src/graph/agent-graph.ts` — Main LangGraph StateGraph definition
- `src/graph/state.ts` — AgentState type annotation
- `src/graph/nodes/` — Individual agent nodes (planner, router, retriever, etc.)
- `src/graph/edges.ts` — Conditional edge functions
- `src/llm/llm-factory.ts` — Abstracted LLM provider factory

## Configuration

See `@visakha/config` for agent configuration (max loops, timeouts, models).

## Status: Scaffold — implementation in Phase 2
