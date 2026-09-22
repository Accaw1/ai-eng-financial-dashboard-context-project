# Testing and Validation

## Rule: Extend backend contract tests with metrics changes

- **Scope:** Backend routes, response models, filters, aggregations, and generated data.
- **Rationale:** Existing tests protect response shapes, filtering, sorting, summaries, comparisons, alerts, B2B/B2C routes, and the deterministic 360-record dataset.
- **Action:** Add or update route-level tests for status, response shape, and behavior whenever those contracts change. Preserve or deliberately revise seed-dependent expectations.
- **Evidence:** [backend/tests/test_routes.py](../../backend/tests/test_routes.py), [backend/app/routes.py](../../backend/app/routes.py).

## Rule: Add UI or integration coverage for dashboard fetch behavior

- **Scope:** Dashboard loading, error handling, API fetching, and rendered state.
- **Rationale:** Current frontend tests cover utilities only; there are no component or API integration tests for [frontend/src/App.tsx](../../frontend/src/App.tsx).
- **Action:** Changes to the dashboard fetch or loading/error states must include a component or integration test in addition to utility tests.
- **Evidence:** [frontend/src/App.tsx](../../frontend/src/App.tsx), [frontend/src/lib/financial-utils.test.ts](../../frontend/src/lib/financial-utils.test.ts).

## Rule: Run commands from the owning project directory

- **Scope:** Local frontend and backend validation.
- **Rationale:** The repository has frontend scripts under `frontend/` and Python dependencies under `backend/`, with no root test/build command.
- **Action:** Run `npm` scripts from `frontend/` and run backend tests only after installing [backend/requirements.txt](../../backend/requirements.txt), or validate through Docker.
- **Evidence:** [frontend/package.json](../../frontend/package.json), [backend/requirements.txt](../../backend/requirements.txt).
