# ==========================================
# Phase 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

# ==========================================
# Phase 2: Build the NestJS Backend
# ==========================================
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps
COPY backend/ ./
RUN npm run build

# ==========================================
# Phase 3: Final Production Image (Node + Python)
# ==========================================
# Using Python base because ML libraries often need Python-specific system deps
FROM python:3.10-slim

# Install Node.js 20 in the Python image
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Setup Python Sidecar
COPY requirements.txt ./
# Install CPU-specific PyTorch to keep image small, then other dependencies
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt fastapi uvicorn pydantic

# 2. Setup Backend (NestJS)
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --only=production --legacy-peer-deps
COPY --from=backend-builder /app/backend/dist ./dist

# 3. Setup Frontend Assets (served by NestJS)
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/dist ./dist

# 4. Copy Orchestrator and Source Code
WORKDIR /app
COPY start.sh ./
COPY bot/ ./bot/
RUN chmod +x start.sh

# Expose ports for UI/API (3000) and Embeddings (8001)
EXPOSE 3000
EXPOSE 8001

# Entry point
CMD ["./start.sh"]
