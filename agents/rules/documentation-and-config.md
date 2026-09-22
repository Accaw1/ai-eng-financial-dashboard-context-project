# Documentation and Configuration

## Rule: Keep handover status unambiguous

- **Scope:** Verification and onboarding documentation.
- **Rationale:** [verification.md](../../verification.md) currently marks the proxy path with `[X]` while also documenting that it times out.
- **Action:** Record failed checks as failed, include the exact observed path, and update [README.md](../../README.md) and [README.es.md](../../README.es.md) when startup, ports, or proxy behavior changes.
- **Evidence:** [verification.md](../../verification.md), [README.md](../../README.md), [README.es.md](../../README.es.md).

## Rule: Treat host and Docker dependency environments separately

- **Scope:** Dependency installation and local validation.
- **Rationale:** Docker installs dependencies during image builds, while host validation previously failed because FastAPI was unavailable and frontend `node_modules` had permission issues caused by the Compose volume layout.
- **Action:** Prefer the documented Docker workflow when host dependencies are unavailable. Before host `npm install` after Compose use, verify ownership of `frontend/node_modules`.
- **Evidence:** [frontend/Dockerfile](../../frontend/Dockerfile), [backend/Dockerfile](../../backend/Dockerfile), [docker-compose.yml](../../docker-compose.yml).

## Rule: Treat development security and dependency settings as explicit limitations

- **Scope:** Backend CORS, dependency versions, and frontend image installation.
- **Rationale:** Backend requirements are unpinned, CORS allows all origins/methods/headers with credentials, and the frontend image uses `npm install` despite a lockfile.
- **Action:** Do not treat these settings as production-ready defaults. Review them explicitly when changing deployment behavior or dependency installation.
- **Evidence:** [backend/requirements.txt](../../backend/requirements.txt), [backend/app/main.py](../../backend/app/main.py), [frontend/package-lock.json](../../frontend/package-lock.json), [frontend/Dockerfile](../../frontend/Dockerfile).
