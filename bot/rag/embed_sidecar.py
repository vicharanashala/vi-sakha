"""
Vi-Sakha Embedding Sidecar

Minimal FastAPI service — BGE embeddings only, no business logic.
Replaces the full bot/rag/api.py as the required Python component.

Run with:
    uvicorn bot.rag.embed_sidecar:app --port 8001

Two endpoints:
  POST /embed        { text: str }          → { embedding, dimensions, model }
  POST /embed/batch  { texts: [str, ...] }  → { embeddings, dimensions, model }
  GET  /health                              → { status, model }
"""

import os
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

app = FastAPI(title="Vi-Sakha Embedding Sidecar", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"[embed_sidecar] Loading {EMBEDDING_MODEL} ...")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print("[embed_sidecar] Model ready.")
    return _model


# ── Request / Response models ──────────────────────────────────────────────────

class SingleEmbedRequest(BaseModel):
    text: str


class SingleEmbedResponse(BaseModel):
    embedding: List[float]
    dimensions: int
    model: str


class BatchEmbedRequest(BaseModel):
    texts: List[str]


class BatchEmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int
    model: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "model": EMBEDDING_MODEL}


@app.post("/embed", response_model=SingleEmbedResponse)
async def embed_single(request: SingleEmbedRequest):
    """Single-text endpoint — backward-compatible with QaProposalsService."""
    model = get_model()
    vector = model.encode(request.text, normalize_embeddings=True).tolist()
    return SingleEmbedResponse(
        embedding=vector,
        dimensions=len(vector),
        model=EMBEDDING_MODEL,
    )


@app.post("/embed/batch", response_model=BatchEmbedResponse)
async def embed_batch(request: BatchEmbedRequest):
    """Batch endpoint — used by NestJS EmbeddingWorkerService."""
    if not request.texts:
        return BatchEmbedResponse(embeddings=[], dimensions=0, model=EMBEDDING_MODEL)
    model = get_model()
    vectors = model.encode(request.texts, normalize_embeddings=True)
    embeddings = [v.tolist() for v in vectors]
    return BatchEmbedResponse(
        embeddings=embeddings,
        dimensions=len(embeddings[0]),
        model=EMBEDDING_MODEL,
    )


# ── Startup: pre-load model so first request is not slow ──────────────────────

@app.on_event("startup")
async def startup():
    get_model()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
