# Frontend Data Contract: Features 1–3

This folder specifies three home-dashboard and comparison features well enough
for a coding agent to build them without follow-up questions. **It is a
specification, not an implementation.** It contains no React components, no fetch
calls, and no backend changes.

| File | Contents |
|---|---|
| [`types.ts`](./types.ts) | TypeScript request/response types, view models, and UI constants |
| [`components.md`](./components.md) | Component names, props, conditional rendering, and exact UI copy |
| `README.md` (this file) | Endpoints, parameters, constraints, verified responses, and edge cases |
| [`tsconfig.json`](./tsconfig.json) | Lets `tsc` type-check this folder |

## How this contract was verified

“/docs” refers to the FastAPI OpenAPI docs served by the backend. The repository
has no `docs/` folder. Every endpoint, parameter, and field below was checked in
three ways:

1. **Live OpenAPI schema:** `GET http://localhost:8000/openapi.json` (rendered at
   `http://localhost:8000/docs`) with the backend container running.
2. **Live requests:** each edge case below was requested with `curl` against the
   running backend on **2026-11-02**, and the responses are quoted as observed.
3. **Source:** `backend/app/routes.py` (Pydantic models and route signatures).

Re-verify after any backend change:

```bash
docker compose up --build -d backend
curl -s localhost:8000/openapi.json | python3 -m json.tool | less
cd frontend/specs && npx tsc --noEmit    # type-checks types.ts
```

> `frontend/tsconfig.json` has `"files": []`, so running `npx tsc --noEmit` from
> `frontend/` checks nothing. Run it from `frontend/specs/` (or pass
> `-p frontend/specs`) to check these types.

### Verification ledger for the feature requests

| Claim in the feature request | Status | Finding |
|---|---|---|
| `GET /api/metrics/facets` returns the available date range | ✅ verified | Fields `min_date`, `max_date` (`YYYY-MM-DD`). The endpoint takes no params and always reflects the full dataset. |
| `/api/metrics` has a filters extension | ✅ verified | Optional `start_date`, `end_date`, `category`, `operation_type`. There is **no** `business_type` param on this endpoint. |
| Dates are sent as `YYYY-MM-DD` | ✅ verified | OpenAPI `format: date`. `2026/05/01` and `2026-02-30` both return HTTP 422. |
| `GET /api/metrics/alerts?threshold=<ratio>` | ✅ verified | Also accepts `start_date`, `end_date`, `group_by`, `business_type`. |
| Threshold is a ratio between 0.01 and 1.0 | ❓ UI-only rule | The backend enforces only `threshold >= 0` (`-1` returns 422) and has no maximum. The 0.01–1.0 bounds must be enforced in the UI. |
| Alert column “rolling average of the previous 3 periods” | ❌ wrong | `baseline_average` is the mean of **all** earlier periods inside the requested date range (an expanding mean). It therefore changes with `start_date`: `2026-08` has a baseline of 60291.89 unfiltered and 70355.77 with `start_date=2026-06-01`. The spec labels the column “Baseline average”. |
| Alert “percentage increase” | ✅ verified (with conversion) | The API returns `increase_ratio` as a ratio (`0.5917`). The UI multiplies by 100. A period is flagged only when `increase_ratio > threshold` (strictly greater). |
| `GET /api/metrics/categories/top?operation_type=income&limit=5` | ✅ verified, ❓ incomplete | Per-business-line results also need `business_type=B2B` or `business_type=B2C`. Without it, the two lines are merged. |
| Top categories include a percentage of the group total | ❌ wrong | The response has `category`, `operation_type`, `total_amount` only. The percentage is computed client-side. |
| “Available categories for each group must come from the facets endpoint” | ❌ wrong as stated | `facets.categories` is one global list of all 5 categories (income and outcome), not per business line, and facets accepts no params. The spec uses facets for the date range, the `business_types` list (which panels to render), and the category label set. The rows in each panel come from `/categories/top`. |
| The top-5 table will show 5 rows | ❌ not with current data | Income movements only use the categories `sales` and `others`, so each panel shows **at most 2 rows**. |

## Global conventions

- **Base URL:** relative `/api/...`, prefixed with `import.meta.env.VITE_API_BASE_URL ?? ""`
  as in `src/App.tsx`. Vite proxies `/api` to the backend (`agents/rules/api-contracts.md`).
- **Method:** all endpoints are `GET` with query-string params. There are no
  request bodies or auth headers.
- **Omitting params:** leave unset keys out of the query string. Never send
  `start_date=` (empty) or `null`.
- **Date format:** `YYYY-MM-DD`, zero-padded. Both bounds are **inclusive**. Compare
  dates as strings and never parse them with `new Date("YYYY-MM-DD")`.
