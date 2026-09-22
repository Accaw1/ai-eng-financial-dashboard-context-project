# Frontend Data Behavior

## Rule: Keep the displayed period consistent with returned data

- **Scope:** Dashboard header labels and backend-generated date ranges.
- **Rationale:** The UI displays a static `2024 - Full Year` label while backend mock dates are generated relative to `date.today()`.
- **Action:** Do not add or retain a hardcoded period label when the API data range is date-relative; derive the label from configuration or returned data.
- **Evidence:** [frontend/src/App.tsx](../../frontend/src/App.tsx), [frontend/src/components/dashboard/dashboard-header.tsx](../../frontend/src/components/dashboard/dashboard-header.tsx), [backend/app/routes.py](../../backend/app/routes.py).

## Rule: Handle API date-only values without untested timezone conversion

- **Scope:** Monthly aggregation of `YYYY-MM-DD` movement dates.
- **Rationale:** The utility currently calls `new Date(m.create_date)` before extracting local year and month.
- **Action:** When changing date aggregation, preserve calendar dates explicitly or add timezone-sensitive tests before relying on JavaScript date parsing.
- **Evidence:** [frontend/src/lib/financial-utils.ts](../../frontend/src/lib/financial-utils.ts).

## Rule: Treat the dashboard fetch path as a separately tested behavior

- **Scope:** `fetchFinancialData`, loading state, error state, and API response handling.
- **Rationale:** The dashboard has one fetch path with generic failure handling and no retry, timeout, cancellation, or integration test.
- **Action:** Any change to this path must cover both successful data loading and failed requests; utility-only tests do not establish dashboard health.
- **Evidence:** [frontend/src/App.tsx](../../frontend/src/App.tsx), [frontend/src/lib/financial-utils.test.ts](../../frontend/src/lib/financial-utils.test.ts).
