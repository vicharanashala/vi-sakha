# Vision Service

Multimodal processing: OCR, image captioning, CLIP embeddings, document parsing.

## Endpoints (Python FastAPI)

- `POST /embed` — Text embedding (existing)
- `POST /embed/batch` — Batch text embedding (existing)
- `POST /ocr` — Extract text from images (Phase 5)
- `POST /caption` — Generate image descriptions (Phase 5)
- `POST /embed/image` — CLIP image embeddings (Phase 5)
- `POST /document/parse` — PDF parsing + chunking (Phase 5)
- `GET /health` — Service health check (existing)

## Models

- **Text Embeddings:** BAAI/bge-small-en-v1.5 (existing)
- **Reranker:** BAAI/bge-reranker-large (Phase 4)
- **OCR:** PaddleOCR or Tesseract (Phase 5)
- **Captioning:** OpenAI Vision / Gemini Vision (Phase 5)
- **Image Embeddings:** CLIP (Phase 5)

## Note

This service evolves from the existing `bot/rag/embed_sidecar.py`.
Initially combined, will split into separate services long-term.

## Status: Scaffold — OCR/vision implementation in Phase 5
