# Docker Runtime

## Rule: Do not treat `depends_on` as readiness

- **Scope:** Compose startup and service health checks.
- **Rationale:** Compose currently orders frontend after backend but defines no Docker healthchecks.
- **Action:** Use explicit HTTP checks for `/health`, direct `/api/metrics`, and the frontend-proxied `/api/metrics` after startup. If readiness becomes a dependency, add a healthcheck and readiness-aware configuration.
- **Evidence:** [docker-compose.yml](../../docker-compose.yml), [backend/app/routes.py](../../backend/app/routes.py).

## Rule: Verify container-to-container and host-proxied networking separately

- **Scope:** Frontend-to-backend Docker networking and Vite proxy changes.
- **Rationale:** The frontend container resolved `backend` but timed out connecting to `backend:8000`; direct host backend requests succeeded while `localhost:5173/api/metrics` hung.
- **Action:** After Compose or proxy changes, test `http://backend:8000/health` from the frontend container and `http://localhost:5173/api/metrics` from the host. Do not mark the stack healthy from `docker compose ps` alone.
- **Evidence:** [frontend/vite.config.ts](../../frontend/vite.config.ts), [docker-compose.yml](../../docker-compose.yml), [verification.md](../../verification.md).

## Rule: Keep the default container command development-only

- **Scope:** Backend Docker execution mode.
- **Rationale:** The backend image starts debugpy and Uvicorn with `--reload`.
- **Action:** Do not reuse the current Docker command as a production command without explicitly replacing debugpy/reload behavior.
- **Evidence:** [backend/Dockerfile](../../backend/Dockerfile).
