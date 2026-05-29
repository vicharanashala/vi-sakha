# ⚙️ Shared Config Package (`@visakha/config`)

This package is the centralized environment configuration and validation module for the **Vi-Sakha** workspace. It acts as the single-source-of-truth for runtime parameters, system constants, database connections, and deep learning model configurations used across the backend and other microservices.

---

## 🏗️ Folder Structure & Layout

* `/src`
  * `index.ts` — Main TypeScript file declaring configuration validation schemas and variables.
  * `tsconfig.json` — TypeScript compiler flags mapping outputs to the build `/dist` directory.
  * `package.json` — Registers the npm workspace package name and linked package dependencies.

---

## 🔗 Configuration Scope & Constants

This package exports:
1. **Model Specifications:**
   * Text Embeddings model (`BAAI/bge-small-en-v1.5`)
   * Reranking cross-encoder model (`BAAI/bge-reranker-large`)
   * OCR engine settings (EasyOCR CPU configurations)
   * Captioning vision model (`Salesforce/blip-image-captioning-base`)
2. **GenAI Threshold Parameters:**
   * **Cosine Similarity Threshold (`0.45`):** Standard threshold below which RAG responses are marked `escalated`, indicating low confidence and triggering ticketing loops.
   * **Max Token Budgets:** Sliding window token counts for system contexts.
3. **Database Connection Settings:**
   * MongoDB connection retries and pool sizes.
   * Redis port mappings (`6379`) and socket connections.

---

## 🚀 How to Build & link
This package is linked via npm workspaces. To rebuild after making changes:
```bash
# Run from the project root directory
npm run build:packages
```
This compiles `index.ts` into a standard CommonJS/ESM output under `/dist` which is automatically resolved by all dependent services using `import { config } from '@visakha/config'`.
