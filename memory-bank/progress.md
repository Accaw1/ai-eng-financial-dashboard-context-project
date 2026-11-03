# Progress

## 2026-11-03: Agent skills session (`feature/agent-skills`)

Goal from the tech lead: raise the accessibility and deployment quality bar by
applying shared agent skills, explore the skills ecosystem, and capture one
internal skill. Every code change below traces to a skill rule and was verified
against the running app (Docker Compose) and `npm run build`.

### Skills installed

| Skill | Source (`npx skills add`) | Location | Status |
|---|---|---|---|
| accessibility | `addyosmani/web-quality-skills` | `.agents/skills/accessibility` | Applied |
| vercel-react-best-practices | `vercel-labs/agent-skills` | `.agents/skills/vercel-react-best-practices` | Applied (partly; see rejected rules) |
| vitest | `antfu/skills` | `.agents/skills/vitest` | Applied (ecosystem pick) |
| dashboard-merge-check | internal | `skills/dashboard-merge-check` | Authored |

`skills-lock.json` pins the community sources. Claude Code loads all four through
symlinks in `.claude/skills/`. All three community skills were read before use;
they contain only markdown guidance, with no executable scripts.

### Verified changes

**Accessibility** (`fix(a11y)`, commit `6a74a18`). The baseline axe audit showed 0
violations, but manual checks found real gaps (axe cannot evaluate `oklch()` contrast).

| Change | File | Skill rule | Verified by |
|---|---|---|---|
| Descriptive `<title>` | `frontend/index.html` | 2.4.2 Page Titled | Playwright title check |
| Solid 2px `:focus-visible` ring | `frontend/src/index.css` | 2.4.7 / 1.4.11 | ring/50 measured 2.84:1, now 4.68:1 |
| Reduced-motion block | `frontend/src/index.css` | 2.3 Motion | CSS. Recharts already honors reduced motion (`isAnimationActive="auto"`) |
| Error banner `role="alert"` + `lang="es"` | `frontend/src/App.tsx` | 3.3.1, 3.1.2 | a11y tree, `App.test.tsx` |
| Loading `role="status"` + `aria-busy` | `frontend/src/App.tsx` | 4.1.3 | a11y tree, `App.test.tsx` |
| Chart titles as `<h2>` | both chart components | heading structure | outline H1 > H2 > H2 |
| Recharts `title`/`desc` on focusable charts | both chart components | 1.1.1 | the name was concatenated tick labels; now "Income vs. Outcome line chart" |

Rejected: a skip link (there is no repeated navigation); `aria-hidden` on icons
(lucide already sets it); token contrast changes (every measured pair passes AA).

**Vercel React best practices** (`perf(bundle)`, commit `f3a4517`). The rules
`bundle-dynamic-imports` and `async-suspense-boundaries` were applied with
`React.lazy` + `Suspense` for both charts, plus a shared `ChartCardSkeleton` fallback.

- Eager JS went from 584.8 kB to 228.4 kB (gzip 175.4 kB to 73.4 kB), and the
  pre-existing "chunks larger than 500 kB" build warning is gone.
- CLS with a 1 s API delay is unchanged at 0.010 (1280 px) and 0.014 (390 px),
  in both dev and `vite preview`.
- Rejected after review:
  - `next/image`, `next/font`, `next/dynamic`, metadata, and server/hydration
    rules: this is a Vite SPA with no Next.js, and it renders no `<img>`.
  - `bundle-barrel-imports`: only the 5 lucide icons in use are bundled.
  - `client-swr-dedup`: there is a single fetch, so a new dependency is not justified.
- Note: the tech lead described this skill as covering next/image, next/font and
  metadata. The installed skill actually covers performance (waterfalls, bundle
  size, re-renders) and has no dedicated rules for those.

**Vitest** (`test(app)`, commit `6e880ef`). `frontend/src/App.test.tsx` covers the
pending, success, HTTP error and network failure states of the dashboard fetch.
It uses the per-file `@vitest-environment jsdom` comment and
`vi.stubGlobal`/`vi.unstubAllGlobals`, and adds only one devDependency (`jsdom`).
A mutation check (renaming `role="alert"` or the loading text) makes 3 tests fail.

### Ecosystem skill chosen, and why

I ran `npx skills find` for testing, seo, performance and vitest.

- **Picked `antfu/skills@vitest`.** The repo already uses Vitest, and
  `agents/rules/testing-and-validation.md` requires a component test whenever the
  fetch, loading or error states change, which the accessibility commit did. It
  also closes the "frontend integration coverage" gap listed under Next Priorities
  in `current-status.md`.
- **Not picked:**
  - SEO skills: an internal finance dashboard has no search audience.
  - `web-quality-skills@performance`: the Vercel skill already covered bundle size and CLS.
  - `webapp-testing`: Playwright E2E is heavier than the gap needs.
- Caveat: the skill documents Vitest 5.1, while the repo has 4.1.4. Only APIs
  that exist in 4.1.4 were used.

### Internal skill authored

`skills/dashboard-merge-check/SKILL.md` is a pre-merge QA gate. It defines an
objective, inputs, a table of which steps each changed path requires, five
steps, a fixed report format, and acceptance criteria. It also ships three
scripts: `a11y-audit.mjs`, `cls.mjs` and `contrast.py`.

It captures traps that community skills cannot know about:
- `npx tsc --noEmit` in `frontend/` checks nothing.
- axe cannot evaluate this repo's `oklch()` colors.
- The baselines for build warnings, CLS and backend tests.
- The three-path Docker network check.
- Recovery from the `container with given ID already exists` error after a Codespace restart.

**Verified with a fresh agent session.** The agent ran the skill on this branch
with no prior context. Its verdict was READY, and I re-checked the claims
independently. It also reported 16 ambiguities: an undefined `<repo>` placeholder,
gaps in the scope table, missing pass values in step 3, an undefined "eager JS"
metric, and the error banner contrast pair not being checked. All 16 were fixed in
commit `95f43a0`, and the rewritten commands were re-run verbatim from a fresh
temp directory. The error banner computes at 16.49:1.

### Quality baseline after this session

| Check | Command | Baseline |
|---|---|---|
| Frontend build | `npm run build` (from `frontend/`) | passes, 0 warnings |
| Frontend tests | `npm test` | 9 tests (5 utils + 4 App fetch states) |
| Lint | `npm run lint` | clean |
| Backend tests | `docker compose exec -T backend python -m pytest -q` | 15 pass, 1 pre-existing Starlette warning |
| axe (loaded + error) | `skills/dashboard-merge-check/scripts/a11y-audit.mjs` | 0 violations |
| CLS | `skills/dashboard-merge-check/scripts/cls.mjs` | 0.010 @1280, 0.014 @390 |

### Agent tooling (user-level, not in the repo)

At the user's request, I installed workflow skills globally for Claude Code
(`npx skills add … -g -a claude-code`) and reviewed each one before use:

- `obra/superpowers@verification-before-completion`: used to independently
  re-verify the fresh agent's READY report before acting on it.
- `obra/superpowers@systematic-debugging`
- `anthropics/skills@webapp-testing`

I removed `github/awesome-copilot@conventional-commit` after review. It tells the
agent to run `git commit` automatically without confirmation, which conflicts with
committing only on request.
