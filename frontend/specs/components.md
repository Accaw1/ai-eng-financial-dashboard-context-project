# Component Specification: Features 1–3

> **Status:** specification only. Do not treat this file as an implementation.
> Types referenced below live in [`types.ts`](./types.ts). The API contract
> (endpoints, params, verified responses) is in [`README.md`](./README.md).

## Conventions (apply to every component)

- **Stack:** React 19 function components, Tailwind classes, `Card` / `Skeleton` from
  `src/components/ui/`, Recharts for charts, and lucide-react for icons. Match the
  style of `src/components/dashboard/*.tsx`.
- **File placement:** dashboard components go in `src/components/dashboard/` and
  comparison components in `src/components/comparison/`, with kebab-case file names
  (e.g. `date-range-filter-bar.tsx`). Exported component names are listed below.
- **Formatting:** money uses `formatCurrency` and percentages use `formatPercent`
  (1 decimal), both from `src/lib/financial-utils.ts`.
- **Dates:** treat `YYYY-MM-DD` and `YYYY-MM` values as strings. Compare them with
  plain string comparison, which is valid for zero-padded ISO dates. Do **not**
  parse them with `new Date("YYYY-MM-DD")`, because that parses as UTC and can shift
  the day (see `agents/rules/frontend-data.md`). For display labels, split the
  string and build `new Date(year, monthIndex, day)` locally.
  - Day labels use the format `Mar 1, 2026` (`en-US`, `{ month: 'short', day: 'numeric', year: 'numeric' }`).
  - Month labels use the format `Dec 2025` (`en-US`, `{ month: 'short', year: 'numeric' }`).
- **Async state:** every data-driven component receives an `AsyncState<T>`
  (`idle | loading | success | error`). `idle` renders the same as `loading`.
- **Stale responses:** when a filter changes while a request is in flight, the
  earlier response must be discarded (abort it or compare a request id).
- **Copy:** strings in “quotes” below are exact UI text. `{placeholders}` are
  interpolated values.

---

## Feature 1: Date range filter (home dashboard)

### Component tree

```
App (home view)
├── DashboardHeader            (existing; `period` prop now derived, never hardcoded)
├── DateRangeFilterBar         (new)
│   └── AvailableRangeHint     (new)
├── FilteredEmptyNotice        (new, conditional)
├── KPIRow                     (existing, unchanged props)
├── IncomeOutcomeChart / ProfitPercentChart (existing, unchanged props)
└── AnomalyAlertsSection       (Feature 2)
```

### State owned by the home view (`App` when `view === 'home'`)

| State | Type | Initial |
|---|---|---|
| `dateInputs` | `DateRangeFilter` (raw values from the inputs) | `{}` |
| `appliedRange` | `DateRangeFilter` (last value that passed validation) | `{}` |
| `facets` | `AsyncState<MetricsFacets>` | `{ status: 'loading' }` |
| `movements` | `AsyncState<MetricsResponse>` | `{ status: 'loading' }` |

On mount, request facets and `/api/metrics` (with no date params) in parallel.
After a change to `dateInputs`, run validation (rules below). If it passes, set
`appliedRange` and re-request `/api/metrics` with `appliedRange`. If it fails,
keep the previous `appliedRange` and send no requests.

### `DateRangeFilterBar`

| Prop | Type | Notes |
|---|---|---|
| `value` | `DateRangeFilter` | Current raw input values. |
| `onChange` | `(next: DateRangeFilter) => void` | Called on each input `change` event. An emptied input removes its key (no `""` values). |
| `facets` | `AsyncState<MetricsFacets>` | Supplies `min` / `max` attributes and the hint. |
| `error` | `DateRangeValidationError \| null` | Result of validation. `null` when valid. |
| `disabled` | `boolean` (optional, default `false`) | Disables both inputs and the Clear button while the first data load is in flight. |

Rendering:

- Two `<input type="date">` controls labelled “Start date” and “End date”, each
  with a visible `<label>`. A native date input reports `""` until a full date is
  entered, and the component treats `""` as “not set”.
- When `facets.status === 'success'`, set `min={facets.data.min_date}` and
  `max={facets.data.max_date}` on both inputs. Also set `max={value.end_date}` on
  Start and `min={value.start_date}` on End, whenever those values exist.
