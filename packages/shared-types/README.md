# 🏷️ Shared TypeScript Types Package (`@visakha/shared-types`)

This package houses the core **TypeScript type definitions and interfaces** shared across the **Vi-Sakha** monorepo workspaces. These strict definitions act as the typing contracts for communication schemas, databases, and microservices.

---

## 🏗️ Folder Structure & Core Typings

* `/src`
  * `index.ts` — Main compilation exports.
  * `agent.types.ts` — Interfaces for LangGraph nodes, `AgentState`, planner decisions, and routing payloads.
  * `mcp.types.ts` — Structured classes for Model Context Protocol schema payloads.
  * `memory.types.ts` — Types mapping the 4-tier memory adapters (episodes, working contexts, sliding-windows).
  * `retrieval.types.ts` — Formats for database vector schemas and hybrid score indices.
  * `vision.types.ts` — Payloads and structures for base64 OCR text returns and BLIP visual caption descriptions.
  * `package.json` — Declares the package scope.
  * `tsconfig.json` — Outputs d.ts mappings during compilation.

---

## 🔗 Architecture Impact

By standardizing these interfaces:
1. **Contract Safety:** The `backend` and `discord-bot` interact with MongoDB and the RAG sidecar using identical data schemas, preventing runtime exceptions.
2. **LangGraph State Integrity:** State modifications inside `/services/agent-orchestrator` utilize standard `AgentState` definitions from this package to ensure data flows cleanly between planning and tool executions.

---

## 🚀 How to Build
Compile the typings into their built declarations:
```bash
# Run from the project root directory
npm run build:packages
```
Dependent services resolve models via `import { AgentState } from '@visakha/shared-types'`.
