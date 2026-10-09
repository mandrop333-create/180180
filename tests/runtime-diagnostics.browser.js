import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';

const baseURL = process.env.DIAGNOSTICS_BASE_URL || 'http://127.0.0.1:4173/';
const outDir = path.resolve('artifacts');
const screenshotDir = path.join(outDir, 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
let context;
let page;
let report = null;
let failure = null;
let traceStarted = false;
const telemetry = {
  capturedAt: new Date().toISOString(),
  targetURL: baseURL,
  environment: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    runner: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local',
    viewport: { width: 1440, height: 1000 },
    browser: null
  },
  pageErrors: [],
  console: [],
  failedRequests: [],
  httpErrors: [],
  pageEvents: [],
  snapshots: [],
  screenshots: [],
  runtime: null
};

async function capturePageState(targetPage, name) {
  const safeName = name.replace(/[^a-z0-9_-]/gi, '-');
  const fullPath = path.join(screenshotDir, safeName + '-full.png');
  await targetPage.screenshot({ path: fullPath, fullPage: true, animations: 'disabled' });
  telemetry.screenshots.push({ name: safeName + '-full', path: path.relative(outDir, fullPath) });

  const board = targetPage.locator('#board').first();
  if (await board.count()) {
    const boardPath = path.join(screenshotDir, safeName + '-board.png');
    await board.screenshot({ path: boardPath, animations: 'disabled' });
    telemetry.screenshots.push({ name: safeName + '-board', path: path.relative(outDir, boardPath) });
  }

  const snapshot = await targetPage.evaluate(() => {
    const board = document.querySelector('#board');
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      const s = getComputedStyle(element);
      return {
        tag: element.tagName,
        id: element.id || null,
        className: typeof element.className === 'string' ? element.className : null,
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
        display: s.display,
        visibility: s.visibility,
        color: s.color,
        backgroundColor: s.backgroundColor,
        font: s.font
      };
    };
    return {
      at: new Date().toISOString(),
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      bodyText: (document.body?.innerText || '').slice(0, 12000),
      board: rect(board),
      keyElements: ['#board', '#hudScore', '#hudLines', '#hudCombo', '#hudB2B', '#hudPieces', '#hudFinesse', '#finessePrompt', '#holdPreview', '#nextPreview', '#toast', '#restartButton']
        .map(selector => ({ selector, ...rect(document.querySelector(selector)) })),
      trainer: window.trainer ? {
        mode: window.trainer.mode?.id || null,
        width: window.trainer.W,
        height: window.trainer.H,
        gameOver: window.trainer.gameOver,
        lines: window.trainer.lines,
        piece: window.trainer.piece ? { ...window.trainer.piece } : null,
        queue: [...(window.trainer.queue || [])],
        holdType: window.trainer.holdType,
        stats: { ...window.trainer.stats },
        board: window.trainer.board?.map(row => [...row]) || null,
        finesseProgress: window.trainer.finesseProgress,
        finesseMistakes: window.trainer.finesseMistakes,
        finesseFaulted: window.trainer.finesseFaulted
      } : null,
      diagnosticsAvailable: !!window.__180180Diagnostics
    };
  });
  const snapshotPath = path.join(outDir, safeName + '-page-state.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  telemetry.snapshots.push(path.relative(outDir, snapshotPath));
  return snapshot;
}

