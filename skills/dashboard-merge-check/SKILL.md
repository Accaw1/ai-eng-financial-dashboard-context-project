---
name: dashboard-merge-check
description: Pre-merge QA gate for this Financial Metrics Dashboard repo (Vite + React frontend, FastAPI backend, Docker Compose). Use before committing or merging changes to frontend/, backend/, vite.config.ts or docker-compose.yml, when asked "is this branch ready to merge?" or "verify the branch", and after applying any skill that edits frontend/src. Produces an evidence table and a READY / NOT READY verdict.
---

# Dashboard merge check

## Objective

Prove, with commands and measured numbers, that a branch does not regress the
build, tests, Docker runtime wiring, accessibility, or layout stability of this
dashboard. The check **reports**; it does not fix. Fixes are separate commits.

## Inputs

| Input | Default | How to get it |
|---|---|---|
| Branch under test | current branch | `git branch --show-current` |
| Base | `main` | |
| Changed paths | — | `git diff --name-only main...HEAD` |
| Running stack | started by step 3 | `docker compose ps` |

## Which steps are required

| Changed paths include | Run steps |
|---|---|
| `frontend/src/**`, `frontend/index.html`, `frontend/package*.json` | 1, 2, 3, 4, 5 |
| `backend/**` | 1b, 3 |
| `docker-compose.yml`, `frontend/vite.config.ts`, any `Dockerfile` | 3 |
| Only `*.md`, `memory-bank/**`, `skills/**`, `.agents/**` | none (report "docs only") |

## Steps

### 1a. Frontend static checks (run from `frontend/`)

```bash
npm run build && npm run lint && npm test
```

- `npm run build` is the type check (`tsc -b`). **Do not use `npx tsc --noEmit`
  in `frontend/`**: `tsconfig.json` has `"files": []`, so it checks nothing and
  always passes.
- Baseline: the build prints **no warnings**. A "chunks are larger than 500 kB"
  warning is a regression. It means chart code is no longer lazy-loaded in
  `src/App.tsx` (see commit `f3a4517`).
- If `npm` fails with `EACCES` on `node_modules`, Compose created it as root:
  check `ls -ld frontend/node_modules` before reinstalling
  (`agents/rules/documentation-and-config.md`).

### 1b. Backend tests (the host has no FastAPI; run them in the container)

```bash
docker compose exec -T backend python -m pytest -q
```

Baseline: all pass, with 1 Starlette `TestClient` deprecation warning
(pre-existing, not a regression).

### 2. Fetch-path test rule

If the diff touches the fetch, loading or error code in `src/App.tsx`,
`src/App.test.tsx` must change in the same branch
(`agents/rules/testing-and-validation.md`). A missing test change is **NOT READY**.

### 3. Runtime wiring: three paths, checked separately

```bash
docker compose up -d
curl -s localhost:8000/health                                        # direct backend
docker compose exec -T frontend wget -qO- -T 5 http://backend:8000/health  # container to container
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' localhost:5173/api/metrics  # Vite proxy
```

- All three must succeed. `docker compose ps` showing `Up` proves nothing on its
  own (`agents/rules/docker-runtime.md`).
- If `up` fails with `container with given ID already exists` (common after a
  Codespace restart), run `docker compose down && docker compose up -d`. The
  app has no persistent data, so nothing is lost.

### 4. Accessibility regression check

Set up the tools **outside the repo**, then copy the scripts in. The scripts
resolve `playwright` from their own folder.

```bash
T=$(mktemp -d) && cp skills/dashboard-merge-check/scripts/* "$T" && cd "$T"
npm init -y >/dev/null && npm i playwright@1.49.1 @axe-core/playwright@4.10.1
npx playwright install --with-deps chromium
node a11y-audit.mjs            # exits 1 on any axe violation
python3 contrast.py <repo>/frontend/src/index.css
```

- Expected: `0` axe violations for both the loaded and error states.
- axe always reports `color-contrast` as **incomplete**, because the theme
  tokens are `oklch()` and axe cannot evaluate them. That is not a pass:
  `contrast.py` computes the real ratios from the `.dark` tokens (the app
  renders `<main className="dark">`). Add any new color pair you introduced
  to `PAIRS` in that script.
- The script also asserts the keyboard baseline: Tab reaches both charts, focus
  shows a `2px solid` outline, and the charts have names (not concatenated tick
  labels).

### 5. Layout stability

```bash
node cls.mjs                   # dev server; add a URL to test `vite preview`
```

- Baseline CLS with a 1 s API delay is **0.010 at 1280 px and 0.014 at 390 px**.
  The script fails above 0.02.
- Any new `Suspense` or loading fallback must render the same skeleton as the
  component it replaces (e.g. `ChartCardSkeleton`), or CLS rises.

## Output

Reply with exactly this structure:

```markdown
## Merge check: <branch> vs main — READY | NOT READY

| # | Check | Command | Result | Evidence |
|---|---|---|---|---|
| 1a | Frontend build/lint/test | `npm run build && …` | ✅/❌ | e.g. 9/9 tests, 0 warnings, eager JS 228 kB |
| … |

**Blocking:** <each ❌ with file:line or command output line>
**Skipped:** <step, and the reason from the scope table>
```

## Acceptance criteria

- Every required step shows the command run and an **observed** result. Never
  write "should pass".
- Failures are recorded as failures, with the exact command and output line
  (`agents/rules/documentation-and-config.md`).
- Numbers are compared against the baselines above, not judged by eye.
- The check leaves `git status` exactly as it found it, with no edits in the repo.
- The verdict is NOT READY if any required step is ❌ or was skipped without a
  scope-table reason.
