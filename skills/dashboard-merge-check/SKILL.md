---
name: dashboard-merge-check
description: Pre-merge QA gate for this Financial Metrics Dashboard repo (Vite + React frontend, FastAPI backend, Docker Compose). Use before committing or merging changes to frontend/, backend/, vite.config.ts or docker-compose.yml, when asked "is this branch ready to merge?" or "verify the branch", and after applying any skill that edits frontend/src. Produces an evidence table and a READY / NOT READY verdict.
---

# Dashboard merge check

## Objective

Prove, with commands and measured numbers, that a branch does not regress the
build, tests, Docker runtime wiring, accessibility, or layout stability of this
dashboard. The check **reports**; it does not fix. Fixes are separate commits.

## Conventions

- `$R` is the repo root. Set it once with `R=$(git rev-parse --show-toplevel)`.
  Every path below is relative to `$R`.
- The canonical copy of this skill is `$R/skills/dashboard-merge-check/`.
  `.claude/skills/dashboard-merge-check` is only a symlink to it.
- Rules cited as `agents/rules/*.md` are at `$R/agents/rules/` (no leading
  dot), even though `AGENTS.md` mentions `.agents/rules`.

## Inputs

| Input | Default | How to get it |
|---|---|---|
| Branch under test | current branch | `git branch --show-current` |
| Base | `main` | |
| Changed paths | — | `git diff --name-only main...HEAD` |
| Running stack | started by step 3 | `docker compose ps` |

## Which steps are required

Match every changed path against this table and run the union of the steps.

| Changed paths include | Run steps |
|---|---|
| `frontend/src/**`, `frontend/index.html` | 1a, 2, 3, 4, 5 |
| `frontend/package*.json` | 1a, 3 (with `--build`), 4, 5 |
| `backend/**` | 1b, 3 |
| `docker-compose.yml`, `frontend/vite.config.ts`, any `Dockerfile` | 3 (with `--build`), 5 (also against `vite preview`) |
| Only `*.md`, `memory-bank/**`, `skills/**`, `.agents/**`, `.claude/**`, `skills-lock.json` | none: report "docs/tooling only" |

## Steps

### 1a. Frontend static checks

```bash
cd "$R/frontend" && npm run build && npm run lint && npm test
```

- `npm run build` is the type check (`tsc -b`). **Do not use `npx tsc --noEmit`
  in `frontend/`**: `tsconfig.json` has `"files": []`, so it checks nothing and
  always passes.
- Pass means exit 0, **no build warnings**, 0 lint output, and all tests passing
  (9 at the time of writing). A "chunks are larger than 500 kB" warning means
  chart code is no longer lazy-loaded in `src/App.tsx` (commit `f3a4517`).
- Eager JS is the entry script plus the chunks `dist/index.html` modulepreloads.
  The baseline is **228.4 kB**; flag growth above 10%. Measure it with:

  ```bash
  node -e "const fs=require('fs');const f=[...fs.readFileSync('dist/index.html','utf8').matchAll(/(?:src|href)=\"\/assets\/([^\"]+\.js)\"/g)].map(m=>m[1]);console.log((f.reduce((s,x)=>s+fs.statSync('dist/assets/'+x).size,0)/1000).toFixed(1)+' kB',f.join(' '))"
  ```

- If `npm` fails with `EACCES` on `node_modules`, Compose created the folder as
  root. Check `ls -ld frontend/node_modules` before reinstalling
  (`agents/rules/documentation-and-config.md`).

### 1b. Backend tests (the host has no FastAPI; run them in the container)

```bash
docker compose exec -T backend python -m pytest -q
```

Pass means every test passes, with exactly 1 Starlette `TestClient` deprecation
warning. That warning is pre-existing and not a regression.

### 2. Fetch-path test rule

```bash
git diff main...HEAD -- frontend/src/App.tsx frontend/src/App.test.tsx
```

If the `App.tsx` diff touches `fetchFinancialData`, `loading`, `error`, or the
status, alert or `aria-busy` markup, then `App.test.tsx` must change in the same
branch, **and** a test must assert the changed behavior
(`agents/rules/testing-and-validation.md`). A test file that changed for
unrelated reasons does not count.

