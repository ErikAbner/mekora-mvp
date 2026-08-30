// Estabilização v1 — P7: captura de screenshots para auditoria visual.
// Uso: node scripts/ui_audit.mjs <before|after> [docId] [comicId]
// Viewport fixo 1440×900 (desktop consistente). Usa o Chrome instalado.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const phase = process.argv[2] ?? 'before'
const DOC_ID = process.argv[3] ?? '32'
const COMIC_ID = process.argv[4] ?? '33'
const BASE = 'http://localhost:5173'
const OUT = `../storage/ui-audit/${phase}`
mkdirSync(OUT, { recursive: true })

const routes = [
  ['home', '/'],
  ['analysis-doc', `/analyze/${DOC_ID}`],
  ['analysis-comic', `/analyze/${COMIC_ID}`],
  ['review', `/review/${COMIC_ID}`],
  ['overlay', `/overlay/${COMIC_ID}`],
  ['finalize', `/finalize/${COMIC_ID}`],
  ['finish', `/finish/${COMIC_ID}`],
  ['consistency', `/consistency/${COMIC_ID}`],
  ['export', `/export/${COMIC_ID}`],
  ['history', '/history'],
  ['job-404', '/analyze/99999'],
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

for (const [name, path] of routes) {
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${name}.png` })
    console.log(`ok ${name}`)
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`)
  }
}

await browser.close()