- **Errors:** invalid params return **HTTP 422** with an `ApiValidationError` body
  (`{ detail: [{ loc, msg, type, input?, ctx? }] }`). The UI validates inputs before
  sending, so a 422 indicates a bug. Treat any non-2xx response, or a network
  failure, as that component’s `error` state.
- **Dataset facts (verified):** the data is deterministic mock data (seed 42) with
  360 movements spread over the 12 months before the server’s current month. Days
  fall only on the 1st–28th of each month. Because dates are relative to the
  server date, `min_date` and `max_date` move over time, so **never hardcode
  dates**. On 2026-11-02 the range was `2025-11-01` to `2026-10-28`.

---

## Feature 1: Date range filter (home dashboard)

### Endpoints

| Purpose | Request | Response type |
|---|---|---|
| Available range for the hint and input bounds | `GET /api/metrics/facets` (no params) | `MetricsFacets` |
| Dashboard data (KPIs, both charts) | `GET /api/metrics?start_date=&end_date=` | `MetricsResponse` (`FinancialMovement[]`) |

The active range also feeds Feature 2 (`/api/metrics/alerts`).

### Types (`types.ts`)

```ts
interface DateRangeFilter { start_date?: string; end_date?: string } // YYYY-MM-DD
interface MetricsParams extends DateRangeFilter { category?: Category; operation_type?: OperationType }
interface MetricsFacets {
  operation_types: OperationType[]; business_types: BusinessType[]; categories: Category[]
  min_date: string; max_date: string
}
type MetricsResponse = FinancialMovement[]
```

### Parameters: `GET /api/metrics`

| Param | Type | Required | Valid values | Sent by Feature 1 |
|---|---|---|---|---|
| `start_date` | string | no | `YYYY-MM-DD`; UI also requires `min_date <= v <= max_date` and `v <= end_date` | when the Start input is set |
| `end_date` | string | no | `YYYY-MM-DD`; UI also requires `min_date <= v <= max_date` and `v >= start_date` | when the End input is set |
| `category` | `Category` | no | `suppliers`, `sales`, `operational`, `administrative`, `others` | **never** |
| `operation_type` | `OperationType` | no | `income`, `outcome` | **never** (KPIs need both) |

`GET /api/metrics/facets` takes no parameters.

### Verified responses

```json
// GET /api/metrics/facets
{"operation_types":["income","outcome"],"business_types":["B2B","B2C"],
 "categories":["administrative","operational","others","sales","suppliers"],
 "min_date":"2025-11-01","max_date":"2026-10-28"}

// GET /api/metrics?start_date=2026-05-01&end_date=2026-05-03  (truncated)
[{"create_date":"2026-05-01","amount":1397.08,"operation_type":"outcome","category":"others","business_type":"B2C"}, …]
```

### Edge cases

| # | Scenario | API behavior (verified) | UI must show |
|---|---|---|---|
| 1.1 | Both inputs empty | `/api/metrics` with no date params returns all 360 movements | All data. Header period reads “{min_date} – {max_date}”. |
| 1.2 | **Only one input set** | Each bound applies independently: `start_date` alone means on or after that date, `end_date` alone means on or before it | Send only the set key, and do not fill in the other bound. Header reads “From {start_date}” or “Up to {end_date}”. |
| 1.3 | Start later than End | HTTP 200 with `[]` (the backend does not reject it) | Block it client-side. Show “Start date must be on or before the end date.”, send no request, and keep the previous data on screen. |
| 1.4 | Date outside `[min_date, max_date]` | Accepted, with fewer or zero rows | Inputs carry `min`/`max` attributes. A typed value outside the range shows “Dates must be on or after {min_date}.” or “…on or before {max_date}.” and sends no request. |
| 1.5 | Valid range containing no movements (e.g. `2026-01-29`–`2026-01-31`, because movements only fall on days 1–28) | HTTP 200 with `[]` | `FilteredEmptyNotice`: “No financial movements found for the selected dates. Try widening the range.” KPIs show $0 and 0.0%, and the charts are empty. |
| 1.6 | Facets request fails | Not applicable | The hint reads “Available date range could not be loaded.” Inputs still work without range validation, and the dashboard still loads. |
| 1.7 | Malformed date reaches the API | HTTP 422, `type: "date_from_datetime_parsing"` | Should not happen, because native date inputs emit only `YYYY-MM-DD` or `""`. If it does, show the existing error banner. |

---

## Feature 2: Anomaly alerts table (home dashboard)

### Endpoint

| Purpose | Request | Response type |
|---|---|---|
| Flagged spending spikes | `GET /api/metrics/alerts?threshold=<ratio>&start_date=&end_date=` | `AlertsResponse` (`MetricsAlert[]`) |