### 3. Runtime wiring

```bash
cd "$R" && docker compose up -d        # add --build when the scope table says so
curl -sf -m 10 localhost:8000/health
curl -sf -m 10 localhost:8000/api/metrics | python3 -c "import json,sys;print(len(json.load(sys.stdin)))"
docker compose exec -T frontend wget -qO- -T 10 http://backend:8000/health
curl -sf -m 10 localhost:5173/api/metrics | python3 -c "import json,sys;print(len(json.load(sys.stdin)))"
```

- Pass means both health checks print `{"status":"ok"}` and both metrics
  commands print `360`, each within its 10 s timeout. A timeout is a failure:
  the documented historical bug is a proxy that hangs
  (`agents/rules/docker-runtime.md`).
- `docker compose ps` showing `Up` proves nothing on its own.
- If `up` fails with `container with given ID already exists` (common after a
  Codespace restart), run `docker compose down && docker compose up -d`. The
  app has no persistent data, so nothing is lost.

### 4. Accessibility regression check

Run the tools **outside the repo**. The scripts resolve `playwright` from their
own folder, so copy them into a temp folder first.

```bash
T=$(mktemp -d) && cp "$R"/skills/dashboard-merge-check/scripts/* "$T" && cd "$T"
npm init -y >/dev/null && npm i playwright@1.49.1 @axe-core/playwright@4.10.1
npx playwright install --with-deps chromium || npx playwright install chromium   # fallback if no sudo
node a11y-audit.mjs                                   # exits 1 on any failed assertion
python3 contrast.py "$R/frontend/src/index.css"       # exits 1 on any failing pair
```

- Expected: every `a11y-audit.mjs` line reads `PASS`, with 0 axe violations
  in the loaded and error states.
- axe reports `color-contrast` as **incomplete on 24 nodes**, because the theme
  tokens are `oklch()` and axe cannot evaluate them. A different count means
  the UI changed, so review it. `contrast.py` computes the real ratios from the
  `.dark` tokens; the app renders `<main className="dark">`.
- If `git diff main...HEAD -- frontend/src` adds a new `text-*`/`bg-*` color
  combination, add the pair to `PAIRS` **in the temp copy** (`$T/contrast.py`),
  report it, and propose it as a follow-up change to the canonical script.
  Opacity classes use the form `"token/NN@base"`, e.g. `"destructive/10@background"`.

### 5. Layout stability

```bash
cd "$T" && node cls.mjs                               # dev server on :5173
# When the scope table asks for vite preview:
(cd "$R/frontend" && npx vite build && npx vite preview --port 4173 --strictPort &) ; node cls.mjs http://localhost:4173/
```

- Baseline CLS with a 1 s API delay is **0.010 at 1280 px and 0.014 at 390 px**.
  The script fails above 0.02.
- Any new `Suspense` or loading fallback must render the same skeleton as the
  component it replaces (e.g. `ChartCardSkeleton`), or CLS rises.
- Afterwards, stop the preview server (`kill` its PID) and run `rm -rf "$T"`.

## Output

Reply with exactly this structure. Result is ✅ pass, ❌ fail, or ⏭ skipped.
Every step from the scope table gets a row, including skipped ones.

```markdown
## Merge check: <branch> vs main — READY | NOT READY

| # | Check | Command | Result | Evidence |
|---|---|---|---|---|
| 1a | Frontend build/lint/test | `npm run build && …` | ✅ | 9/9 tests, 0 warnings, eager JS 228.4 kB |
| 1b | Backend tests | — | ⏭ | no `backend/**` changes |
| … |

**Blocking:** <each ❌ with file:line or the failing output line>
```

## Acceptance criteria

- Every required step shows the command that ran and an **observed** result.
  Never write "should pass".
- Failures are recorded as failures, with the exact command and output line
  (`agents/rules/documentation-and-config.md`).
- Numbers are compared against the baselines above, not judged by eye.
- `git status --short` is the same before and after the check. Gitignored build
  output (`frontend/dist/`, caches) is allowed. The temp folder `$T` is deleted.
- The verdict is NOT READY if any required step is ❌, or is ⏭ without a
  scope-table reason.
