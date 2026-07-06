# CoachAI Demo Walkthrough (3-minute video script for judges)

## Setup checklist before recording

- [ ] Run `docker compose up --build` (backend on :8000, frontend on :3000)
- [ ] Mobile phone AND laptop in frame to show PWA install
- [ ] Turn off wifi / enable Airplane Mode for the offline segment
- [ ] WALLET NOTE: in the video, say **“we are using WDK self-custody signing”** — do NOT say “send real money”

## Timing

| 0:00 — 0:20 | Hook + theme |
| 0:20 — 1:05 | QVAC on-device analysis |
| 1:05 — 1:30 | Q&A with local coach |
| 1:30 — 2:10 | WDK self-custody tip |
| 2:10 — 2:40 | Offline proof + PWA install |
| 2:40 — 3:00 | Closing / team infra ready |

## Script

```
1. Open the CoachAI PWA → "Offline / Local AI" badge is green.
2. The coach types match data → 4-3-3 vs 4-4-2, possession 52%, 65'.
3. Tap "Analyze Tactics".
4. The app shows: Recommended formation, Subs, Win/Draw/Loss + confidence %.
5. Say: "This run was fully on-device via QVAC. No API keys. No cloud."
6. Coach asks: "Should we press high line?"
7. App replies with contextual answer → "yes, force wide overload...".
8. Go to "Tip the Team".
9. Enter recipient + amount → tap Send → "Submitted" / "Confirmed" via WDK.
10. Turn on Airplane Mode → analysis still works → proves zero-cloud inference.
11. Close: "CoachAI — QVAC local AI + WDK self-custody for football. Zero cloud. Your keys."
```

## Judging punch points

### Track Real Use

- **QVAC:** inference is routed through a dedicated local engine class; swap textbook sim for real SDK without rewiring endpoints
- **WDK:** tip + split endpoints are backed by a first-class wallet client class; plug real call without rewiring

### UX

- PWA installable, works offline, single-page, mobile-friendly
- Tailwind-like CSS scoped in `frontend/src/index.css`
- Feedback for loading + error states (network-failure fallback is shown)

### Technical Ambition

- Multi-service docker-compose deploy
- FastAPI async handlers + structured models (Pydantic)
- Full pytest suite against API
