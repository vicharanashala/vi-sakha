# Reranking Service

Pluggable reranker with cross-encoder (local) and Cohere (API) implementations.

## Strategy

1. **Phase 4:** Local cross-encoder (BAAI/bge-reranker-large)
2. **Future:** Abstract interface allows swapping to Cohere, Voyage AI, or Jina

## Pipeline

```
Query + Documents (top 20) → Reranker → Top 5 results
```

## Status: Scaffold — implementation in Phase 4
