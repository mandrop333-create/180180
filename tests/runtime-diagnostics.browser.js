import fs from 'node:fs';
import { chromium } from 'playwright';

const baseURL = process.env.DIAGNOSTICS_BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
let page;
let report = null;
let failure = null;

try {
  page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseURL + (baseURL.includes('?') ? '&' : '?') + 'diagnostics=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.trainer && window.__180180Diagnostics, null, { timeout: 15000 });
  await page.waitForTimeout(150);

  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(80);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('x');
  await page.keyboard.press('Shift');
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  await page.locator('#restartButton').click();
  await page.waitForTimeout(100);

  // Deterministically exercise the game-over handler after the real input sequence.
  await page.evaluate(() => {
    const trainer = window.trainer;
    trainer.board[0].fill(1);
    trainer.spawn('O');
  });
  await page.waitForTimeout(100);

  report = await page.evaluate(() => window.__180180Diagnostics.report());
  const types = new Set(report.events.map(event => event.type));
  const required = [
    'session-start', 'initial-state', 'input-keydown', 'input-keyup',
    'state-change', 'board-change', 'game-rotate', 'game-hold',
    'game-hardDrop', 'game-gameOver', 'reset'
  ];
  const missing = required.filter(type => !types.has(type));
  if (missing.length) throw new Error('Missing diagnostic event types: ' + missing.join(', '));
  if (report.schema !== '180180-runtime-diagnostics/v1') throw new Error('Unexpected diagnostics schema');
  if (report.eventCount < required.length) throw new Error('Diagnostic report is unexpectedly small');
  const initialState = report.events.find(event => event.type === 'initial-state');
  if (!initialState?.data?.finesse || typeof initialState.data.finesse.progress !== 'number' || typeof initialState.data.finesse.mistakes !== 'number') {
    throw new Error('Initial report is missing Finesse progress/mistake state');
  }
  if (pageErrors.length) throw new Error('Browser page errors: ' + pageErrors.join(' | '));
  if (report.events.some(event => event.type === 'runtime-error' || event.type === 'unhandled-rejection')) {
    throw new Error('Runtime error was captured during the browser smoke test');
  }
  console.log(JSON.stringify({ ok: true, sessionId: report.sessionId, eventCount: report.eventCount, eventTypes: [...types] }));
} catch (error) {
  failure = error;
} finally {
  if (page) {
    try {
      report = report || await page.evaluate(() => window.__180180Diagnostics?.report() || null);
    } catch {}
  }
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/runtime-diagnostics.json', JSON.stringify({
    result: failure ? 'failed' : 'passed',
    failure: failure ? String(failure.stack || failure) : null,
    report
  }, null, 2));
  await browser.close();
}
if (failure) {
  console.error(failure.stack || failure);
  process.exit(1);
}
