# API Contracts and Naming

## Rule: Preserve the `/api` boundary

- **Scope:** Frontend API calls, Vite proxy configuration, and Compose service routing.
- **Rationale:** The dashboard calls relative `/api/...` URLs and Vite proxies them to `backend:8000`.
- **Action:** Keep frontend requests relative to `/api` unless a documented `VITE_API_BASE_URL` override is required. When changing routing, test direct backend access and the Vite-proxied URL separately.
- **Evidence:** [frontend/src/App.tsx](../../frontend/src/App.tsx), [frontend/vite.config.ts](../../frontend/vite.config.ts), [docker-compose.yml](../../docker-compose.yml).

## Rule: Keep API field names synchronized across Python and TypeScript

- **Scope:** Backend response models, query parameters, and frontend financial types.
- **Rationale:** The frontend consumes fields such as `create_date`, `operation_type`, and `business_type` directly.
- **Action:** Preserve existing `snake_case` field names in both layers, or add an explicit mapping and update route and utility tests before changing the contract.
- **Evidence:** [backend/app/routes.py](../../backend/app/routes.py), [frontend/src/lib/financial-types.ts](../../frontend/src/lib/financial-types.ts).

## Rule: Update all constrained value definitions together

- **Scope:** Operation types, categories, business types, grouping modes, and their tests.
- **Rationale:** These values are constrained by backend `Literal` types and frontend TypeScript unions.
- **Action:** When adding a value, update the backend type, frontend type, validation behavior, and relevant route tests in the same change.
- **Evidence:** [backend/app/routes.py](../../backend/app/routes.py), [frontend/src/lib/financial-types.ts](../../frontend/src/lib/financial-types.ts), [backend/tests/test_routes.py](../../backend/tests/test_routes.py).
