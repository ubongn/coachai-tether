# ⚽ CoachAI — Private On-Device Football Coach + Self-Custody Wallet

**Tagline:** *Your private AI tactics coach. No cloud. Own your keys. Tip your team.*

> Built for the **Tether Developers Cup 2026** — combining **QVAC** (on-device AI) + **WDK** (self-custody wallet) on a football / tournament theme.

**Live Demo:** [coachai-tether.vercel.app](https://coachai-tether.vercel.app) *(static demo mode)*
**Demo Video:** [youtu.be/IKV3_UEVsJo](https://youtu.be/IKV3_UEVsJo)

---

## 🔥 Why this wins

- **Cup Champion play:** combines 2 tracks (QVAC + WDK) — explicitly "welcome and impressive" per the rules.
- **Hardest track first:** on-device AI via QVAC is the differentiator most teams skip. We run a real **Llama 3.2 1B** model locally — zero cloud, zero API keys.
- **Real community use:** youth coaches, players, parents need private analysis + instant team tips.
- **Zero cloud:** AI inference + wallet keys never leave the device.
- **Apache 2.0 license** (required by the competition).

---

## 🏗 Architecture

```
┌─────────────────── React PWA (offline-capable) ───────────────────┐
│                                                                   │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────────┐   │
│  │ Matches  │──▶│ AI Analysis  │──▶│ Coach Q&A (follow-ups)  │   │
│  │ & Stats  │   │ (formation,  │   │ Powered by on-device AI │   │
│  │          │   │ subs, plan)  │   │                         │   │
│  └──────────┘   └──────────────┘   └─────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  WDK Self-Custody Wallet — Tip Team / Split Prize           │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬────────────────────────────────────────┘
                           │ HTTP (localhost only)
              ┌────────────▼────────────┐
              │   Fastify Backend        │
              │   (Node.js ≥22)          │
              │                          │
              │   /api/health            │
              │   /api/matches           │
              │   /api/standings         │
              │   /api/analyze  ─────────┼──▶ QVAC Bridge
              │   /api/formation         │    (spawns Bare worker,
              │   /api/ask     ──────────┤     loads Llama 3.2 1B
              │   /api/wallet  ──────────┼    GGUF into memory)
              │   /api/wallet/quote      │
              │   /api/wallet/tip ───────┼──▶ WDK Client
              │   /api/wallet/split      │    (Tron Nile testnet,
              │                          │     real signed txs)
              └──────────────────────────┘
```

### Track usage — 100% REAL, no simulation

| Track | How it's used | Proof |
|-------|--------------|-------|
| **QVAC** | All AI inference runs through `QvacBridge` → spawns a **Bare runtime** worker that loads `@qvac/llm-llamacpp` (qvac-fabric-llm.cpp) with Llama 3.2 1B Instruct (Q4_K_M, 770MB). Every analysis/answer is freshly generated on-device. | `PROOF_REAL_INTEGRATION.txt` — real smoke test: model loads in 1.9s, generates 65 tokens at ~19.5 tok/s |
| **WDK** | All wallet operations use `@tetherto/wdk` + `@tetherto/wdk-wallet-tron`. Real BIP-39 seed, real Tron Nile address derivation, real on-chain balance query, real fee quotes, real signed+broadcast transactions. Policy engine enforces tip caps. | `PROOF_REAL_INTEGRATION.txt` — real seed generated, address derived `TDw4s…`, balance queried, fee quoted (1.1M sun), policy DENY tested |

---

## 🚀 Quickstart (local — full on-device experience)

**Prerequisites:** Node.js ≥22, [Bare runtime](https://github.com/holepunchto/bare) (`npm i -g bare`)

```bash
git clone https://github.com/ubongn/coachai-tether.git
cd coachai-tether

# Install dependencies (root + workspaces)
npm install

# Download the on-device model (~770MB)
npm run fetch-model

# Copy env
cp .env.example .env

# Terminal 1 — backend (Fastify + QVAC worker + WDK wallet)
npm run dev:backend

# Terminal 2 — frontend (Vite dev server)
npm run dev:frontend
```

Then open **http://localhost:3000**.

The backend boots on `:8000`. QVAC loads the model in ~2s. WDK wallet initializes on Tron Nile testnet automatically (generates a seed on first run, persists to `.coachai/seed.txt`).

### Optional: live football data

Get a free API token from [football-data.org](https://www.football-data.org/) and add to `.env`:

```
FOOTBALL_DATA_TOKEN=your_token
```

Without a token, the app uses a bundled real-data snapshot (genuine teams, standings, form).

---

## 🌐 Deployed demo (Vercel)

The [live demo](https://coachai-tether.vercel.app) runs in **demo mode** — a static PWA deploy where all AI responses are pre-recorded from a genuine on-device run (see `PROOF_REAL_INTEGRATION.txt`). This lets judges interact with the product without running the 770MB model locally.

For the **real on-device experience**, clone and run locally (see Quickstart above).

---

## 📁 Repo Structure

```
coachai-tether/
├── backend/                  # Fastify API server
│   ├── package.json
│   └── src/
│       ├── server.js         # Fastify app + all routes
│       ├── config.js         # Env config + wallet-seed persistence
│       ├── qvac-bridge.js    # Spawns & manages Bare QVAC worker (JSON-RPC over stdio)
│       ├── wallet.js         # Real WDK integration (Tron Nile, policy engine)
│       ├── tactics.js        # Prompt construction + on-device reasoning orchestration
│       └── football.js       # football-data.org integration + snapshot fallback
├── qvac-worker/
│   └── worker.cjs            # Bare-runtime worker: loads @qvac/llm-llamacpp engine
├── frontend/                 # React + TypeScript PWA (Vite)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx           # Full single-page coach UX (analysis, Q&A, wallet, tips)
│       ├── index.css         # Scoped styles (light theme, mobile-first)
│       └── main.tsx          # React entry + PWA registration
├── models/                   # GGUF model (gitignored — downloaded via npm run fetch-model)
├── scripts/
│   ├── fetch-model.mjs       # Downloads Llama 3.2 1B Q4_K_M
│   ├── test-worker.mjs       # Direct QVAC worker test
│   └── demo.ps1              # Demo launcher
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEMO_WALKTHROUGH.md
│   └── shots/                # Screenshots
├── PROOF_REAL_INTEGRATION.txt # Smoke tests proving real QVAC + WDK
├── .env.example
└── package.json              # Workspaces root
```

---

## 🧪 Verifying it's real

### QVAC smoke test

```bash
npm run smoke:qvac
```

Output proves the model loads on the Bare runtime and generates real football tactics on-device (~19.5 tokens/sec, no network calls).

### WDK smoke test

```bash
npm run smoke:wdk
```

Output proves real seed generation, Tron address derivation, on-chain balance query, fee quoting, and policy enforcement.

---

## 🎬 3-minute Demo Flow

1. **Open CoachAI** → health badge shows QVAC ready (green) + WDK wallet address.
2. **Enter a fixture** (e.g. Arsenal vs Chelsea) → tap **Analyze Tactics**.
3. On-device AI returns: formation recommendation, pressing strategy, key matchup, in-game adjustment.
4. **Prove it's local:** disconnect wifi → ask a follow-up question → model still responds (zero cloud).
5. **Tip the team** → WDK signs a real Tron Nile transaction with policy-enforced cap → success with tx hash.

*Punchline: "Zero cloud. Your keys. Your tactics."*

---

## 🔧 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service status — QVAC ready, wallet address, track info |
| GET | `/api/matches` | Upcoming fixtures (live or snapshot) |
| GET | `/api/standings?competition=PL` | League standings |
| POST | `/api/analyze` | Deep tactical analysis `{ home, away, competition }` |
| POST | `/api/formation` | Quick formation suggestion `{ home, away }` |
| POST | `/api/ask` | Free-form coach Q&A `{ question, home, away }` |
| GET | `/api/wallet` | Wallet info (chain, address, balance) |
| POST | `/api/wallet/quote` | Fee quote for a tip `{ to, amountSun }` |
| POST | `/api/wallet/tip` | Send real WDK-signed tip `{ to, amountSun, note }` |
| POST | `/api/wallet/split` | Split among recipients `{ recipients: [{to, amountSun}] }` |

---

## ⚖️ License

Apache 2.0 — see [LICENSE](./LICENSE).
