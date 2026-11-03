// Accessibility regression check for the dashboard (dashboard-merge-check, step 4).
// Usage: node a11y-audit.mjs [url]   Exit code 1 if any assertion fails.
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const URL = process.argv[2] ?? 'http://localhost:5173/'
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const failures = []
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!ok) failures.push(msg)
}

async function axe(page, state) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  check(r.violations.length === 0, `axe [${state}]: ${r.violations.length} violations`)
  for (const v of r.violations) console.log(`      ${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  const cc = r.incomplete.find((i) => i.id === 'color-contrast')
  if (cc) console.log(`INFO  axe [${state}]: color-contrast incomplete on ${cc.nodes.length} nodes (oklch); run contrast.py`)
}

const browser = await chromium.launch()

// Loaded state
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
await page.goto(URL)
await page.waitForSelector('.recharts-line', { timeout: 20000 })
await axe(page, 'loaded')
check((await page.title()) !== 'frontend', `page title is descriptive: "${await page.title()}"`)
const headings = await page.$$eval('h1,h2', (hs) => hs.map((h) => h.tagName))
check(headings[0] === 'H1' && headings.filter((h) => h === 'H2').length >= 2, `heading outline: ${headings.join(' > ')}`)

// Keyboard: Tab must reach both charts with a solid outline and a real name
for (let i = 1; i <= 2; i++) {
  await page.keyboard.press('Tab')
  const f = await page.evaluate(() => {
    const el = document.activeElement
    const cs = getComputedStyle(el)
    return { role: el.getAttribute('role'), title: el.querySelector(':scope > title')?.textContent ?? '', outline: `${cs.outlineStyle} ${cs.outlineWidth}` }
  })
  check(f.role === 'application' && f.title.length > 0, `Tab ${i} focuses a named chart: "${f.title}"`)
  check(f.outline === 'solid 2px', `Tab ${i} focus outline is "${f.outline}"`)
}
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(300)
const tip = await page.locator('.recharts-tooltip-wrapper').nth(1).innerText().catch(() => '')
check(tip.trim().length > 0, `ArrowRight shows chart tooltip: "${tip.replace(/\s+/g, ' ').trim()}"`)

// Error state
const err = await (await browser.newContext()).newPage()
await err.route('**/api/metrics', (r) => r.fulfill({ status: 500, body: '{}' }))
await err.goto(URL)
await err.waitForSelector('[role="alert"]', { timeout: 10000 }).catch(() => null)
const alertLang = await err.getAttribute('[role="alert"]', 'lang').catch(() => null)
check(alertLang === 'es', `error banner has role="alert" and lang="es" (lang=${alertLang})`)
await axe(err, 'error')

// Loading state
const load = await (await browser.newContext()).newPage()
await load.route('**/api/metrics', () => {})
await load.goto(URL)
await load.waitForTimeout(800)
const busy = await load.$$eval('section[aria-busy="true"]', (s) => s.length)
const status = await load.textContent('[role="status"]').catch(() => null)
check(busy === 2 && !!status, `loading: ${busy} aria-busy sections, status "${status}"`)

await browser.close()
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll accessibility checks passed')
process.exit(failures.length ? 1 : 0)
