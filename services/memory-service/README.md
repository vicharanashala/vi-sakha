# Memory Service

4-tier memory system: short-term, episodic, semantic, working.

## Architecture

| Tier | Store | TTL | Purpose |
|------|-------|-----|---------|
| Short-Term | Redis | 30 min | Active conversation state |
| Episodic | MongoDB | Indefinite | Summarized past conversations |
| Semantic | Qdrant | Indefinite | Vector embeddings for search |
| Working | In-memory (LangGraph) | Per-request | Transient reasoning state |

## Key Components

- **Session Store** — Redis-backed sliding window of active messages
- **Episodic Store** — MongoDB with LLM-based conversation summarization
- **Semantic Store** — Qdrant adapter for memory search
- **Memory Summarizer** — Compresses conversations into episodes
- **Context Compressor** — Token budgeting and deduplication

## Status: Scaffold — implementation in Phase 3
