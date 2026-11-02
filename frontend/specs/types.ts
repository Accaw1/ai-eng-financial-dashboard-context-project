/**
 * Frontend data-contract types for Features 1–3 (date range filter,
 * anomaly alerts table, B2B vs B2C comparison).
 *
 * SPECIFICATION ONLY: these types describe request/response shapes and view
 * models. They contain no fetch calls and no React code.
 *
 * Source of truth: live OpenAPI schema served by the backend at
 * `GET http://localhost:8000/openapi.json` (rendered at `/docs`), cross-checked
 * against `backend/app/routes.py`. Field names are snake_case to match the API
 * (see `agents/rules/api-contracts.md`).
 */
import type {
  BusinessType,
  Category,
  FinancialMovement,
  OperationType,
} from '../src/lib/financial-types'

export type { BusinessType, Category, FinancialMovement, OperationType }

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Aggregation bucket accepted by `group_by` on `/api/metrics/summary` and
 * `/api/metrics/alerts`. OpenAPI: enum ["day", "week", "month"], default "month".
 * Not present in `src/lib/financial-types.ts`, so it is declared here.
 */
export type GroupBy = 'day' | 'week' | 'month'

/**
 * Optional inclusive date window shared by every filtered request.
 *
 * OpenAPI: both params are `string` with `format: date`, optional, nullable.
 * Omit a key entirely when the corresponding input is empty. Never send `""`.
 */
export interface DateRangeFilter {
  /**
   * Inclusive lower bound, formatted `YYYY-MM-DD` (e.g. `"2026-03-01"`).
   * Backend keeps movements with `create_date >= start_date`.
   * Any other format (e.g. `2026/03/01`) or an impossible date (e.g.
   * `2026-02-30`) is rejected with HTTP 422.
   */
  start_date?: string
  /**
   * Inclusive upper bound, formatted `YYYY-MM-DD` (e.g. `"2026-03-31"`).
   * Backend keeps movements with `create_date <= end_date`.
   * Any other format or an impossible date is rejected with HTTP 422.
   */
  end_date?: string
}

/**
 * FastAPI validation error body returned with HTTP 422.
 * OpenAPI: `HTTPValidationError` / `ValidationError`.
 */
export interface ApiValidationErrorItem {
  /** Path to the invalid input, e.g. `["query", "start_date"]`. */
  loc: Array<string | number>
  /** Human-readable message, e.g. "Input should be greater than or equal to 0". */
  msg: string
  /** Machine-readable error code, e.g. `"greater_than_equal"`, `"literal_error"`. */
  type: string
  /** The rejected raw value (untyped in OpenAPI). */
  input?: unknown
  /** Extra constraint context, e.g. `{ ge: 0 }`. */
  ctx?: Record<string, unknown>
}

export interface ApiValidationError {
  detail: ApiValidationErrorItem[]
}

/** Request lifecycle state used by every data-driven component in the specs. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

/* -------------------------------------------------------------------------- */
/* Feature 1: Date range filter                                               */
/* -------------------------------------------------------------------------- */

/**
 * Response of `GET /api/metrics/facets`. The endpoint takes NO query params
 * and always describes the full dataset, regardless of any active filter.
 * OpenAPI schema: `MetricsFacets` (all fields required).
 */
export interface MetricsFacets {
  /** Distinct operation types in the dataset, sorted. Currently `["income", "outcome"]`. */
  operation_types: OperationType[]
  /** Distinct business lines in the dataset, sorted. Currently `["B2B", "B2C"]`. */
  business_types: BusinessType[]
  /**
   * Distinct categories across ALL movements, sorted alphabetically. This is one
   * global list, not split per business type or per operation type.
   */
  categories: Category[]
  /**
   * Earliest `create_date` in the dataset, `YYYY-MM-DD`. The dataset is
   * generated relative to the server's current date, so this value moves over
   * time. Never hardcode it.
   */
  min_date: string
  /** Latest `create_date` in the dataset, `YYYY-MM-DD`. Moves over time like `min_date`. */
  max_date: string
}

/**
 * Query params for `GET /api/metrics` (the existing dashboard endpoint, extended
 * with filters). Feature 1 sends only the date keys. `category` and
 * `operation_type` exist in OpenAPI but the home dashboard must not send them,
 * because KPIs and charts need both income and outcome rows.
 */
export interface MetricsParams extends DateRangeFilter {
  category?: Category
  operation_type?: OperationType
}

/** Response of `GET /api/metrics`: movements sorted ascending by `create_date`. */
export type MetricsResponse = FinancialMovement[]

/** Client-side result of validating the two date inputs before any request. */
export type DateRangeValidationError =
  /** `start_date` is later than `end_date`. */
  | 'start_after_end'
  /** A value is earlier than `MetricsFacets.min_date`. */
  | 'before_min_date'
  /** A value is later than `MetricsFacets.max_date`. */
  | 'after_max_date'

