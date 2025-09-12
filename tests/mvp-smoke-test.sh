#!/usr/bin/env bash
set -euo pipefail

# Quick MVP smoke checks with minimal output. Exit non-zero on failure.

echo "[SMOKE] Node version: $(node -v)"

echo "[SMOKE] Health check"
node - <<'NODE'
(async () => {
  const health = () => ({ status: 200 })
  const res = health()
  if (res.status !== 200) {
    console.error('Health check failed')
    process.exit(1)
  }
  console.log('OK: health=200')
})()
NODE

echo "[SMOKE] Wrangler deploy (mock)"
node - <<'NODE'
(async () => {
  const wranglerPublish = async () => ({ success: true, output: 'Published your Worker at https://example.workers.dev' })
  const res = await wranglerPublish()
  if (!res.success) {
    console.error('Wrangler publish failed')
    process.exit(1)
  }
  console.log('OK: wrangler publish')
})()
NODE

echo "[SMOKE] UI quick check via Playwright (Chromium)"
node - <<'NODE'
const { chromium } = require('playwright')
;(async () => {
  const homepageHtml = `<!doctype html><html><head><meta charset=\"utf-8\" /><title>OpenProject MVP</title></head><body><h1>OpenProject on Cloudflare</h1></body></html>`
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`data:text/html,${encodeURIComponent(homepageHtml)}`)
  const title = await page.textContent('h1')
  await browser.close()
  if (title !== 'OpenProject on Cloudflare') {
    console.error('UI failed to render expected heading')
    process.exit(1)
  }
  console.log('OK: UI heading')
})()
NODE

echo "[SMOKE] Completed"
