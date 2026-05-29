# 📦 Vi-Sakha Monorepo Shared Packages

This directory contains the core reusable utility modules, environment settings, TypeScript typing schemas, and prompt configurations shared across all services in the **Vi-Sakha** monorepo workspaces. By keeping these packages centralized, the backend, discord bot, and microservices share single-source-of-truth configurations and compile safely.

---

## 🏗️ Folder Structure & Monorepo Linkages

```text
packages/
├── config/             # Reusable central environment variables and system configurations
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts    # Config validations, database bounds, and model names mapping
├── prompts/            # Central storage for all LLM and RAG prompt templates
│   ├── package.json
│   └── src/
│       ├── index.ts    # Prompts exports
│       ├── templates/  # Templates (Scraping, QA extraction, reasoning)
│       └── system-prompts/ # Hardcoded System Prompts for Chatbot pipelines
├── shared-types/       # Common TypeScript definitions
│   ├── package.json
│   └── src/
│       ├── agent.types.ts      # Typing schemas for Planner, Router, and Graphs
│       ├── retrieval.types.ts  # Models for vectors and database queries
│       ├── memory.types.ts     # Structures for 4-tier cache stores
│       └── vision.types.ts     # Payloads for OCR and BLIP visual inputs
└── shared-utils/       # Reusable auxiliary functions
    ├── package.json
    └── src/
        └── index.ts    # String normalizers, JSON parsers, and custom loggers
```

---

## 🔗 Description of Shared Workspaces

### 1. Centralized System Config (`@visakha/config`)
* **Role:** Manages the system-wide threshold bounds and parameters.
* **Key Contents:**
  * Validates environment variables across containers.
  * Exports database connection bounds (MongoDB retry thresholds, Redis connection pools).
  * Houses AI model parameters like **cosine similarity threshold (default: `0.45`)** below which responses are marked `escalated` and redirect to ticketing.
  * Declares model names mapping (`BAAI/bge-small-en-v1.5` for embeddings, `Salesforce/blip-image-captioning-base` for vision).

### 2. Universal Prompt Library (`@visakha/prompts`)
* **Role:** Central repository for LLM operational structures. Ensures consistent AI behaviors whether invoked by the student chat or Discord bot.
* **Key Contents:**
  * **System Prompts:** Configures agent persona (knowledge bounds, fallback instructions for when confidence is low).
  * **Templates:** Structural templates for parsing Raw Discord transcripts and converting threads into clean Q&A pairs.

### 3. Unified Types (`@visakha/shared-types`)
* **Role:** Holds the central TypeScript typing definitions. Prevents discrepancies in contracts between the central backend and secondary microservices.
* **Key Contents:**
  * **Agent Types:** LangGraph StateGraph models (`AgentState`, `IntentClassification`, `RoutingDestination`).
  * **Retrieval Types:** Definitions for embeddings, vector dimensions, and search scores (`EmbeddingRecord`, `SimilaritySearchResult`).
  * **Memory Types:** Cache bounds, episodic stores, and transient parameters.

### 4. Reusable Utilities (`@visakha/shared-utils`)
* **Role:** General runtime utilities.
* **Key Contents:**
  * Unicode normalizers, transcript text-cleanup filters, JSON parser wrappers.
  * Shared mathematical vector utility handlers (e.g., local Cosine Similarity calculators).

---

## ⚙️ Compilation & Packaging

To compile all shared packages across the workspaces so they are accessible by main services, run the following command from the **root directory of the project**:

```bash
# Installs monorepo workspace configurations and links packages together
npm install

# Compiles TS files of all shared packages into their dist outputs
npm run build:packages
```
Once built, any changes made inside `/packages` are immediately resolved and updated in dependent services (`/backend`, `/discord-bot`, and `/services`).
