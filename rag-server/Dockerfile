# ==========================================
# Production-Grade RAG Sidecar Server
# ==========================================
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for OCR and model compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies manifest
COPY requirements.txt ./

# Install CPU-specific dependencies cleanly in one step
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY src/ ./src/

ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8001

EXPOSE 8001

CMD ["python", "src/main.py"]
