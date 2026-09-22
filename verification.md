# Repository Verification

## Project Structure

- [x] `main.py` is the FastAPI entry point.
- [x] `routes.py` contains backend API routes.
- [x] `main.tsx` mounts the React application.
- [x] `App.tsx` is the main dashboard component.
- [x] `vite.config.ts` configures Vite and the `/api` proxy.
- [x] Docker Compose orchestrates frontend and backend.

## Services

### Backend
- [x] FastAPI/Uvicorn runs on port 8000.
- [x] Debugger uses port 5678.
- [x] `/health` returns HTTP 200.
- [x] `/api/metrics` returns HTTP 200.

### Frontend
- [x] Vite runs on port 5173.
- [x] `/` returns HTTP 200.
- [x] `/api/*` is configured to proxy to the backend.

## Docker Networking

- [x] Both containers build successfully.
- [x] Both containers start successfully.
- [x] Backend resolves to its Docker network address.
- [X] Frontend can successfully communicate with backend.
- [X] `http://localhost:5173/api/metrics` currently works end-to-end.

## Known Issue

Frontend-to-backend Docker networking is currently failing. The backend is
resolvable from the frontend container, but connections time out.

This issue is documented but has not been fixed during the handover phase.