- A “Clear” button, rendered only when at least one key is set. It calls
  `onChange({})`.
- `<AvailableRangeHint facets={facets} />` directly below the inputs.
- When `error !== null`, render an inline message below the inputs with
  `role="alert"`, and set `aria-invalid="true"` on the offending input(s):

| `error` | Message | Input(s) marked invalid |
|---|---|---|
| `'start_after_end'` | “Start date must be on or before the end date.” | both |
| `'before_min_date'` | “Dates must be on or after {min_date as day label}.” | the input(s) below `min_date` |
| `'after_max_date'` | “Dates must be on or before {max_date as day label}.” | the input(s) above `max_date` |

### Validation rules (run in this order; first failure wins)

1. Ignore unset keys.
2. If both keys are set and `start_date > end_date`, return `'start_after_end'`.
3. Only when `facets.status === 'success'`: if any set value is `< min_date`, return
   `'before_min_date'`. If any set value is `> max_date`, return `'after_max_date'`.
   Skip this step when facets are not loaded.
4. Otherwise the range is valid, and the request params are exactly the set keys.

### Single-date-input behavior (explicit)

| Inputs set | Params sent to every filtered request | `DashboardHeader.period` |
|---|---|---|
| neither | none (no date keys) | “{min_date} – {max_date}” as day labels, or “All available data” if facets are not loaded |
| start only | `start_date` only | “From {start_date}” |
| end only | `end_date` only | “Up to {end_date}” |
| both | `start_date` and `end_date` | “{start_date} – {end_date}” |

The backend applies each bound independently (verified), so a single bound gives an
open-ended range. The UI must not fill in the missing bound with `min_date` or
`max_date`.

### `AvailableRangeHint`

| Prop | Type |
|---|---|
| `facets` | `AsyncState<MetricsFacets>` |

| `facets.status` | Renders |
|---|---|
| `idle` / `loading` | `Skeleton` sized to one text line |
| `success` | “Available data: {min_date} – {max_date}” (day labels) |
| `error` | “Available date range could not be loaded.” (muted text). Inputs stay usable, and range validation (step 3) is skipped. |

### `FilteredEmptyNotice`

| Prop | Type |
|---|---|
| `range` | `DateRangeFilter` (the applied range) |

Render this only when `movements.status === 'success'`, `movements.data.length === 0`,
**and** the applied range has at least one key. Text: “No financial movements
found for the selected dates. Try widening the range.” Place it between the
filter bar and the KPI row. KPIs and charts still render with the empty array,
which gives $0 totals, 0.0% margin, and empty charts.

### Existing components: required changes

- `DashboardHeader`: pass `period` using the table above. Remove reliance on the
  hardcoded `'2024 — Full Year'` default (rule: `agents/rules/frontend-data.md`).
- `KPIRow`, `IncomeOutcomeChart`, `ProfitPercentChart`: no prop changes. They
  receive data computed from the filtered `movements`.
- Error banner (existing): shown when `movements.status === 'error'`. Leave its
  text unchanged.

---

## Feature 2: Anomaly alerts table (home dashboard, below the charts)

### Component tree

```
AnomalyAlertsSection
├── AlertThresholdInput
└── AnomalyAlertsTable
    └── AnomalyAlertsEmptyState   (conditional)
```

### `AnomalyAlertsSection` (container; owns threshold + alerts state)

| Prop | Type | Notes |
|---|---|---|
| `range` | `DateRangeFilter` | The home view’s `appliedRange` (only validated ranges reach here). |
| `facets` | `AsyncState<MetricsFacets>` | Used only for the single-period hint. |

| State | Type | Initial |
|---|---|---|
| `thresholdInput` | `string` (raw input text) | `"0.3"` |
| `threshold` | `number` (last valid value) | `ALERT_THRESHOLD.default` (0.3) |
| `alerts` | `AsyncState<AlertsResponse>` | `{ status: 'loading' }` |

Behavior:

- Request `GET /api/metrics/alerts` with `AlertsParams = { threshold, ...range }` on
  mount, whenever `range` changes, and 300 ms after the last valid threshold
  edit (debounced). Do not send `group_by` or `business_type`.
