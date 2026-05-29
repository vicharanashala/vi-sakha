# 📝 Shared Prompts Package (`@visakha/prompts`)

This package houses the system-wide **GenAI prompts**, system templates, and instruction sets utilized by the **Vi-Sakha** AI chatbot agent and Discord scrapers. Centralizing prompts guarantees consistent conversational personalities, quality gates, and data ingestion logic.

---

## 🏗️ Folder Structure & Layout

* `/src`
  * `index.ts` — Main exporter compiling prompts.
  * `system-prompts/` — Core personality parameters (e.g. Chatbot conversational bounds).
  * `templates/` — Contextual structure layouts (e.g. converting transcripts to FAQ pairs).
  * `tsconfig.json` — Maps output JS/D.TS files to `/dist`.
  * `package.json` — Monorepo workspace naming configurations.

---

## 🔗 Shared Prompt Definitions

1. **Student Support Persona:**
   * Configures tone (encouraging, precise, academic).
   * Restricts bot from guessing information not present in the vector search or verified context.
   * Defines fallback prompts guiding students to raise a support ticket.
2. **Q&A Proposal Extraction:**
   * Instructions for Claude/Gemini to scan raw Discord thread logs, filter noise (e.g. greetings, scheduling), and synthesize high-density Question-Answer pairs.
3. **Data Cleaning Rules:**
   * Context rules for stripping personal information (emails, passwords) during transcript ingestion.

---

## 🚀 How to Build & Link
To recompile this workspace after editing templates:
```bash
# Run from the project root directory
npm run build:packages
```
Dependent modules resolve imports cleanly via `import { templates } from '@visakha/prompts'`.
