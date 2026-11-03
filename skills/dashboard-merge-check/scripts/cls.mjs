// Layout-shift check for the dashboard (dashboard-merge-check, step 5).
// Usage: node cls.mjs [url]   Delays /api/metrics by 1 s; exit code 1 if CLS > LIMIT.
// The API is fetched from the backend directly, so this also works against `vite preview`.
import { chromium } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:5173/'
const BACKEND = 'http://localhost:8000/api/metrics'
const LIMIT = 0.02 // baseline: 0.010 @1280px, 0.014 @390px
let failed = false

const browser = await chromium.launch()
for (const width of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    window.__cls = 0
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.route('**/api/metrics', async (route) => {
    const res = await route.fetch({ url: BACKEND })
    await new Promise((r) => setTimeout(r, 1000))
    await route.fulfill({ response: res })
  })
  await page.goto(URL)
  await page.waitForSelector('.recharts-line', { timeout: 20000 })
  await page.waitForTimeout(1500)
  const cls = await page.evaluate(() => window.__cls)
  const ok = cls <= LIMIT
  failed ||= !ok
  console.log(`${ok ? 'PASS' : 'FAIL'}  CLS @${width}px = ${cls.toFixed(4)} (limit ${LIMIT})`)
  await ctx.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
