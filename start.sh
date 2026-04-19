#!/bin/sh

# Vi-Sakha Orchestration Script
# Starts both the Python Embeddings Sidecar and the NestJS Backend.

# Debug: Verify frontend files exist
echo "[Orchestrator] Checking frontend files..."
if [ -f /app/frontend/dist/index.html ]; then
  echo "[Orchestrator] ✓ Frontend dist found at /app/frontend/dist/"
  ls /app/frontend/dist/ | head -10
else
  echo "[Orchestrator] ✗ WARNING: /app/frontend/dist/index.html NOT FOUND!"
  echo "[Orchestrator] Listing /app/frontend/:"
  ls -la /app/frontend/ 2>/dev/null || echo "  /app/frontend/ does not exist"
fi

echo "[Orchestrator] Starting Python Embeddings Sidecar on port 8001..."
# Run uvicorn in the background
# - /app/bot/rag/embed_sidecar.py -> module is bot.rag.embed_sidecar
export PYTHONPATH=$PYTHONPATH:/app
uvicorn bot.rag.embed_sidecar:app --host 0.0.0.0 --port 8001 &

echo "[Orchestrator] Starting NestJS Backend on port 3000..."
# Run Node in the foreground (keeping the container alive)
cd /app/backend && node dist/main
