# Retrieval Service

Vector search, hybrid retrieval, and reranking pipeline.

## Pipeline

```
Query → Embed → Vector Search (Qdrant, top 20) → Rerank (cross-encoder, top 5) → Return
```

## Key Components

- **Qdrant Adapter** — Vector store interface implementation for Qdrant
- **Hybrid Retriever** — Combines vector + keyword search
- **Cross-Encoder Reranker** — Local BAAI/bge-reranker-large (pluggable interface)
- **Batch Ingestion** — BullMQ-powered async document ingestion

## Status: Scaffold — implementation in Phase 4