try {
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: path.join(outDir, 'video'), size: { width: 1440, height: 1000 } },
    reducedMotion: 'reduce'
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  traceStarted = true;
  page = await context.newPage();

  page.on('pageerror', error => telemetry.pageErrors.push({ message: error.message, stack: error.stack || null, at: new Date().toISOString() }));
  page.on('console', message => {
    telemetry.console.push({
      type: message.type(),
      text: message.text().slice(0, 4000),
      location: message.location(),
      at: new Date().toISOString()
    });
  });
  page.on('requestfailed', request => telemetry.failedRequests.push({
    url: request.url(), method: request.method(), resourceType: request.resourceType(),
    error: request.failure()?.errorText || null, at: new Date().toISOString()
  }));
  page.on('response', response => {
    if (response.status() >= 400) telemetry.httpErrors.push({
      url: response.url(), status: response.status(), statusText: response.statusText(),
      requestMethod: response.request().method(), at: new Date().toISOString()
    });
  });
  page.on('page', newPage => telemetry.pageEvents.push({ type: 'popup', url: newPage.url(), at: new Date().toISOString() }));
  page.on('dialog', async dialog => {
    telemetry.pageEvents.push({ type: 'dialog', dialogType: dialog.type(), message: dialog.message(), at: new Date().toISOString() });
    await dialog.dismiss().catch(() => {});
  });

  const target = baseURL + (baseURL.includes('?') ? '&' : '?') + 'diagnostics=1';
  const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
  telemetry.environment.browser = await browser.version();
  telemetry.initialHTTP = response ? { status: response.status(), statusText: response.statusText(), url: response.url() } : null;
  await page.waitForFunction(() => window.trainer && window.__180180Diagnostics, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  await capturePageState(page, 'desktop-initial');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await capturePageState(page, 'mobile-initial');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(100);

  // Exercise keyboard handling and capture the intermediate gameplay state.
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(80);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('x');
  await page.waitForTimeout(80);
  await page.keyboard.press('Shift');
  await page.waitForTimeout(80);
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  await capturePageState(page, 'desktop-after-inputs');

  await page.evaluate(() => window.trainer.reset());
  await page.waitForTimeout(150);
  await capturePageState(page, 'desktop-after-reset');

  // Deterministically exercise the game-over handler after the real input sequence.
  await page.evaluate(() => {
    const trainer = window.trainer;
    trainer.board[0].fill(1);
    trainer.spawn('O');
  });
  await page.waitForTimeout(150);
  await capturePageState(page, 'desktop-game-over');

  report = await page.evaluate(() => window.__180180Diagnostics.report());
  telemetry.runtime = {
    schema: report.schema,
    sessionId: report.sessionId,
    eventCount: report.eventCount,
    eventTypes: [...new Set(report.events.map(event => event.type))],
    report
  };

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
  const finesseStateEvent = report.events.find(event =>
    event.type === 'state-change'
    && typeof event.data.finesseProgress === 'number'
    && typeof event.data.finesseMistakes === 'number'
  );
  if (!finesseStateEvent) throw new Error('State changes are missing live Finesse counters');
  if (telemetry.pageErrors.length) throw new Error('Browser page errors: ' + telemetry.pageErrors.map(item => item.message).join(' | '));
  if (report.events.some(event => event.type === 'runtime-error' || event.type === 'unhandled-rejection')) {
    throw new Error('Runtime error was captured during the browser smoke test');
  }
  // HTTP errors are preserved in the artifact for diagnosis; unrelated missing assets should not mask gameplay results.
  console.log(JSON.stringify({ ok: true, sessionId: report.sessionId, eventCount: report.eventCount, eventTypes: [...types] }));
} catch (error) {
  failure = error;
} finally {
  if (page) {
    try {
      report = report || await page.evaluate(() => window.__180180Diagnostics?.report() || null);
      if (report && !telemetry.runtime) telemetry.runtime = { schema: report.schema, sessionId: report.sessionId, eventCount: report.eventCount, eventTypes: [...new Set(report.events.map(event => event.type))], report };
    } catch {}
  }

  telemetry.result = failure ? 'failed' : 'passed';
  telemetry.failure = failure ? String(failure.stack || failure) : null;
  telemetry.finishedAt = new Date().toISOString();
  try {
    fs.writeFileSync(path.join(outDir, 'runtime-diagnostics.json'), JSON.stringify(telemetry, null, 2));
    fs.writeFileSync(path.join(outDir, 'runtime-diagnostics-summary.json'), JSON.stringify({
      result: telemetry.result,
      failure: telemetry.failure,
      capturedAt: telemetry.capturedAt,
      finishedAt: telemetry.finishedAt,
      targetURL: telemetry.targetURL,
      environment: telemetry.environment,
      initialHTTP: telemetry.initialHTTP || null,
      counts: {
        pageErrors: telemetry.pageErrors.length,
        consoleMessages: telemetry.console.length,
        failedRequests: telemetry.failedRequests.length,
        httpErrors: telemetry.httpErrors.length,
        screenshots: telemetry.screenshots.length,
        snapshots: telemetry.snapshots.length,
        runtimeEvents: telemetry.runtime?.eventCount || 0
      },
      eventTypes: telemetry.runtime?.eventTypes || [],
      screenshots: telemetry.screenshots,
      failure: telemetry.failure
    }, null, 2));
  } catch (writeError) {
    console.error('Could not write diagnostics JSON:', writeError);
    failure = failure || writeError;
  }

  if (context && traceStarted) {
    await context.tracing.stop({ path: path.join(outDir, 'playwright-trace.zip') }).catch(error => {
      console.error('Could not save Playwright trace:', error);
      failure = failure || error;
    });
  }
  if (context) {
    await context.close().catch(error => {
      console.error('Could not close browser context:', error);
      failure = failure || error;
    });
  }
  await browser.close();
  // Playwright finalizes recorded video when the context closes.
  const videoDir = path.join(outDir, 'video');
  if (fs.existsSync(videoDir)) {
    const files = fs.readdirSync(videoDir);
    for (const file of files) {
      const from = path.join(videoDir, file);
      const to = path.join(outDir, 'video-' + file);
      fs.renameSync(from, to);
    }
    fs.rmSync(videoDir, { recursive: true, force: true });
  }
}
if (failure) {
  console.error(failure.stack || failure);
  process.exit(1);
}