- If the threshold input is invalid, send no request and keep the last table.
- Render as a `Card` with title “Spending anomalies” and the subtitle “Months where
  spending rose more than {threshold × 100, 0 decimals}% above the average of all
  earlier months in the selected range.”

### `AlertThresholdInput`

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | Raw text so the user can clear the field and retype. |
| `onChange` | `(raw: string) => void` | |
| `error` | `string \| null` | |

- `<input type="number" min="0.01" max="1" step="0.01" inputMode="decimal">`,
  label “Spike threshold (ratio)”, with helper text “0.01–1.0 · e.g. 0.3 = 30% above
  baseline”.
- The value is **valid** when `raw.trim() !== ""`, `Number(raw)` is finite, and
  `0.01 <= Number(raw) <= 1`.
- When invalid, show `error` = “Enter a value between 0.01 and 1.0.” with
  `role="alert"` and `aria-invalid="true"`.

### `AnomalyAlertsTable`

| Prop | Type |
|---|---|
| `state` | `AsyncState<AlertsResponse>` |
| `threshold` | `number` |
| `singlePeriodRange` | `boolean` (computed by the section, see the empty state) |

Columns, in order, using data from `MetricsAlert`:

| Header | Cell | Alignment |
|---|---|---|
| “Period” | `period` (`YYYY-MM`) as a month label, e.g. “Dec 2025” | left |
| “Recorded outcome” | `formatCurrency(outcome_total)` | right |
| “Baseline average” | `formatCurrency(baseline_average)` | right |
| “Increase” | `"+" + formatPercent(increase_ratio * 100)`, e.g. “+59.2%” | right |

- The “Baseline average” header has a tooltip or `title`: “Average monthly
  outcome of all earlier months in the selected range.” Do **not** label it a
  3-period rolling average (see README, ❌ item).
- Rows appear in API order (chronological). There is no client-side sorting or
  pagination. The full dataset yields at most 11 rows.

Conditional rendering:

| `state` | Renders |
|---|---|
| `idle` / `loading` | Table header plus 3 `Skeleton` rows |
| `error` | Message “Could not load anomaly alerts.” and a “Retry” button that re-sends the last params. The table is hidden. |
| `success`, `data.length > 0` | Table with one row per alert |
| `success`, `data.length === 0` | Table header stays visible, and the body is a single full-width row (`colSpan={4}`) containing `AnomalyAlertsEmptyState`. The section **must not** collapse or disappear. |

### `AnomalyAlertsEmptyState` (explicit empty state)

| Prop | Type |
|---|---|
| `threshold` | `number` |
| `singlePeriodRange` | `boolean` |

- Primary text, always shown: “No spending anomalies detected above {threshold
  × 100, 0 decimals}% for the selected period.” Example: “No spending anomalies
  detected above 30% for the selected period.”
- Secondary text, only when `singlePeriodRange` is `true`: “Anomaly detection
  compares each month with earlier months, so the selected range needs at least
  two months of data.”
- `singlePeriodRange` = the effective start month equals the effective end month.
  The effective start is `range.start_date ?? facets.min_date`, the effective end is
  `range.end_date ?? facets.max_date`, and both are compared as `YYYY-MM` prefixes.
  It is `false` when facets are not loaded.
- Use `role="status"` so screen readers announce the change.

---

## Feature 3: B2B vs B2C comparison page

### Navigation (no new dependencies)

The app has no router. Use hash-based view switching inside `App`:

| `window.location.hash` | View |
|---|---|
| `""`, `"#/"`, or anything unrecognized | Home dashboard (Features 1 and 2) |
| `"#/comparison"` | `ComparisonPage` |

Listen to `hashchange`. Render a new `DashboardNav` in `App`, directly above
`DashboardHeader`, so it is shared by both views. `DashboardHeader` gets no new props.

| Prop | Type |
|---|---|
| `current` | `'home' \| 'comparison'` |

It renders two links, “Overview” (`href="#/"`) and “B2B vs B2C”
(`href="#/comparison"`). The active link gets `aria-current="page"`.

### Component tree

```
ComparisonPage
├── DashboardHeader            (period derived exactly as in Feature 1)
├── DateRangeFilterBar         (reused from Feature 1, separate state)
├── section.grid (md:grid-cols-2, stacked below md)
│   ├── BusinessLinePanel  businessType="B2B"
│   │   ├── TopCategoriesTable | BusinessLineEmptyState
│   └── BusinessLinePanel  businessType="B2C"
│       ├── TopCategoriesTable | BusinessLineEmptyState
└── BusinessLineIncomeChart    (full width, below both panels)
```

