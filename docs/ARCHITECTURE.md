# CoachAI — Architecture

## Goals

1. **Zero-trust data path:** match data never leaves the device.
2. **Track compliance:** use QVAC + WDK as the canonical inference + wallet surfaces.
3. **Judge-ready UX:** PWA, offline-first, single-screen coach flow.

## Backend (`backend/`)

- `app/main.py`: FastAPI app; 4 public endpoints.
- `app/coachai/qvac_engine.py`: local inference surface. Simulation mode enables delivery before docs are confirmed; a `QVAC SDK` call can be dropped in without changing interfaces.
- `app/coachai/wallet/wdk_client.py`: self-custody wallet surface. Same swap pattern: simulate until real SDK call is wired.

## Frontend (`frontend/`)

- React + TypeScript PWA, built with Vite + vite-plugin-pwa.
- Runs fully offline after install: service worker caches shell, API calls proxy to local backend on `localhost:8000`.
- Mobile-first layout.

## Data Flow

1. User enters match stats in the React form.
2. Frontend calls `POST /api/analyze` with stats JSON.
3. Backend invokes QVAC local engine; returns `TacticalAnalysis`.
4. Frontend shows recommended formation, subs, confidence, predicted outcome.
5. "Tip Team" form sends `POST /api/wallet/tip`; backend uses WDK client.

## Security

- WDK client runs in backend process; in production, move signing client-side to guarantee self-custody.
- Open: CORS allowlist, pin later.
- Open: no mTLS; consider for live deployment.
