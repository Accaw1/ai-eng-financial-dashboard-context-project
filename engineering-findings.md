# Engineering Findings

This document records repository-specific conventions and risks identified during the Phase 2 handover inspection. Each finding is supported by repository files or observed runtime behavior.

## Architecture

### A1. Explicit frontend/backend boundary

- **Evidence:** [docker-compose.yml](docker-compose.yml), [frontend/vite.config.ts](frontend/vite.config.ts), [frontend/src/App.tsx](frontend/src/App.tsx)
- **Finding:** The React app calls `/api/metrics`, and Vite proxies `/api` to the Compose service `backend:8000`.
- **Impact:** Frontend API calls should preserve this relative `/api/...` boundary unless a documented `VITE_API_BASE_URL` override is intentionally used.

### A2. Backend uses generated in-memory data

- **Evidence:** [backend/app/routes.py](backend/app/routes.py)
- **Finding:** Every endpoint generates mock movements in memory with `generate_mock_movements(seed=42)`. There is no database, repository, or persistence layer.
- **Impact:** Data does not persist between requests. Replacing the mock source will affect every route and the tests that depend on the deterministic dataset.

### A3. Route and domain logic is centralized

- **Evidence:** [backend/app/routes.py](backend/app/routes.py)
- **Finding:** Models, generation, filtering, aggregation, and all route handlers are implemented in one module.
- **Impact:** This is the current backend ownership boundary. New endpoint work must account for the shared helpers and models rather than duplicating equivalent logic.

## Naming

### N1. API field names use `snake_case` across Python and TypeScript

- **Evidence:** [backend/app/routes.py](backend/app/routes.py), [frontend/src/lib/financial-types.ts](frontend/src/lib/financial-types.ts)
- **Finding:** Fields such as `create_date`, `operation_type`, and `business_type` are used directly in both API responses and frontend types.
- **Impact:** Renaming fields in only one layer will break response typing, filtering, and frontend calculations.

### N2. Components use kebab-case filenames and PascalCase exports

- **Evidence:** [frontend/src/components/dashboard/dashboard-header.tsx](frontend/src/components/dashboard/dashboard-header.tsx), [frontend/src/components/dashboard/kpi-row.tsx](frontend/src/components/dashboard/kpi-row.tsx)
- **Finding:** Component filenames use kebab-case while exported React components use PascalCase.
- **Impact:** New components should follow both conventions to keep imports predictable.

## Testing

### T1. Backend tests protect API contracts and deterministic mock behavior

- **Evidence:** [backend/tests/test_routes.py](backend/tests/test_routes.py)
- **Finding:** Tests cover status codes, response shapes, filters, sorting, summaries, comparisons, alerts, B2B/B2C routes, and the fixed 360-record dataset.
- **Impact:** Changes to generated data or response schemas can break many behavioral assumptions even when the server still starts.

### T2. Frontend tests cover utilities but not rendered UI or API integration

- **Evidence:** [frontend/src/lib/financial-utils.test.ts](frontend/src/lib/financial-utils.test.ts), [frontend/src/App.tsx](frontend/src/App.tsx)
- **Finding:** Tests cover KPI calculations, monthly aggregation, and formatters. There are no component tests or tests for the fetch/loading/error path.
- **Impact:** Dashboard rendering and frontend-to-backend failures can pass the current frontend test suite undetected.

### T3. Validation commands are directory-specific

- **Evidence:** [frontend/package.json](frontend/package.json), [backend/requirements.txt](backend/requirements.txt)
- **Finding:** Frontend scripts exist only under `frontend/`; backend tests require dependencies from `backend/requirements.txt`. There is no root-level test or build command.
- **Impact:** Contributors and agents must run frontend commands from `frontend/` and backend tests in an environment where backend requirements are installed.

## Documentation

### D1. Startup documentation defines the intended local workflow

- **Evidence:** [README.md](README.md), [README.es.md](README.es.md)
- **Finding:** Both READMEs document `docker compose up --build`, service URLs, API docs, and the optional `VITE_API_BASE_URL` override.
- **Impact:** These are the primary onboarding instructions and must remain synchronized with ports, proxy behavior, and startup commands.

### D2. Verification status contains contradictory proxy claims

- **Evidence:** [verification.md](verification.md)
- **Finding:** The document marks frontend communication and the end-to-end metrics URL with `[X]`, while also stating that frontend-to-backend connections time out.
- **Impact:** Future contributors or agents may interpret the checklist as passing even though the primary proxy path is broken.

### D3. Documentation does not clearly explain the Docker networking failure

- **Evidence:** [README.md](README.md), [verification.md](verification.md), Phase 1 runtime probes
- **Finding:** The README says the Vite proxy works by default, while runtime checks showed requests from the frontend container to `backend:8000` timing out.
- **Impact:** A contributor may debug application fetch code instead of investigating the container network path.

## Developer Experience (DX)

### X1. Docker and host development environments are not equivalent

- **Evidence:** [frontend/Dockerfile](frontend/Dockerfile), [backend/Dockerfile](backend/Dockerfile), [docker-compose.yml](docker-compose.yml)
- **Finding:** Docker installs project dependencies during image builds, but there are no root-level setup scripts. Host backend tests failed because FastAPI was unavailable, and host frontend validation was blocked by unusable local dependencies.
- **Impact:** Contributors must choose Docker-based validation or install each project’s dependencies locally; a root command cannot currently be assumed.

### X2. The frontend volume layout can create dependency ownership problems

