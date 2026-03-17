# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vi-Sakha is an AI-powered student support system for VInternship. It combines a RAG chatbot (trained on Discord transcripts), a support ticket system with real-time messaging, and a Discord bot. Three independently runnable components: NestJS backend, React frontend, Python bot/pipeline.

## Commands

### Backend (NestJS — port 3000)
```bash
cd backend
npm install
npm run start:dev       # Development with hot reload
npm run build           # Compile TypeScript
npm run start:prod      # Run compiled output
npm run lint            # ESLint with auto-fix
npm run format          # Prettier
npm run seed            # Seed DB from embeddings.json
npm run seed:qa         # Seed Q&A pairs only
```

### Frontend (React/Vite — port 5173)
```bash
cd frontend
npm install
npm run dev             # Dev server
npm run build           # tsc + vite build
npm run lint            # ESLint
npm run preview         # Preview production build
```

### Python Pipeline & Bot
```bash
# Create virtual environment from repo root
python -m venv .venv
source .venv/bin/activate       # Linux/Mac
.venv\Scripts\Activate.ps1      # Windows

pip install -r requirements.txt

# Data pipeline (run in order):
python -m bot.scraper.transcript_scraper   # 1. Scrape Discord transcripts
python -m bot.scraper.clean_transcripts    # 2. Clean raw transcripts
python -m bot.scraper.transcript_to_qa    # 3. Extract Q&A pairs via Claude (10 concurrent workers)
python -m bot.rag.vector_db               # 4. Build ChromaDB from Q&A dataset
python bot/scripts/export_to_mongodb.py  # 5a. Export to MongoDB (for NestJS)
python bot/scripts/export_embeddings.py  # 5b. Export to JSON (alternative)

# Run services:
uvicorn bot.rag.api:app --reload --port 8000   # FastAPI RAG server
python -m bot.discord_bot                       # Discord bot
python -m bot.rag.chatbot                       # Interactive CLI chat
```

## Environment Setup

Three `.env` files are needed:

**Root `.env`** (for Python bot):
```
ANTHROPIC_API_KEY=sk-ant-...
DISCORD_BOT_TOKEN=...
DISCORD_CHANNEL_ID=...
MONGODB_URI=mongodb://localhost:27017/vinternship
```

**`backend/.env`**:
```
MONGODB_URI=mongodb://localhost:27017/vinternship
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGINS=http://localhost:5173,http://localhost:3001
# Optional LibreChat plugin:
LIBRECHAT_MONGODB_URI=...
LIBRECHAT_DB_NAME=...
LIBRECHAT_FETCH_LIMIT=2000
```

**`frontend/.env`** (optional):
```
VITE_API_URL=http://localhost:3000
```

Copy from `.env.example` and `backend/.env.example`.

## Architecture

### Backend Module Structure
All routes are prefixed with `/api`. NestJS modules in `backend/src/`:
- `chat/` — Conversation history with the RAG chatbot (MongoDB-backed)
- `conversation/` — Aggregated view across all sources via plugin system
- `embeddings/` — MongoDB storage for BGE vectors; in-memory cosine similarity search
- `qa-pairs/` — Approved Q&A knowledge base with full-text search
- `qa-proposals/` — AI-generated Q&A pairs awaiting human approval/rejection
- `tickets/` — Support ticket lifecycle + real-time WebSocket messaging + Google Meet integration
- `auth/` — **Mock only**: hardcoded users (`user`, `labmember`, `admin` with password `password`); no JWT or guards

### Conversation Plugin System
`backend/src/conversation/plugins/` contains adapters for multiple data sources. Each plugin implements `ConversationPlugin` (`plugin.interface.ts`):
- Required: `fetchConversations(options)`
- Optional: `fetchConversationById(id)`, `fetchStats()`
- Must normalize data to `NormalizedConversation` / `NormalizedMessage`

**Adding a new source:** Create `mysource.plugin.ts` implementing `ConversationPlugin`, register it in `ConversationModule` providers. `PluginManagerService` discovers plugins by filename pattern (`*.plugin.(ts|js)`) and resolves them via `ModuleRef`.

Current plugins: `RagPlugin` (internal MongoDB), `DiscordPlugin` (filesystem JSON transcripts), `LibreChatPlugin` (external MongoDB).

### RAG Pipeline Flow
```
Discord transcripts (JSON)
  → clean_transcripts.py        (filter roles, remove noise)
  → transcript_to_qa.py         (Claude Haiku extracts FAQ pairs → qa_dataset.json)
  → vector_db.py                (BGE embeddings → ChromaDB at /vector_db/)
  → export_to_mongodb.py        (qa_pairs + embeddings collections in MongoDB)
  → NestJS backend (seed)       (loads into MongoDB for API serving)
```

**Embedding model:** `BAAI/bge-large-en-v1.5` (local, 1024 dimensions). ChromaDB stores vectors at `/vector_db/` (persistent, not committed to git). Relevance threshold: `0.45` cosine similarity — below this, queries are marked `escalated` and students are nudged to raise a ticket.

### WebSocket (Ticket Messaging)
Socket.io adapter on the NestJS server. Gateway namespace: `/tickets`. Room pattern: `ticket:{ticketId}`. Events:
- `ticket:join` / `ticket:leave` — subscribe/unsubscribe to a ticket room
- `ticket:message.created` — broadcast when a new message is saved

Frontend uses a dynamically loaded Socket.io client (CDN). See `frontend/src/lib/api.ts` for `subscribeToTicketMessages()`.

### Frontend Routes
- `/` — Landing page (marketing, smooth scroll, GSAP/Lenis animations)
- `/login` — Auth (role-based redirect: student → `/dashboard`, lab member → `/labmember`)
- `/dashboard` — Student view: Vi-Sakha chat, raise ticket, my tickets
- `/labmember` — Instructor view: manage tickets, assign/transfer/resolve, start Google Meet sessions

Path alias `@/` maps to `frontend/src/`.

### Key Data Stores
| Store | Purpose |
|---|---|
| MongoDB Atlas | Primary DB: conversations, tickets, Q&A pairs, embeddings |
| ChromaDB (`/vector_db/`) | Local vector store for RAG retrieval |

No test suite exists in the codebase.
