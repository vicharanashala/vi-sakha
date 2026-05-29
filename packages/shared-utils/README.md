# 🛠️ Shared Utilities Package (`@visakha/shared-utils`)

This package is the core **resilience, diagnostic, and math utility library** for the **Vi-Sakha** workspace. It provides drop-in resilience patterns and logging configurations to ensure fault-tolerance during inter-service API and WebSocket communications.

---

## 🏗️ Folder Structure & Layout

* `/src`
  * `index.ts` — Central exporter of utility functions.
  * `circuit-breaker.ts` — Implements the **Circuit Breaker Design Pattern** to isolate downstream microservice failures.
  * `retry.ts` — Provides resilient **exponential-backoff retry loops** for network requests.
  * `token-counter.ts` — A utility for counting text tokens to avoid system-context overflows.
  * `logger.ts` — High-performance, structured logging adapter for standard output tracking.
  * `tsconfig.json` — Pre-configures TS output definitions.
  * `package.json` — Workspace linkage variables.

---

## 🔗 Key Design Patterns Implemented

### 1. Circuit Breaker (`circuit-breaker.ts`)
* **Purpose:** Prevents cascading service failures. When requesting external REST APIs (such as the Python RAG server), if requests fail consistently, the circuit breaker **trips open**, immediately returning cached/fallback errors instead of blocking threads.
* **States:** `Closed` (normal routing), `Open` (fallback active), and `Half-Open` (canary testing requests to check downstream recovery).

### 2. Resilient Retry Loops (`retry.ts`)
* **Purpose:** Automatically recovers from transient hiccups (like network drops).
* **Strategy:** Executes calls with customizable max-retry parameters and **exponential backoff delay buffers** (increasing delay between consecutive attempts) to avoid storming the target server.

### 3. Context Token Budgeting (`token-counter.ts`)
* **Purpose:** Estimates token usage in LLM queries (e.g. Claude or Gemini prompts) to prevent prompt length overflows and control operational costs.

---

## 🚀 How to Build
To re-bundle this package:
```bash
# Run from the project root directory
npm run build:packages
```
Dependent services import these libraries using:
```typescript
import { CircuitBreaker, retry, TokenCounter } from '@visakha/shared-utils';
```
