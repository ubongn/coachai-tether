# CoachAI — Architecture

## Goals

1. **Zero-trust data path:** match data and AI inference never leave the device.
2. **Track compliance:** QVAC + WDK are the canonical inference + wallet surfaces (no simulation).
3. **Judge-ready UX:** PWA, offline-first, single-screen coach flow.

## Backend (`backend/` — Node.js / Fastify)

| File | Responsibility |
|------|---------------|
| `server.js` | Fastify HTTP server — all `/api/*` routes, CORS, error handling |
| `config.js` | Centralised env config + wallet-seed persistence (`.coachai/seed.txt`) |
| `qvac-bridge.js` | Spawns Bare-runtime worker, communicates via newline-delimited JSON-RPC over stdio. Auto-restarts on crash (Windows pipe race self-heal). |
| `wallet.js` | Real WDK integration — BIP-39 seed, Tron Nile account derivation, balance, fee quotes, signed+broadcast transactions, policy engine (tip cap enforcement) |
| `tactics.js` | Prompt construction — builds grounded prompts from real match data, routes through QVAC bridge for on-device inference |
| `football.js` | football-data.org API integration (live fixtures + standings) with bundled real-data snapshot fallback |

## QVAC Worker (`qvac-worker/worker.cjs` — Bare runtime)

Runs on the **Holepunch Bare runtime** (not Node.js) because `@qvac/llm-llamacpp` (qvac-fabric-llm.cpp) ships as a Bare native addon.

- Loads Llama 3.2 1B Instruct (Q4_K_M, 770MB GGUF) into memory once (~1.9s on CPU).
- Serves completion requests via JSON-RPC over stdio:
  - Request: `{"id":1, "type":"complete", "messages":[{"role":"system","content":"..."},{"role":"user","content":"..."}]}`
  - Response: `{"id":1, "ok":true, "text":"...", "ms":1234, "chunks":65}`
- Auto-restarts if the Bare worker crashes (Windows spawn pipe race condition).

## Frontend (`frontend/` — React + TypeScript PWA)

- Built with **Vite 5** + `vite-plugin-pwa` (installable, offline-capable).
- Dev server proxies `/api/*` to `localhost:8000`.
- **Static deploy fallback:** when no backend is reachable (e.g. Vercel), the app uses pre-recorded on-device samples — clearly labelled as "recorded on-device demo" — so the public URL still demonstrates the product.
- Mobile-first, light theme, single-page UX: analysis → Q&A → wallet tips.

## Data Flow

1. User enters/selects a fixture in the React UI.
2. Frontend calls `POST /api/analyze` with `{ home, away }`.
3. Backend builds a grounded prompt from real standings/form data.
4. Backend sends prompt to QVAC worker → Llama 3.2 1B generates tactical analysis on-device.
5. Frontend renders: recommended formation, pressing strategy, key matchup, in-game adjustment.
6. User can ask follow-up questions → `POST /api/ask` → same on-device pipeline.
7. "Tip Team" → `POST /api/wallet/tip` → WDK signs + broadcasts real Tron Nile tx.

## Security

- Wallet seed persisted locally (`.coachai/seed.txt`, mode 0600). In production, move signing client-side for true self-custody.
- WDK policy engine enforces a tip cap (default: 100 TRX) — transactions above cap are DENY'd before signing.
- QVAC worker runs as a local child process — no network egress for inference.