### `ComparisonPage` (container)

| State | Type | Initial |
|---|---|---|
| `dateInputs` / `appliedRange` | `DateRangeFilter` | `{}`. Independent of the home view; it does not carry over between views. |
| `facets` | `AsyncState<MetricsFacets>` | `{ status: 'loading' }` |
| `lines` | `Record<BusinessType, AsyncState<BusinessLineSummary>>` | both `{ status: 'loading' }` |

Behavior:

- Date inputs follow the same validation rules, single-date rules, and messages as Feature 1.
- The panels to render, and their order, come from `facets.data.business_types`
  (currently `["B2B", "B2C"]`). While facets load or if they fail, fall back to
  `['B2B', 'B2C']` so the page still works.
- For each business line, request `GET /api/metrics/categories/top` with
  `BusinessLineTopCategoriesParams = { operation_type: 'income', limit: 5,
  business_type, ...appliedRange }`. That is two requests, sent in parallel.
- Derive `BusinessLineSummary` from each response:
  `group_total = sum(total_amount)`, and
  `share_pct = group_total > 0 ? total_amount / group_total * 100 : 0`.
- Category display labels: capitalize the `Category` value (`sales` → “Sales”,
  `others` → “Others”, and so on for all five values in `facets.categories`).

### `BusinessLinePanel`

| Prop | Type |
|---|---|
| `businessType` | `BusinessType` |
| `state` | `AsyncState<BusinessLineSummary>` |

- `Card` titled “{businessType}”. The subtitle “Top income categories” is shown
  regardless of how many rows came back. Do not say “Top 5”, because the API
  currently returns at most 2 income categories.
- When `state.status === 'success'`, show the group total in the header:
  “Total income: {formatCurrency(group_total)}”.

| `state` | Renders |
|---|---|
| `idle` / `loading` | 2 `Skeleton` rows |
| `error` | “Could not load {businessType} categories.” and a “Retry” button (re-requests this line only) |
| `success`, `rows.length > 0` | `<TopCategoriesTable rows={rows} businessType={businessType} />` |
| `success`, `rows.length === 0` | `<BusinessLineEmptyState businessType={businessType} />`. The table is not rendered, and the header shows “Total income: $0”. |

### `TopCategoriesTable`

| Prop | Type |
|---|---|
| `rows` | `CategoryShareRow[]` (1–5 items) |
| `businessType` | `BusinessType` |

| Header | Cell | Alignment |
|---|---|---|
| “Category” | category label | left |
| “Total income” | `formatCurrency(total_amount)` | right |
| “Share of {businessType} total” | `formatPercent(share_pct)` | right |

- Render exactly the rows received, in API order (descending `total_amount`).
  **Never pad to 5** with placeholder rows.

### `BusinessLineEmptyState` (empty top-5, required for **both** panels)

| Prop | Type |
|---|---|
| `businessType` | `BusinessType` |

Text: “No {businessType} income recorded for the selected period.” Use
`role="status"`. Each panel decides this independently, so B2B can be empty
while B2C shows data, and the reverse.

### `BusinessLineIncomeChart`

| Prop | Type |
|---|---|
| `state` | `AsyncState<BusinessLineIncomeDatum[]>` |

The container derives `state` from `lines`. It is `loading` if either line is
loading, `error` if either line failed, and otherwise `success` with
`[{ business_type, total_income: group_total }, …]` in panel order.

- Recharts `BarChart` with one bar per business line. The X axis shows
  `business_type` and the Y axis shows currency (tick formatter `formatCurrency`).
  The tooltip shows `formatCurrency(total_income)`. `Card` title: “Total income:
  B2B vs B2C”.

| `state` | Renders |
|---|---|
| `idle` / `loading` | `Skeleton` with the chart’s height |
| `error` | “Comparison chart unavailable because one business line failed to load.” |
| `success`, every `total_income === 0` | “No income to compare for the selected period.” (no chart) |
| `success`, at least one `total_income > 0` | The chart. A line with `0` is drawn as a zero-height bar and keeps its axis label. |