export type DateRangeValidation =
  | { valid: true; filter: DateRangeFilter }
  | { valid: false; error: DateRangeValidationError }

/* -------------------------------------------------------------------------- */
/* Feature 2: Anomaly alerts table                                            */
/* -------------------------------------------------------------------------- */

/** UI bounds for the threshold input. Stricter than the backend (`ge=0`, no max). */
export const ALERT_THRESHOLD = {
  min: 0.01,
  max: 1.0,
  step: 0.01,
  default: 0.3,
} as const

/**
 * Query params for `GET /api/metrics/alerts`.
 * Includes the active Feature 1 date range so alerts respect it.
 */
export interface AlertsParams extends DateRangeFilter {
  /**
   * Spike ratio. A period is flagged when `increase_ratio > threshold`
   * (strictly greater). The backend accepts any number `>= 0` (HTTP 422 below 0),
   * but the UI must only send values within
   * `[ALERT_THRESHOLD.min, ALERT_THRESHOLD.max]`. Always sent explicitly, even
   * at the default of 0.3.
   */
  threshold: number
  /** Optional, default `"month"`. Feature 2 omits it, so periods are `YYYY-MM`. */
  group_by?: GroupBy
  /** Optional. Feature 2 omits it (alerts cover both business lines). */
  business_type?: BusinessType
}

/**
 * One flagged period. OpenAPI schema: `MetricsAlert` (all fields required).
 *
 * NOTE: `baseline_average` is the mean outcome of ALL earlier periods inside
 * the requested date range (an expanding mean), NOT a rolling average of the
 * previous 3 periods as the original feature request stated.
 */
export interface MetricsAlert {
  /** Period key. With `group_by=month` this is `YYYY-MM`, e.g. `"2025-12"`. */
  period: string
  /** Total outcome (spending) recorded in `period`, rounded to 2 decimals. */
  outcome_total: number
  /** Mean outcome of all prior periods in the filtered range, rounded to 2 decimals. */
  baseline_average: number
  /**
   * `(outcome_total - baseline_average) / baseline_average`, rounded to 4
   * decimals. A ratio, not a percentage: `0.5917` means +59.17%.
   */
  increase_ratio: number
}

/** Response of `GET /api/metrics/alerts`: chronological. May be `[]`. */
export type AlertsResponse = MetricsAlert[]

/* -------------------------------------------------------------------------- */
/* Feature 3: B2B vs B2C comparison                                           */
/* -------------------------------------------------------------------------- */

/**
 * Query params for `GET /api/metrics/categories/top`.
 * OpenAPI: `operation_type` default `"outcome"`, `limit` integer 1–20 default 5,
 * `business_type` optional enum. An out-of-range `limit` returns HTTP 422.
 */
export interface TopCategoriesParams extends DateRangeFilter {
  operation_type?: OperationType
  /** Integer, 1–20 inclusive. */
  limit?: number
  business_type?: BusinessType
}

/**
 * Exact params Feature 3 sends, once per business line. `operation_type` must
 * be explicit because the backend default is `"outcome"`. `business_type` must
 * be explicit or the two lines would be merged.
 */
export interface BusinessLineTopCategoriesParams extends TopCategoriesParams {
  operation_type: 'income'
  limit: typeof TOP_CATEGORIES_LIMIT
  business_type: BusinessType
}

export const TOP_CATEGORIES_LIMIT = 5

/** One ranked category. OpenAPI schema: `TopCategoryItem` (all fields required). */
export interface TopCategoryItem {
  category: Category
  /** Echoes the requested `operation_type`. */
  operation_type: OperationType
  /** Sum of `amount` for this category, rounded to 2 decimals. */
  total_amount: number
}

/**
 * Response of `GET /api/metrics/categories/top`: sorted by `total_amount`
 * descending, at most `limit` items. May be `[]`. Contains no percentage field,
 * so shares are computed client-side.
 */
export type TopCategoriesResponse = TopCategoryItem[]

/** Table row rendered in a business-line panel (derived client-side). */
export interface CategoryShareRow {
  category: Category
  total_amount: number
  /**
   * `total_amount / BusinessLineSummary.group_total * 100`, in the range 0–100.
   * Display with 1 decimal.
   */
  share_pct: number
}

/** Derived data for one business-line panel. */
export interface BusinessLineSummary {
  business_type: BusinessType
  /** Rows in API order (descending `total_amount`). Empty when the API returns `[]`. */
  rows: CategoryShareRow[]
  /** Sum of `total_amount` over the response rows. `0` when `rows` is empty. */
  group_total: number
}

/** One bar in the B2B vs B2C total-income chart. */
export interface BusinessLineIncomeDatum {
  business_type: BusinessType
  /** Equals `BusinessLineSummary.group_total` for that business line. */
  total_income: number
}