### Types (`types.ts`)

```ts
interface AlertsParams extends DateRangeFilter {
  threshold: number; group_by?: GroupBy; business_type?: BusinessType
}
interface MetricsAlert {
  period: string            // "YYYY-MM" (group_by=month)
  outcome_total: number     // spending in that month
  baseline_average: number  // mean outcome of ALL earlier months in range
  increase_ratio: number    // (outcome_total - baseline_average) / baseline_average
}
type AlertsResponse = MetricsAlert[]
const ALERT_THRESHOLD = { min: 0.01, max: 1.0, step: 0.01, default: 0.3 }
```

### Parameters

| Param | Type | Required | Backend constraint | UI constraint / what to send |
|---|---|---|---|---|
| `threshold` | number | no (default 0.3) | `>= 0`, else 422 | **Always send.** The value must be `0.01 <= v <= 1.0`, defaults to `0.3`, and uses input step `0.01`. |
| `start_date` | string | no | `YYYY-MM-DD` | the Feature 1 applied range, same rules |
| `end_date` | string | no | `YYYY-MM-DD` | the Feature 1 applied range, same rules |
| `group_by` | `"day" \| "week" \| "month"` | no (default `month`) | enum, else 422 | **Do not send.** Periods are then `YYYY-MM`. |
| `business_type` | `"B2B" \| "B2C"` | no | enum (case-sensitive), else 422 | **Do not send.** |

### How the backend computes alerts (verified in `detect_outcome_alerts`)

1. Filter movements by the date range, then sum outcome per month (chronologically).
2. For each month after the first: `baseline = mean(outcome of all earlier months in range)`.
3. Flag the month when `(outcome - baseline) / baseline > threshold`.

As a result, the **first month in the range is never flagged**, a range covering
one month always returns `[]`, and changing `start_date` changes every baseline.

### Column mapping

| Column (UI) | Field | Display |
|---|---|---|
| Period | `period` | “Dec 2025” |
| Recorded outcome | `outcome_total` | `formatCurrency`, e.g. “$103,379” |
| Baseline average | `baseline_average` | `formatCurrency`, e.g. “$41,404” |
| Increase | `increase_ratio` | `"+" + formatPercent(ratio * 100)`, e.g. “+149.7%” |

### Verified responses

```json
// GET /api/metrics/alerts?threshold=0.3
[{"period":"2025-12","outcome_total":103378.98,"baseline_average":41404.44,"increase_ratio":1.4968},
 {"period":"2026-03","outcome_total":88076.9,"baseline_average":55334.29,"increase_ratio":0.5917},
 {"period":"2026-06","outcome_total":80212.01,"baseline_average":57416.5,"increase_ratio":0.397},
 {"period":"2026-08","outcome_total":82189.37,"baseline_average":60291.89,"increase_ratio":0.3632}]

// GET /api/metrics/alerts?threshold=1.0
[{"period":"2025-12","outcome_total":103378.98,"baseline_average":41404.44,"increase_ratio":1.4968}]

// GET /api/metrics/alerts?threshold=0.3&start_date=2026-10-01
[]
```

### Edge cases

| # | Scenario | API behavior (verified) | UI must show |
|---|---|---|---|
| 2.1 | **No anomalies for the threshold or range** | HTTP 200 with `[]` | The table header stays visible, and one full-width row reads “No spending anomalies detected above {threshold×100}% for the selected period.” The section must not disappear. |
| 2.2 | Range covers a single month (e.g. `start_date=2026-10-01`) | `[]` (no earlier month to compare against) | The empty state from 2.1, plus “Anomaly detection compares each month with earlier months, so the selected range needs at least two months of data.” |
| 2.3 | Threshold empty, non-numeric, `< 0.01`, or `> 1.0` | `-1` gives 422 and `5` gives 200 `[]`; neither is reachable from the UI | Inline “Enter a value between 0.01 and 1.0.”. Send no request and keep the last table. |
| 2.4 | Feature 1 date range invalid (e.g. Start after End) | Not applicable (no request) | The alerts table keeps showing results for the last valid range. |
| 2.5 | Request fails | Non-2xx or network error | “Could not load anomaly alerts.” with a Retry button. The table is hidden. |

---

## Feature 3: B2B vs B2C comparison page

### Endpoints

| Purpose | Request | Response type |
|---|---|---|
| Date hint, panel list, category labels | `GET /api/metrics/facets` | `MetricsFacets` |
| B2B top income categories | `GET /api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B&start_date=&end_date=` | `TopCategoriesResponse` |
| B2C top income categories | same, with `business_type=B2C` | `TopCategoriesResponse` |

