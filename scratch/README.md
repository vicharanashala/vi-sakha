# 📝 Developer Scratchpad (`/scratch`)

This directory is reserved for developer scratchpads, manual inspection scripts, and database schema fix helpers used during active engineering phases. 

> [!NOTE]
> Files in this folder are intended for debugging and development testing, and are **not** deployed or invoked in the production container orchestration environments.

---

## 🔗 Utilities Inside

*   `fix-errors.js` / `fix-imports.js` — Helper scripts to resolve legacy import statements or TS namespace issues across the monorepo.
*   `home_cohorts.json` / `home_html.txt` — Mock scraper HTML and cohorts datasets parsed during manual testing.
*   `inspect_home.js` / `parse_home.js` — Scripts parsing landing page GSAP triggers and DOM tags.
*   `test_hp_api.js` / `test_serializer.js` — Small JSON serializer unit validations.

---

## ⚠️ Guidelines
1. Do **not** commit production-grade logic directly inside this folder.
2. Avoid hardcoding sensitive API tokens (`ANTHROPIC_API_KEY`, `FIREBASE_PRIVATE_KEY`) inside scratch scripts; read them from standard `.env` paths instead.