- **Evidence:** [docker-compose.yml](docker-compose.yml), Phase 1 host validation
- **Finding:** The Compose setup bind-mounts `./frontend:/app` and separately mounts `/app/node_modules`. Subsequent host `npm install` attempts produced `EACCES` errors in `frontend/node_modules`.
- **Impact:** Dependency installation and file ownership can vary depending on whether Docker or the host created the dependency directory.

## Configuration

### C1. A frontend lockfile exists, but the image does not use it strictly

- **Evidence:** [frontend/package-lock.json](frontend/package-lock.json), [frontend/Dockerfile](frontend/Dockerfile)
- **Finding:** The repository contains a lockfile, but the Dockerfile runs `npm install` rather than `npm ci`.
- **Impact:** Image builds may resolve dependency changes differently from a clean lockfile installation.

### C2. Backend dependency versions are unpinned

- **Evidence:** [backend/requirements.txt](backend/requirements.txt)
- **Finding:** FastAPI, Uvicorn, debugpy, pytest, pytest-cov, and httpx have no version constraints.
- **Impact:** Rebuilds can resolve newer dependency versions and produce behavior different from the handover environment.

### C3. CORS is fully permissive

- **Evidence:** [backend/app/main.py](backend/app/main.py)
- **Finding:** The API configures `allow_origins=["*"]` with all methods, headers, and credentials enabled.
- **Impact:** This is convenient for development but should not be treated as an appropriate production security boundary.

## Docker/Infrastructure

### I1. Compose controls startup order, not readiness

- **Evidence:** [docker-compose.yml](docker-compose.yml)
- **Finding:** The frontend has `depends_on: backend`, but neither service defines a Docker `healthcheck`.
- **Impact:** The frontend can start before the backend is ready, and `docker compose ps` can show both containers running while requests still fail.

### I2. Frontend-to-backend Docker networking is currently broken

- **Evidence:** [docker-compose.yml](docker-compose.yml), [frontend/vite.config.ts](frontend/vite.config.ts), [verification.md](verification.md), Phase 1 runtime probes
- **Finding:** The frontend container resolves `backend` to `172.18.0.2`, but requests to `http://backend:8000` time out. Direct host requests to `localhost:8000/health` and `localhost:8000/api/metrics` succeed, while `localhost:5173/api/metrics` hangs.
- **Impact:** The dashboard’s primary data path is unusable through the intended Vite proxy even though both containers report `Up`.

### I3. The backend runs with reload and a debugger enabled by default

- **Evidence:** [backend/Dockerfile](backend/Dockerfile)
- **Finding:** The default command starts debugpy and Uvicorn with `--reload`.
- **Impact:** This is appropriate for development but adds process overhead and should not be treated as a production container command.

## Frontend

### F1. The dashboard depends on one untested API fetch path

- **Evidence:** [frontend/src/App.tsx](frontend/src/App.tsx)
- **Finding:** Initial rendering depends on `fetch(`${API_BASE_URL}/api/metrics`)`; failures only set a generic error message. There is no retry, timeout, cancellation, or integration test.
- **Impact:** Proxy or backend failures appear only as a dashboard error after load, and the current frontend tests do not protect this workflow.

### F2. The displayed period is static while API data is date-relative

- **Evidence:** [frontend/src/App.tsx](frontend/src/App.tsx), [frontend/src/components/dashboard/dashboard-header.tsx](frontend/src/components/dashboard/dashboard-header.tsx), [backend/app/routes.py](backend/app/routes.py)
- **Finding:** The UI displays `2024 - Full Year`, while backend mock dates are generated relative to `date.today()`.
- **Impact:** The visible period can diverge from the records displayed by the charts as time advances.

### F3. Date aggregation depends on JavaScript date parsing

- **Evidence:** [frontend/src/lib/financial-utils.ts](frontend/src/lib/financial-utils.ts)
- **Finding:** ISO date strings are converted with `new Date(m.create_date)` before extracting local year/month.
- **Impact:** Date-only parsing can move records across month boundaries in some local time zones, affecting chart grouping.

## Backend

### B1. `/health` is a process check only

- **Evidence:** [backend/app/routes.py](backend/app/routes.py)
- **Finding:** The endpoint always returns `{"status": "ok"}` and checks no external dependency or frontend proxy path.
- **Impact:** A passing health endpoint does not prove that the frontend proxy or future data dependencies are usable.

### B2. Deterministic seeding is used per request

- **Evidence:** [backend/app/routes.py](backend/app/routes.py), [backend/tests/test_routes.py](backend/tests/test_routes.py)
- **Finding:** Routes call `generate_mock_movements(seed=42)`, and tests depend on the resulting categories, ordering, and record count.
- **Impact:** Changes to mock generation can alter many API and test results at once.

### B3. Mock generation mutates global random state

- **Evidence:** [backend/app/routes.py](backend/app/routes.py)
- **Finding:** `generate_mock_movements` invokes the global `random.seed` when a seed is supplied.
- **Impact:** Randomized behavior added elsewhere in the same process can be affected by request handling.

### B4. API values are constrained in both backend and frontend types

- **Evidence:** [backend/app/routes.py](backend/app/routes.py), [frontend/src/lib/financial-types.ts](frontend/src/lib/financial-types.ts)
- **Finding:** Operation types, categories, business types, and grouping modes are represented by backend `Literal` types and frontend TypeScript unions.
- **Impact:** Adding a new API value requires coordinated updates to backend validation, frontend types, and route tests.
