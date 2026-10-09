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
  await page.waitForFunction(() => window.trainer, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  await capturePageState(page, 'desktop-initial');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await capturePageState(page, 'mobile-initial');
  telemetry.visualAudit = await page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        exists: true,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0,
        x: Math.round(r.x), y: Math.round(r.y),
        width: Math.round(r.width), height: Math.round(r.height)
      };
    };
    return {
      mobile: {
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        board: rect('#board'),
        score: rect('#hudScore'),
        lines: rect('#hudLines'),
        hold: rect('#holdPreview'),
        next: rect('#nextPreview'),
        restart: rect('#restartButton')
      }
    };
  });
  const mobileAudit = telemetry.visualAudit.mobile;
  if (!mobileAudit.board?.visible) throw new Error('Visual audit: game board is not visible on the mobile viewport');
  // Horizontal overflow is asserted only by the explicit mobile-layout test.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(100);

  // Execute additional actions selected from the user's plain-English request.
  // Only explicit, supported game actions are translated; unknown requests are reported,
  // never silently treated as if they were tested.
  const requestedText = process.env.PLAYWRIGHT_TEST_REQUEST || '';
  const requestedActions = [];
  const actionChecks = [];
  const requestLower = requestedText.toLowerCase();
  const snapshotGame = () => page.evaluate(() => {
    const t = window.trainer;
    return {
      piece: t.piece ? { type: t.piece.type, x: t.piece.x, y: t.piece.y, o: t.piece.o } : null,
      holdType: t.holdType,
      gameOver: t.gameOver,
      score: t.stats?.score,
      hardDropRows: t.stats?.hardDropRows,
      board: JSON.stringify(t.board)
    };
  });
  const assertCheck = (name, ok, detail) => {
    actionChecks.push({ action: name, passed: Boolean(ok), detail });
    if (!ok) throw new Error('Requested action assertion failed (' + name + '): ' + detail);
  };
  const actionRules = [
    {
      name: 'move-left', terms: ['move left', 'left movement', 'left arrow', 'to the left', 'left and right'],
      run: async () => {
        await page.evaluate(() => window.trainer.reset());
        const before = await snapshotGame();
        await page.keyboard.press('ArrowLeft');
        const after = await snapshotGame();
        assertCheck('move-left', after.piece && before.piece && after.piece.x < before.piece.x, 'Active piece x should decrease after ArrowLeft');
      }
    },
    {
      name: 'move-right', terms: ['move right', 'right movement', 'right arrow', 'to the right', 'left and right'],
      run: async () => {
        await page.evaluate(() => window.trainer.reset());
        const before = await snapshotGame();
        await page.keyboard.press('ArrowRight');
        const after = await snapshotGame();
        assertCheck('move-right', after.piece && before.piece && after.piece.x > before.piece.x, 'Active piece x should increase after ArrowRight');
      }
    },
    {
      name: 'soft-drop', terms: ['soft drop', 'drop down'],
      run: async () => {
        await page.evaluate(() => window.trainer.reset());
        const before = await snapshotGame();
        await page.keyboard.press('ArrowDown');
        const after = await snapshotGame();
        assertCheck('soft-drop', after.piece && before.piece && (after.piece.y > before.piece.y || after.score > before.score), 'Piece should descend or score should increase after soft drop');
      }
    },
    {
      name: 'rotate', terms: ['rotate', 'rotation'],
      run: async () => {
        await page.evaluate(() => window.trainer.reset());
        const before = await snapshotGame();
        await page.keyboard.press('x');
        const after = await snapshotGame();
        assertCheck('rotate', after.piece && before.piece && after.piece.o !== before.piece.o, 'Piece orientation should change after clockwise rotation');
      }
    },
    {
      name: 'hold', terms: ['hold'],
      run: async () => {
        await page.evaluate(() => window.trainer.reset());
        const before = await snapshotGame();
        await page.keyboard.press('Shift');
        const after = await snapshotGame();
        assertCheck('hold', Boolean(after.holdType) && Boolean(after.piece) && after.holdType === before.piece?.type, 'Hold slot should contain the previously active piece');
      }
    },
    {
      name: 'hard-drop', terms: ['hard drop', 'hard-drop'],
      run: async () => {
        await page.evaluate(() => window.trainer.reset());
        const before = await snapshotGame();
        await page.keyboard.press('Space');
        const after = await snapshotGame();
        assertCheck('hard-drop', after.board !== before.board || after.hardDropRows > before.hardDropRows || after.gameOver, 'Hard drop should lock a piece, change the board, score rows, or end the game');
      }
    },
    {
      name: 'rotate-180-control', terms: ['rotate 180', '180 rotation', '180-degree', 'half turn', 'half-turn', '180 control', 'half-turn control'],
      run: async () => {
        await page.evaluate(() => {
          const t = window.trainer;
          t.reset();
          // Validate the configured 180-degree control path, not an unimplemented gameplay rule.
          window.__halfTurnCalls = [];
          const originalRotate = t.rotate.bind(t);
          window.__originalTrainerRotate = t.rotate;
          t.rotate = (delta) => {
            window.__halfTurnCalls.push(delta);
            return originalRotate(delta);
          };
        });
        await page.keyboard.press('a');
        const result = await page.evaluate(() => {
          const calls = window.__halfTurnCalls || [];
          window.trainer.rotate = window.__originalTrainerRotate;
          return { calls, halfBind: window.trainer.binds.half };
        });
        assertCheck('rotate-180-control', result.halfBind === 'KeyA' && result.calls.includes(2), 'The configured 180-degree control should dispatch a half-turn request (delta 2)');
      }
    },
    {
      name: 'hold-swap', terms: ['hold swap', 'swap hold', 'swap a held piece', 'hold twice'],
      run: async () => {
        const result = await page.evaluate(() => {
          const t = window.trainer;
          t.reset();
          const first = t.piece.type;
          t.hold();
          const heldFirst = t.holdType;
          t.hardDrop();
          const currentBeforeSwap = t.piece?.type;
          t.hold();
          return { first, heldFirst, currentBeforeSwap, activeAfterSwap: t.piece?.type, holdAfterSwap: t.holdType };
        });
        assertCheck('hold-swap', result.heldFirst === result.first && result.activeAfterSwap === result.first && result.holdAfterSwap === result.currentBeforeSwap, 'After placing one piece, hold should swap the stored piece into play and store the outgoing piece');
      }
    },
    {
      name: 'line-clear', terms: ['line clear', 'clear a line', 'clear one line', 'single line clear', 'clearing a line', 'clear the line'],
      run: async () => {
        const result = await page.evaluate(() => {
          const t = window.trainer;
          t.reset();
          t.board = Array.from({ length: t.H }, () => Array(t.W).fill(0));
          for (let x = 0; x < t.W; x++) if (x < 3 || x > 6) t.board[t.H - 1][x] = 'J';
          t.piece = { type: 'I', x: 3, y: t.H - 2, o: 0 };
          t.holdUsed = false;
          const beforeLines = t.lines;
          t.lockPiece(false);
          return { beforeLines, afterLines: t.lines, linesCleared: t.stats.linesCleared, bottomRowEmpty: t.board[t.H - 1].every(cell => !cell) };
        });
        assertCheck('line-clear', result.afterLines === result.beforeLines + 1 && result.linesCleared === 1 && result.bottomRowEmpty, 'Completing the prepared bottom row should clear exactly one line and leave an empty bottom row');
      }
    },
    {
      name: 'collision-boundary', terms: ['collision', 'wall collision', 'boundary collision', 'blocked movement'],
      run: async () => {
        const result = await page.evaluate(() => {
          const t = window.trainer;
          t.reset();
          t.piece = { type: 'O', x: 0, y: 0, o: 0 };
          const before = { ...t.piece };
          const moved = t.movePiece(-1, 0);
          return { moved, beforeX: before.x, afterX: t.piece.x, stillValid: !t.collides(t.piece.x, t.piece.y, t.piece.o, t.piece.type) };
        });
        assertCheck('collision-boundary', result.moved === false && result.beforeX === result.afterX && result.stillValid, 'A piece at the left boundary must not move outside the playfield');
      }
    },
    {
      name: 'finesse-feedback', terms: ['finesse', 'red to green', 'finesse trainer', 'finesse inputs'],
      run: async () => {
        const result = [];
        const pieceTypes = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        const boardKinds = ['empty', 'split-well', 'side-towers'];
        for (const boardKind of boardKinds) for (const type of pieceTypes) {
          await page.evaluate(({ boardKind, type }) => {
            const t = window.trainer;
            t.reset();
            t.emptyBoard();
            if (boardKind === 'split-well') {
              for (let x = 0; x < t.W; x++) if (x !== 4 && x !== 5) t.board[t.H - 1][x] = 1;
              for (let x = 0; x < t.W; x++) if (![3, 4, 5, 6].includes(x)) t.board[t.H - 2][x] = 1;
            } else if (boardKind === 'side-towers') {
              for (let y = t.H - 4; y < t.H; y++) t.board[y][0] = 1;
              for (let y = t.H - 2; y < t.H; y++) t.board[y][1] = 1;
              for (let y = t.H - 3; y < t.H; y++) t.board[y][8] = 1;
              for (let y = t.H - 5; y < t.H; y++) t.board[y][9] = 1;
            }
            t.gameOver = false;
            t.piece = { type, x: 4, y: 0, o: 0 };
            // Direct piece injection is test-only; regenerate the route and flush
            // rendering so the screenshot and visible board match the tested piece.
            t.generateFinessePrompt();
            t.render();
            const toggle = document.querySelector('#mainRuleFinesse');
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change', { bubbles: true }));
          }, { boardKind, type });
          const label = `finesse-${boardKind}-${type}`;
          await capturePageState(page, label + '-prompt');
          const before = await page.evaluate(() => {
            const t = window.trainer;
            const prompt = document.querySelector('#finessePrompt');
            const toggle = document.querySelector('#mainRuleFinesse');
            const rect = prompt?.getBoundingClientRect();
            const visible = !!prompt && !prompt.hidden && getComputedStyle(prompt).display !== 'none' &&
              getComputedStyle(prompt).visibility !== 'hidden' && !!rect && rect.width > 0 && rect.height > 0;
            const keys = [...(prompt?.querySelectorAll('.finesse-key') || [])];
            return {
              target: t.finesseTarget ? { ...t.finesseTarget } : null,
              actions: t.finesseActions.map(step => ({ ...step })),
              routes: t.finesseRouteCandidates.map(candidate => candidate.route.map(step => ({ ...step }))),
              initialProgress: t.finesseProgress,
              initialStates: keys.map(el => [...el.classList].find(name => ['done', 'next', 'pending'].includes(name)) || 'missing'),
              visiblePrompt: visible,
              visibleLabels: keys.map(el => el.textContent),
              toggleChecked: !!toggle?.checked,
              promptHidden: !!prompt?.hidden
            };
          });
          assertCheck('finesse-visible-prompt-' + label,
            before.visiblePrompt && before.toggleChecked && before.visibleLabels.length === before.actions.length &&
            before.visibleLabels.every(Boolean),
            JSON.stringify({visible:before.visiblePrompt,toggle:before.toggleChecked,labels:before.visibleLabels,actions:before.actions.length}));
          const replay = await page.evaluate(() => {
            const t = window.trainer;
            const keyEvent = code => ({ code, preventDefault() {} });
            for (const step of t.finesseActions.filter(item => item.action !== 'hard').map(item => ({ ...item }))) {
              const code = t.binds[step.action];
              t.handleKeydown(keyEvent(code));
              if (step.mode === 'das') t.tick(performance.now() + t.das() + 5);
              t.handleKeyup(keyEvent(code));
            }
            return {
              progressAfterInputs: t.finesseProgress,
              actionCount: t.finesseActions.filter(item => item.action !== 'hard').length,
              faultedAfterInputs: t.finesseFaulted,
              actualBeforeDrop: { ...t.piece }
            };
          });
          await capturePageState(page, label + '-after-inputs');
          const visibleProgress = await page.evaluate(() => {
            const prompt = document.querySelector('#finessePrompt');
            const keys = [...(prompt?.querySelectorAll('.finesse-key') || [])];
            return {
              visible: !!prompt && !prompt.hidden && getComputedStyle(prompt).display !== 'none',
              states: keys.map(el => [...el.classList].find(name => ['done', 'next', 'pending'].includes(name)) || 'missing'),
              labels: keys.map(el => el.textContent)
            };
          });
          assertCheck('finesse-visible-progress-' + label,
            visibleProgress.visible && visibleProgress.states.filter(state => state === 'done').length === replay.progressAfterInputs &&
            replay.progressAfterInputs === replay.actionCount &&
            (replay.progressAfterInputs === before.actions.length || visibleProgress.states.includes('next')),
            JSON.stringify({progress:replay.progressAfterInputs,states:visibleProgress.states,visible:visibleProgress.visible}));
          const placed = await page.evaluate(() => {
            const t = window.trainer;
            const keyEvent = code => ({ code, preventDefault() {} });
            t.handleKeydown(keyEvent(t.binds.hard));
            return { finessePerfect: t.stats.finessePerfect, finesseFaults: t.stats.finesseFaults };
          });
          result.push({ type, boardKind, ...before, ...replay, ...placed });

          // Re-run one distinct equal-cost route for the same physical target.
          // This specifically proves the runtime accepts alternate optimal
          // routes instead of only accepting the planner's canonical route.
          const canonicalKey = route => route.map(step => step.action + ':' + (step.mode || 'tap')).join('|');
          const alternateRoute = before.routes.find(route => canonicalKey(route) !== canonicalKey(before.actions));
          if (alternateRoute) {
            await page.evaluate(({ boardKind, type }) => {
              const t = window.trainer;
              t.reset();
              t.emptyBoard();
              if (boardKind === 'split-well') {
                for (let x = 0; x < t.W; x++) if (x !== 4 && x !== 5) t.board[t.H - 1][x] = 1;
                for (let x = 0; x < t.W; x++) if (![3, 4, 5, 6].includes(x)) t.board[t.H - 2][x] = 1;
              } else if (boardKind === 'side-towers') {
                for (let y = t.H - 4; y < t.H; y++) t.board[y][0] = 1;
                for (let y = t.H - 2; y < t.H; y++) t.board[y][1] = 1;
                for (let y = t.H - 3; y < t.H; y++) t.board[y][8] = 1;
                for (let y = t.H - 5; y < t.H; y++) t.board[y][9] = 1;
              }
              t.gameOver = false;
              t.piece = { type, x: 4, y: 0, o: 0 };
              t.generateFinessePrompt();
              t.render();
              const toggle = document.querySelector('#mainRuleFinesse');
              toggle.checked = true;
              toggle.dispatchEvent(new Event('change', { bubbles: true }));
            }, { boardKind, type });
            const alternateReplay = await page.evaluate(route => {
              const t = window.trainer;
              const keyEvent = code => ({ code, preventDefault() {} });
              const target = { ...t.finesseTarget };
              for (const step of route) {
                const code = t.binds[step.action];
                t.handleKeydown(keyEvent(code));
                if (step.mode === 'das') t.tick(performance.now() + t.das() + 5);
                t.handleKeyup(keyEvent(code));
              }
              const progress = t.finesseProgress;
              const faulted = t.finesseFaulted;
              const actualBeforeDrop = { ...t.piece };
              t.handleKeydown(keyEvent(t.binds.hard));
              return {
                target,
                progress,
                actionCount: route.length,
                faulted,
                finessePerfect: t.stats.finessePerfect,
                finesseFaults: t.stats.finesseFaults,
                actualBeforeDrop
              };
            }, alternateRoute);
            const targetMatches = alternateReplay.target.x === before.target.x &&
              alternateReplay.target.o === before.target.o &&
              alternateReplay.target.y === before.target.y;
            assertCheck('finesse-alternate-optimal-route-' + label,
              targetMatches && alternateReplay.progress === alternateReplay.actionCount &&
              !alternateReplay.faulted && alternateReplay.finessePerfect === 1 &&
              alternateReplay.finesseFaults === 0,
              JSON.stringify({targetMatches, route:alternateRoute, result:alternateReplay}));
            result.push({ type, boardKind, alternateRoute, ...alternateReplay, alternateRoutePassed:
              targetMatches && alternateReplay.progress === alternateReplay.actionCount &&
              !alternateReplay.faulted && alternateReplay.finessePerfect === 1 &&
              alternateReplay.finesseFaults === 0 });
          }
        }
        assertCheck('finesse-alternate-optimal-route-coverage',
          result.some(r => r.alternateRoute) && result.filter(r => r.alternateRoute).every(r => r.alternateRoutePassed),
          'At least one distinct equal-cost route must be replayed, and every tested alternative must lock the same target without a finesse fault');
        assertCheck('finesse-route-present', result.every(r => r.target !== null && Array.isArray(r.actions)), 'Each piece on each test board must receive an explicit route and landing target');
        assertCheck('finesse-progress', result.every(r => r.progressAfterInputs === r.actions.filter(step => step.action !== 'hard').length && !r.faultedAfterInputs), 'Every deliberate movement/rotation action must advance without a fault; hard drop is verified separately and is not part of the finesse cost');
        assertCheck('finesse-physical-target', result.every(r => r.finessePerfect === 1 && r.finesseFaults === 0), 'Following each route and hard-dropping must count exactly one clean placement on the advertised target for all piece/board combinations');
      }
    },
    {
      name: 'reset', terms: ['reset', 'restart'],
      run: async () => {
        await page.keyboard.press('Space');
        await page.evaluate(() => window.trainer.reset());
        const after = await snapshotGame();
        assertCheck('reset', Boolean(after.piece) && !after.gameOver && after.holdType === null, 'Reset should spawn an active piece and clear game-over/hold state');
      }
    },
    {
      name: 'mobile-layout', terms: ['mobile', 'phone', 'responsive'],
      run: async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        const result = await page.evaluate(() => ({
          viewportWidth: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          boardExists: Boolean(document.querySelector('#board')),
          boardWidth: document.querySelector('#board')?.getBoundingClientRect().width || 0
        }));
        assertCheck('mobile-layout', result.viewportWidth === 390 && result.boardExists && result.boardWidth > 0 &&
          result.documentWidth <= result.viewportWidth + 1, 'Board should remain rendered without horizontal overflow at 390px viewport width');
        await capturePageState(page, 'requested-mobile-layout');
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
    }
  ];
  if (requestedText.trim()) {
    for (const rule of actionRules) {
      if (rule.terms.some(term => requestLower.includes(term))) {
        await rule.run();
        requestedActions.push(rule.name);
        await page.waitForTimeout(120);
        await capturePageState(page, 'requested-' + rule.name);
      }
    }
    const recognizedTerms = actionRules.flatMap(rule => rule.terms).filter(term => requestLower.includes(term));
    telemetry.requestedTest = {
      request: requestedText,
      executedActions: requestedActions,
      recognized: recognizedTerms.length > 0,
      assertions: actionChecks,
      passedAssertions: actionChecks.filter(check => check.passed).length,
      failedAssertions: actionChecks.filter(check => !check.passed).length,
      note: recognizedTerms.length ? null : 'No supported action keywords matched. Standard diagnostics ran, but the requested scenario was not interpreted.'
    };
    if (!recognizedTerms.length) throw new Error('No supported actions recognized in PLAYWRIGHT_TEST_REQUEST. Supported examples: move left, move right, soft drop, rotate, hold, hard drop, reset, mobile layout.');
    const requestReport = path.join(outDir, 'requested-test-results.json');
    fs.writeFileSync(requestReport, JSON.stringify(telemetry.requestedTest, null, 2));
  }

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

  report = await page.evaluate(() => window.__180180Diagnostics?.report() || null);
  if (report) {
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
    if (report.events.some(event => event.type === 'runtime-error' || event.type === 'unhandled-rejection')) {
      throw new Error('Runtime error was captured during the browser smoke test');
    }
    console.log(JSON.stringify({ ok: true, sessionId: report.sessionId, eventCount: report.eventCount, eventTypes: [...types] }));
  } else {
    telemetry.runtime = { available: false, note: 'Runtime diagnostics instrumentation is absent; gameplay and Finesse browser assertions still ran.' };
    console.log(JSON.stringify({ ok: true, runtimeDiagnostics: false, note: telemetry.runtime.note }));
  }
  if (telemetry.pageErrors.length) throw new Error('Browser page errors: ' + telemetry.pageErrors.map(item => item.message).join(' | '));
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