The chart uses no additional endpoint. Each line’s total income is the sum of its
`total_amount` values. That sum equals the line’s full income because income only
has 2 categories, and `limit=5` therefore returns all of them. If income
categories ever exceed 5, switch the chart total to
`GET /api/metrics/summary?operation_type=income&business_type=<line>` and sum `income`.

### Types (`types.ts`)

```ts
interface TopCategoriesParams extends DateRangeFilter {
  operation_type?: OperationType; limit?: number; business_type?: BusinessType
}
interface BusinessLineTopCategoriesParams extends TopCategoriesParams {
  operation_type: 'income'; limit: 5; business_type: BusinessType
}
interface TopCategoryItem { category: Category; operation_type: OperationType; total_amount: number }
type TopCategoriesResponse = TopCategoryItem[]
// derived client-side
interface CategoryShareRow { category: Category; total_amount: number; share_pct: number }
interface BusinessLineSummary { business_type: BusinessType; rows: CategoryShareRow[]; group_total: number }
interface BusinessLineIncomeDatum { business_type: BusinessType; total_income: number }
```

### Parameters: `GET /api/metrics/categories/top`

| Param | Type | Required | Backend constraint | What Feature 3 sends |
|---|---|---|---|---|
| `operation_type` | `"income" \| "outcome"` | no, **default `"outcome"`** | enum | `income`, always explicit (omitting it returns spending) |
| `limit` | integer | no (default 5) | `1 <= v <= 20`, else 422 | `5` |
| `business_type` | `"B2B" \| "B2C"` | no | enum, case-sensitive (`b2b` returns 422) | `B2B` in one request and `B2C` in the other |
| `start_date` | string | no | `YYYY-MM-DD` | the comparison page’s applied range (same rules as Feature 1) |
| `end_date` | string | no | `YYYY-MM-DD` | the comparison page’s applied range |

Note that `/categories/top` does **not** accept a `category` param.

### Derived values

- `group_total = Σ total_amount` over the line’s response, rounded only for display.
- `share_pct = group_total > 0 ? total_amount / group_total * 100 : 0`. The shares in
  a panel add up to 100% (±0.1% after rounding).

### Verified responses

```json
// …&business_type=B2B
[{"category":"sales","operation_type":"income","total_amount":557903.97},
 {"category":"others","operation_type":"income","total_amount":57636.75}]
// → group_total 615540.72; Sales 90.6%, Others 9.4%

// …&business_type=B2C
[{"category":"sales","operation_type":"income","total_amount":574193.41},
 {"category":"others","operation_type":"income","total_amount":68412.74}]
// → group_total 642606.15; Sales 89.4%, Others 10.6%

// …&business_type=B2B&start_date=2030-01-01
[]
```

### Edge cases

| # | Scenario | API behavior (verified) | UI must show |
|---|---|---|---|
| 3.1 | **Empty top-5 for a panel** (no income for that line in range, e.g. `2026-01-29`–`2026-01-31`) | HTTP 200 with `[]` | The panel shows “No {B2B\|B2C} income recorded for the selected period.” and “Total income: $0”, with no table. This applies to **each panel independently**. |
| 3.2 | Both panels empty | Both return `[]` | Both panels show 3.1. The chart is replaced by “No income to compare for the selected period.” |
| 3.3 | Fewer than 5 categories (always true today: 2) | Array of length 1–2 | Render only the returned rows. Never pad with placeholders. The subtitle reads “Top income categories” (not “Top 5”). |
| 3.4 | One line’s request fails | Non-2xx for that request | That panel shows “Could not load {B2B\|B2C} categories.” with Retry, and the other panel renders normally. The chart shows “Comparison chart unavailable because one business line failed to load.” |
| 3.5 | Invalid date range (Start after End, or out of range) | Not applicable (no request) | The same messages as Feature 1. Panels and chart keep the last valid results. |
| 3.6 | One line empty, the other has data | `[]` plus a non-empty array | The empty panel shows 3.1. The chart still renders, with a zero-height bar for the empty line and its axis label kept. |

---

## Open questions for the product manager

These are non-blocking: the spec makes the stated default choice for each.

1. **Rolling average.** The backend uses an expanding mean of all prior months, not
   a 3-month rolling average. Default: label the column “Baseline average” and
   describe its real meaning. A true 3-period rolling average would require a
   backend change, which is out of scope here.
2. **Per-group categories from facets.** Facets has no per-group data. Default: the
   rows in each panel come from `/categories/top`, and facets supplies the label set
   and the panel list.
3. **Shared vs. independent date range.** Default: the comparison page keeps its own
   range, and the home page’s range does not carry over.
