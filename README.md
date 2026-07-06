# ⚽ CoachAI — Private On-Device Football Coach + Self-Custody Wallet

**Tagline:** *Your private AI tactics coach. No cloud. Own your keys. Tip your team.*

> Built for the **Tether Developers Cup 2026** — combining **QVAC** (on-device AI) + **WDK** (self-custody wallet) on a football / tournament theme.

## 🔥 Why this wins

- **Cup Champion play:** combines 2 tracks (QVAC + WDK) — explicitly “welcome and impressive” per the rules.
- **Hardest track first:** on-device AI via QVAC is the differentiator most teams skip.
- **Real community use:** youth coaches, players, parents need private analysis + instant team tips.
- **Zero cloud:** inference + wallet keys never leave the device.
- **Apache 2.0 license:** required by the competition.

## 🏗 Architecture

```
┌─────────────── PWA (React) — offline-capable standalone front-end ──────────────┐
│  1. Load match stats                                                          │
│  2. Backend calls local QVAC model                                            │
│  3. Formation, subs, predicted outcome                                        │
│  4. Coach asks follow-up; replies on-device                                    │
│  5. "Tip the team" → WDK self-custody tx                                      │
└───────────────────────────────┐
                                │ HTTP
                    ┌───────────▼────────────┐
                    │ FastAPI Backend        │
                    │  - /api/analyze        │
                    │  - /api/ask            │
                    │  - /api/wallet/tip     │
                    │  - /api/wallet/split   │
                    └───────────┬────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              │                                    │
        ┌─────▼──────┐                      ┌────────▼──────┐
        │ QVAC SDK   │                      │ WDK SDK       │
        │ local infer │                      │ sign + send   │
        └────────────┘                      └───────────────┘
```

## 🚀 Quickstart

Requires **Docker Desktop** and **Git**.

```bash
git clone git@github-ubong:ubongn/coachai-tether.git
cd coachai-tether
cp .env.example .env
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Docs: http://localhost:8000/docs

## 🧪 Run Tests

```bash
cd coachai-tether/backend
pip install -r requirements.txt
pytest -q
```

## 🎬 3-minute Demo Flow (judges)

1. Open app (PWA installable) → shows offline mode badge + WDK "keys on device."
2. Enter match stats → tap **Analyze Tactics** → response shows formation, subs, predicted outcome.
3. Show it works without internet (turn off wifi / airplane mode) → inference completes.
4. Ask follow-up: *"Should we press high?"* → model answers.
5. Hit **Tip Team** → WDK signs self-custody tx → success screen.

Key punchline: *“Zero cloud. Your keys. Your tactics.”*

## 📁 Repo Structure

```
coachai-tether/
├── README.md
├── LICENSE
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── models.py
│       ├── coachai/
│       │   ├── qvac_engine.py
│       │   └── wallet/
│       │       ├── wdk_client.py
│       └── tests/
│           └── test_api.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        └── index.css
```

## 🔌 Track Usage

- **QVAC:** all AI inference goes through `QVACEngine` (local). TODO: swap `_simulate_*` with real QVAC SDK once docs are confirmed.
- **WDK:** tips / splits go through `WDKClient` (self-custodial). TODO: plug real WDK SDK call once docs are confirmed.

## 🗓 Milestones

- **Jul 4:** MVP scaffold + tests + PWA
- **Jul 6:** register on DoraHacks + push daily commits
- **Jul 8:** first cut submission + video + top 16 target
- **Jul 12:** second cut / top 4
- **Jul 14:** final freeze
- **Jul 15–18:** live pitch

## ⚖️ License

Apache 2.0 — see [LICENSE](./LICENSE).
