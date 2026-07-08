# SUBMISSION — CoachAI (Tether Developers Cup 2026)

## Project

**CoachAI** — Private on-device football coach + self-custody wallet.

Combines **QVAC** (on-device AI via Llama 3.2 1B) + **WDK** (self-custody wallet on Tron Nile testnet) on a football/tournament theme.

## Tracks Used

| Track | Real Integration | How |
|-------|-----------------|-----|
| **QVAC** | ✅ Real on-device inference | `@qvac/llm-llamacpp` (qvac-fabric-llm.cpp) on Bare runtime. Llama 3.2 1B Instruct Q4_K_M loaded into memory. ~19.5 tok/s on CPU. Zero cloud. |
| **WDK** | ✅ Real self-custody wallet | `@tetherto/wdk` + `@tetherto/wdk-wallet-tron`. Real BIP-39 seed, Tron Nile address, on-chain balance, fee quotes, signed+broadcast transactions. Policy engine enforces tip caps. |

**Multi-track combination** → eligible for Cup Champion ($5,000).

## Links

- **GitHub:** https://github.com/ubongn/coachai-tether
- **Live demo:** https://coachai-tether.vercel.app (static demo mode with recorded on-device samples)
- **Proof of real integration:** `PROOF_REAL_INTEGRATION.txt` in repo root

## Demo Video

*(link to be added — 3 min screen recording of local run with real on-device AI + real WDK transaction)*

## Tech Stack

- **Backend:** Node.js ≥22, Fastify
- **On-device AI:** QVAC via Holepunch Bare runtime + `@qvac/llm-llamacpp`
- **Model:** Llama 3.2 1B Instruct (Q4_K_M, 770MB GGUF)
- **Wallet:** WDK (`@tetherto/wdk` + `@tetherto/wdk-wallet-tron`) on Tron Nile testnet
- **Frontend:** React 18 + TypeScript, Vite 5, PWA (offline-capable)
- **Football data:** football-data.org API (with bundled snapshot fallback)

## Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/analyze` | On-device tactical analysis of a fixture |
| `POST /api/ask` | Free-form coach Q&A (on-device) |
| `POST /api/wallet/tip` | Real WDK-signed tip on Tron Nile |
| `GET /api/health` | QVAC status + wallet address |

## Builder

Ubong — github.com/ubongn

## License

Apache 2.0
