# Product Overview

## Purpose

This repository contains a Financial Metrics Dashboard: a React and TypeScript frontend presents financial KPIs and charts backed by a FastAPI metrics API. The README describes it as a financial metrics dashboard, and the main UI is implemented in [frontend/src/App.tsx](../frontend/src/App.tsx).

## Main Pieces

- **Frontend entry point:** [frontend/src/main.tsx](../frontend/src/main.tsx) mounts the React application into the HTML root element.
- **Dashboard composition:** [frontend/src/App.tsx](../frontend/src/App.tsx) renders the header, KPI row, income/outcome chart, and profit percentage chart.
- **Frontend calculations:** [frontend/src/lib/financial-utils.ts](../frontend/src/lib/financial-utils.ts) calculates totals, profit, percentages, and month-level chart data from API movements.
- **Backend entry point:** [backend/app/main.py](../backend/app/main.py) creates the FastAPI application, configures CORS, and includes the router.
- **Backend API:** [backend/app/routes.py](../backend/app/routes.py) exposes `/health`, `/api/metrics`, and additional facets, summary, category, comparison, alert, B2B, and B2C endpoints.
- **Service connection:** [frontend/vite.config.ts](../frontend/vite.config.ts) proxies `/api` to `http://backend:8000`; [docker-compose.yml](../docker-compose.yml) runs the frontend and backend services together.

## Data Model

The backend currently generates deterministic in-memory mock movements with `seed=42` for each request. There is no database or persistence layer. The shared movement fields include `create_date`, `amount`, `operation_type`, `category`, and `business_type`; those names are mirrored in [frontend/src/lib/financial-types.ts](../frontend/src/lib/financial-types.ts).

## Runtime Boundary

The intended local flow is:

1. The browser loads the Vite frontend on port `5173`.
2. The dashboard requests `/api/metrics`.
3. Vite proxies that request to the backend service on port `8000`.
4. The backend returns generated movements.
5. The frontend computes KPI and chart data locally.

The backend direct endpoints and frontend HTML were verified, but the frontend-container-to-backend proxy path timed out during Phase 1 verification.
