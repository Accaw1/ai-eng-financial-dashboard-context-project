# Current Status

## Verified Working

- Both Compose images built successfully with `docker compose up --build -d` during Phase 1.
- Both Compose containers started and reported `Up` in `docker compose ps`.
- Direct backend health check succeeded: `GET http://localhost:8000/health` returned HTTP 200 and `{"status":"ok"}`.
- Direct backend metrics check succeeded: `GET http://localhost:8000/api/metrics` returned HTTP 200.
- Frontend root check succeeded: `GET http://localhost:5173/` returned HTTP 200.
- The backend process responded to an internal request at `127.0.0.1:8000/health`.
- Backend route tests and frontend validation scripts exist, but host-side execution was not fully verified because the host Python environment lacked FastAPI, the host frontend environment lacked usable TypeScript dependencies, and host `npm install` encountered permissions in `frontend/node_modules`.

## Known Gaps and Issues

### Docker proxy path is broken

The frontend container resolves the Compose hostname `backend` to its Docker network address, but requests to `http://backend:8000` timed out. As a result, `http://localhost:5173/api/metrics` also timed out even though direct access to `localhost:8000/api/metrics` worked. This is documented in [verification.md](../verification.md) and is the highest-priority runtime issue.

### Startup readiness is not modeled

[docker-compose.yml](../docker-compose.yml) uses `depends_on` but defines no Docker healthchecks. Container status therefore does not prove that the backend is ready or that the frontend proxy works.

### Test coverage is uneven

[backend/tests/test_routes.py](../backend/tests/test_routes.py) covers API contracts and deterministic mock behavior. [frontend/src/lib/financial-utils.test.ts](../frontend/src/lib/financial-utils.test.ts) covers utility calculations, but there are no frontend component or API integration tests for the fetch, loading, and error path in [frontend/src/App.tsx](../frontend/src/App.tsx).

### Date label and data range can diverge

The dashboard displays a static `2024 - Full Year` label in [frontend/src/App.tsx](../frontend/src/App.tsx), while backend mock dates are generated relative to `date.today()` in [backend/app/routes.py](../backend/app/routes.py).

## Next Priorities

1. Diagnose and fix or explicitly isolate the Docker frontend-to-backend connectivity failure, then re-run direct, container-to-container, and Vite-proxied HTTP checks.
2. Add readiness healthchecks if the Compose stack is expected to self-report healthy startup.
3. Add frontend integration coverage for the dashboard fetch and error states.
4. Decide whether dependency reproducibility requires strict frontend lockfile installation and pinned backend requirements.
5. Make the displayed dashboard period reflect the actual configured or returned data range.
