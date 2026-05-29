# 🖥️ Vi-Sakha NestJS Backend API Gateway (v2.0.0)

Welcome to the **Vi-Sakha NestJS Backend API Server**! This server is a high-performance, modular API and WebSocket server built with **NestJS 10** and **Mongoose**. It acts as the orchestration layer for the entire student support ecosystem, managing user roles, support ticket lifecycles, real-time message streams, data ingestion plugins, database models, and interfacing directly with the Python RAG Sidecar.

---

## 🏗️ Folder Structure & Architectural Layout

```text
backend/
├── Dockerfile                  # Containerizes the NestJS API server (multi-stage compilation)
├── package.json                # Project operational scripts, dependencies, and queue definitions
├── tsconfig.json               # TypeScript Compiler flags and path mappings
├── swagger.yaml                # Standardized API contract definitions (OpenAPI 3.0)
└── src/
    ├── main.ts                 # Application entry point setting up Nest, CORS, and Swagger API docs
    ├── app.module.ts           # Core root module assembling Mongoose and feature-level business modules
    ├── config/                 # Configuration parsers and schema validation rules
    ├── database/               # Mongoose schemas and seed scripts
    ├── controllers/            # General routes and REST controllers
    ├── services/               # System-wide services (Cache, Email gateways, AI triggers)
    ├── middlewares/            # Auth validators, CORS handlers, logging, and error boundaries
    └── modules/                # Core business logic features
        ├── auth/               # Secure Mock Session validation and JWT generation
        ├── users/              # User role permissions governance (Student, Lab Member, Admin)
        ├── analytics/          # KPI reporting, feedback topic analyzers, and metrics
        ├── discord/            # Scraper handlers and webhook thread syncs
        ├── rag/                # RAG storage collections, cosine comparisons, and search APIs
        │   ├── qa-pairs/       # Verified Q&A Knowledge Base
        │   ├── qa-proposals/   # AI-generated candidates awaiting validation
        │   ├── chat/           # Student interactive AI chat history
        │   ├── conversation/   # Plugin system consolidating RAG/Discord/LibreChat data
        │   └── embeddings/     # High-density BGE vector store mappings and query similarity matches
        └── tickets/            # Ticketing lifecycle, Socket.io gateway, and Google Meet API proxies
```

---

## 🔐 Mock Authentication System (`/auth`)

To expedite early engineering cycles, version 2.0.0 implements a functional **Mock Authentication** system inside `src/modules/auth/`:
* **Role Governance:** Pre-configures three user accounts with hardcoded credentials for demonstration purposes (Password: `password`):
  * **Student:** username `user` (leads to Student UI)
  * **Lab Member (Instructor):** username `labmember` (leads to Support Dashboard)
  * **Administrator:** username `admin` (leads to Governance Panel)
* **JWT Access Tokens:** Upon successful mock validation, the backend generates and returns a functional JWT bearer access token containing user roles, which is stored in the browser's `localStorage` to authorize subsequent API queries.

---

## 🔌 Decoupled Conversation Plugin System (`src/modules/rag/conversation/`)

The backend manages thread data dynamically using a highly flexible **Plugin Architecture** that compiles data across completely different sources:
* **Interface Contract (`plugin.interface.ts`):** Every plugin implements a strict interface requiring `fetchConversations(options)` and returning standard `NormalizedConversation` / `NormalizedMessage` structures.
* **Automatic Discovery (`PluginManagerService`):** Dynamic provider loader. Standardizes search loops that look for files matching the pattern `*.plugin.(ts|js)` in the plugins folder, loads them at runtime via NestJS `ModuleRef`, and registers them automatically.
* **Implemented Adapters:**
  1. **`RagPlugin`:** Consolidates internal chatbot histories stored directly inside the system's MongoDB database.
  2. **`DiscordPlugin`:** Reads raw JSON scraper transcript files exported from support Discord Guild channels.
  3. **`LibreChatPlugin`:** Interfaces with external database schemas from LibreChat.

---

## 📨 WebSocket Real-Time Gateway (`src/modules/tickets/`)

For synchronous Support Chat, the backend registers a **Socket.io gateway namespace** mapping to `/tickets`:
* **Room-Level Scoping:** Restricts broadcasts to individual channels. Users subscribe by firing `ticket:join` with their specific `{ ticketId }` to join the room `ticket:{ticketId}`.
* **Bi-directional Ingestion:**
  * When a new message is posted in a support room, the server emits `ticket:message.created` containing the message payload.
  * Allows live instructor assignment, transfer requests, and resolution updates in real time.

---

## 🧠 Semantic Search & Cosine RAG Thresholds

* **Storage Engine:** MongoDB stores raw Q&A pairs (in `qa_pairs`) and 384-dimensional floating-point vectors (in `embeddings`).
* **Cosine Similarity Calculation:** When students query the chatbot, the backend calls the RAG sidecar to embed the text, and calculates cosine distance across cached vector blocks in MongoDB.
* **Confidence Guard (`0.45` Threshold):**
  * If the top matching Q&A score is **above `0.45`**, the bot answers instantly with high confidence.
  * If the score falls **below `0.45`**, the system tags the conversation as `escalated`, flags the mismatch to the user, and presents a dynamic button to immediately raise a manual ticket for an instructor.

---

## ⚙️ REST API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Mock authentication endpoint returning a JWT. | No |
| **POST** | `/api/chat/message` | Sends a message to the AI chatbot (sync/REST). | Yes (Bearer JWT) |
| **POST** | `/api/chat/message/stream`| Sends message and returns SSE (`ndjson`) chunk stream. | Yes |
| **GET** | `/api/qa-proposals` | Lists candidate Q&A pairs generated from Discord. | Yes (Instructor) |
| **PATCH** | `/api/qa-proposals/:id/approve`| Approves a proposal, seeding it into verified `qa_pairs`.| Yes (Instructor) |
| **PATCH** | `/api/qa-proposals/:id/reject`| Rejects a proposal and removes it from queue. | Yes (Instructor) |
| **GET** | `/api/tickets` | Lists support tickets with active filters. | Yes |
| **POST** | `/api/tickets/:id/start-meeting`| Spawns a synchronous Google Meet proxy session. | Yes (Instructor) |

---

## 🚀 Native Local Development Setup

To run the API server natively on a local host:

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Files
Duplicate `.env.example` to `.env` inside the `/backend` folder:
```bash
cp .env.example .env
```
Ensure you set your `MONGODB_URI` and AI keys (e.g. `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) accordingly.

### 3. Seed Database
Ingest initial Q&A embeddings dataset directly into your MongoDB:
```bash
# Feeds database with initial QA vector representations
npm run seed
```

### 4. Run Development Server
Spins up a local server on port `3000` with hot-reload enabled:
```bash
npm run start:dev
```
* **Swagger Interface:** Open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) to access the interactive OpenAPI endpoints playground!
