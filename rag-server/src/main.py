import time
import os
import sys

# Ensure the parent directory of 'src' is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager

from src.embeddings.service import get_embedding_model, embed_text, embed_texts
from src.retrieval.reranker import get_reranker_model, rerank_query
from src.services.ocr import get_ocr_reader, perform_ocr
from src.services.captioning import get_caption_model, generate_caption

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("==================================================")
    print("🚀 VI-SAKHA SIDECAR: Eagerly pre-loading AI models...")
    print("==================================================")
    t_start = time.time()
    try:
        get_embedding_model()
        print("✅ Embedding model preloaded.")
    except Exception as e:
        print(f"❌ Embedding preload failed: {e}")
    try:
        get_reranker_model()
        print("✅ Reranker model preloaded.")
    except Exception as e:
        print(f"❌ Reranker preload failed: {e}")
    try:
        get_ocr_reader()
        print("✅ OCR reader preloaded.")
    except Exception as e:
        print(f"❌ OCR preload failed: {e}")
    try:
        get_caption_model()
        print("✅ Caption model preloaded.")
    except Exception as e:
        print(f"❌ Caption preload failed: {e}")
    print(f"🎉 Preloading finished in {time.time() - t_start:.2f}s!")
    print("==================================================")
    yield

app = FastAPI(title="Vi-Sakha Multimodal RAG Server", version="3.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

class EmbedRequest(BaseModel):
    text: str

class BatchEmbedRequest(BaseModel):
    texts: List[str]

class RerankRequest(BaseModel):
    query: str
    documents: List[str]
    top_n: Optional[int] = 5

class OCRRequest(BaseModel):
    image_base64: str

@app.get("/health")
async def health():
    return {"status": "healthy", "features": ["embed", "rerank", "ocr", "caption"]}

@app.post("/embed")
async def embed_single(request: EmbedRequest):
    try:
        vector = embed_text(request.text)
        return {"embedding": vector, "dimensions": len(vector)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed/batch")
async def embed_batch(request: BatchEmbedRequest):
    try:
        vectors = embed_texts(request.texts)
        return {"embeddings": vectors, "dimensions": len(vectors[0])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rerank")
async def rerank(request: RerankRequest):
    try:
        return rerank_query(request.query, request.documents, request.top_n)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vision/ocr")
async def vision_ocr(request: OCRRequest):
    try:
        return perform_ocr(request.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/vision/caption")
async def vision_caption(request: OCRRequest):
    try:
        return generate_caption(request.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
