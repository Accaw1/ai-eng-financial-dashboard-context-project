# Current Status

## Verified Working

- Both Compose images built successfully with `docker compose up --build -d` during Phase 1.
- Both Compose containers started and reported `Up` in `docker compose ps`.
- Direct backend health check succeeded: `GET http://localhost:8000/health` returned HTTP 200 and `{"status":"ok"}`.
- Direct backend metrics check succeeded: `GET http://localhost:8000/api/metrics` returned HTTP 200.
- Frontend root check succeeded: `GET http://localhost:5173/` returned HTTP 200.
- The backend process responded to an internal request at `127.0.0.1:8000/health`.
- On 2026-11-02 and 2026-11-03, all three runtime paths succeeded: direct backend, frontend container to `backend:8000`, and the Vite proxy `localhost:5173/api/metrics` (HTTP 200, 360 movements).
- Host-side frontend checks pass from `frontend/`: `npm run build` (0 warnings), `npm run lint`, and `npm test` (9 tests).
- Backend tests pass inside the container: `docker compose exec -T backend python -m pytest -q` (15 passed, 1 pre-existing Starlette warning). The host Python environment still lacks FastAPI.
- The full pre-merge procedure is `skills/dashboard-merge-check/SKILL.md`. See [progress.md](progress.md) for the 2026-11-03 skills session.

## Known Gaps and Issues

### Docker proxy path: working now, root cause of the earlier failure unknown

During Phase 1, requests from the frontend container to `http://backend:8000` timed out, so `localhost:5173/api/metrics` hung. On 2026-11-02 and 2026-11-03 the same paths succeeded, with no repository change to Compose or Vite config. The original cause was never identified, so keep checking all three paths after any restart. [verification.md](../verification.md) still records the Phase 1 failure.

After a Codespace restart, `docker compose up -d` can fail with `container with given ID already exists`. Running `docker compose down && docker compose up -d` recovers it.

### Startup readiness is not modeled

[docker-compose.yml](../docker-compose.yml) uses `depends_on` but defines no Docker healthchecks. Container status therefore does not prove that the backend is ready or that the frontend proxy works.

### Test coverage is uneven

[backend/tests/test_routes.py](../backend/tests/test_routes.py) covers API contracts and deterministic mock behavior. [frontend/src/lib/financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts) covers utility calculations. [frontend/src/App.test.tsx](../frontend/src/App.test.tsx), added 2026-11-03, covers the pending, success, HTTP error, and network failure states of the dashboard fetch (jsdom environment). Charts are not rendered meaningfully in jsdom; chart accessibility is checked against the live app by the merge-check skill.

### Date label and data range can diverge

The dashboard displays a static `2024 - Full Year` label in [frontend/src/App.tsx](../frontend/src/App.tsx), while backend mock dates are generated relative to `date.today()` in [backend/app/routes.py](../backend/app/routes.py).

## Next Priorities

1. Add readiness healthchecks if the Compose stack is expected to self-report healthy startup.
2. Make the displayed dashboard period reflect the actual configured or returned data range.
3. Decide whether dependency reproducibility requires strict frontend lockfile installation and pinned backend requirements.
4. Translate or localize the Spanish error banner. It is currently marked `lang="es"` on an English page.
5. Update [verification.md](../verification.md) to record that the proxy paths now pass, with dates.
