# Tech Stack

## Application

- **Frontend language:** TypeScript, configured through [frontend/tsconfig.app.json](../frontend/tsconfig.app.json) and [frontend/tsconfig.node.json](../frontend/tsconfig.node.json).
- **Frontend framework:** React 19 with `react-dom`, mounted from [frontend/src/main.tsx](../frontend/src/main.tsx).
- **Frontend build/dev tooling:** Vite 8, the React Vite plugin, and the Tailwind CSS Vite plugin, configured in [frontend/vite.config.ts](../frontend/vite.config.ts).
- **Frontend UI/data dependencies:** Recharts for charts, lucide-react for icons, and class-variance-authority, clsx, and tailwind-merge for styling utilities. These are listed in [frontend/package.json](../frontend/package.json).
- **Frontend quality tooling:** ESLint, TypeScript, and Vitest. Scripts are defined in [frontend/package.json](../frontend/package.json).

## Backend

- **Backend language:** Python.
- **Backend framework:** FastAPI, with Uvicorn as the development server.
- **Backend support tooling:** debugpy for the exposed debugger port, pytest and pytest-cov for tests, and httpx for FastAPI test-client support. Dependencies are listed in [backend/requirements.txt](../backend/requirements.txt).
- **Backend structure:** [backend/app/main.py](../backend/app/main.py) owns application creation; [backend/app/routes.py](../backend/app/routes.py) owns route handlers, Pydantic models, mock generation, filtering, and aggregation.

## Infrastructure

- **Orchestration:** Docker Compose in [docker-compose.yml](../docker-compose.yml).
- **Backend image:** Python 3.13 slim, exposing ports `8000` and `5678`, defined in [backend/Dockerfile](../backend/Dockerfile).
- **Frontend image:** Node 24 Alpine, exposing port `5173`, defined in [frontend/Dockerfile](../frontend/Dockerfile).
- **Published endpoints:** frontend `localhost:5173`, backend `localhost:8000`, and debugger `localhost:5678`. The README also documents FastAPI docs at `localhost:8000/docs`.

## Configuration Notes

The frontend has a committed [frontend/package-lock.json](../frontend/package-lock.json), but the Dockerfile currently runs `npm install`. Backend requirements are not version-pinned in [backend/requirements.txt](../backend/requirements.txt). The backend enables permissive CORS in [backend/app/main.py](../backend/app/main.py), and its default Docker command enables debugpy and Uvicorn reload for development.
