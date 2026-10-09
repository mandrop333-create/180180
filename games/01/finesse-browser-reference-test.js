import { chromium } from 'playwright';

const baseURL = process.env.FINESSE_BROWSER_BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

function assert(condition, message) {
  if (!condition) throw new Error('finesse browser reference: ' + message);
}

const scenarios = [
  {
    name: 'O one-tap horizontal move',
    type: 'O', start: { x:4, y:0, o:0 },
    route: [{ action:'right', mode:'tap' }],
    target: { x:5, o:0, y:18 },
    afterInput: { x:5, y:0, o:0 },
    lockedCells: [[5,18],[6,18],[5,19],[6,19]]
  },
  {
    name: 'T clockwise rotation',
    type: 'T', start: { x:4, y:0, o:0 },
    route: [{ action:'cw', mode:'tap' }],
    target: { x:4, o:1, y:17 },
    afterInput: { x:4, y:0, o:1 },
    lockedCells: [[5,17],[5,18],[6,18],[5,19]]
  },
  {
    name: 'I SRS+ clockwise kick',
    type: 'I', start: { x:4, y:0, o:0 },
    blockers: [[6,0]],
    route: [{ action:'cw', mode:'tap' }],
    target: { x:5, o:1, y:16 },
    afterInput: { x:5, y:0, o:1 },
    lockedCells: [[7,16],[7,17],[7,18],[7,19]]
  },
  {
    name: 'I SRS+ counter-clockwise kick',
    type: 'I', start: { x:4, y:0, o:0 },
    blockers: [[5,0]],
    route: [{ action:'ccw', mode:'tap' }],
    target: { x:3, o:3, y:16 },
    afterInput: { x:3, y:0, o:3 },
    lockedCells: [[4,16],[4,17],[4,18],[4,19]]
  },
  {
    name: 'I direct 180 kick',
    type: 'I', start: { x:4, y:0, o:0 },
    route: [{ action:'half', mode:'tap' }],
    target: { x:5, o:2, y:17 },
    afterInput: { x:5, y:1, o:2 },
    lockedCells: [[5,19],[6,19],[7,19],[8,19]]
  }
];

try {
  await page.goto(baseURL + (baseURL.includes('?') ? '&' : '?') + 'finesseReference=1', {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForFunction(() => !!window.trainer, null, { timeout: 15000 });

  for (const scenario of scenarios) {
    await page.evaluate(({ scenario }) => {
      const t = window.trainer;
      t.reset();
      // Isolate input/lock behavior from wall-clock gravity. Hard drop remains
      // the only operation that settles and locks the tested piece.
      t.rules.gravity = Infinity;
      t.rules.lockDelay = 100000;
      t.emptyBoard();
      for (const [x,y] of (scenario.blockers || [])) t.board[y][x] = 1;
      t.gameOver = false;
      t.piece = { type: scenario.type, ...scenario.start };
      t.lastRotation = false;
      t.finesseEnabled = true;
      const toggle = document.querySelector('#mainRuleFinesse');
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
      t.finesseEnabled = true;
      t.finesseTarget = { ...scenario.target };
      t.finesseActions = scenario.route.map(step => ({ ...step }));
      t.finesseRouteCandidates = [{
        route: scenario.route.map(step => ({ ...step })),
        progress: 0,
        pendingDasAction: null
      }];
      t.finesseProgress = 0;
      t.finesseFaulted = false;
      t.finesseMistakes = 0;
      t.finessePlacementResolved = false;
      t.finesseDASPending = null;
      t.stats.finessePerfect = 0;
      t.stats.finesseFaults = 0;
      t.moveState = { dir:0, elapsed:0, repeatElapsed:0, startedAt:0, nextRepeatAt:Infinity };
      t.emitState();
      t.render();
    }, { scenario });

    const promptVisible = await page.locator('#finessePrompt').evaluate(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return !el.hidden && s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    });
    assert(promptVisible, scenario.name + ': finesse prompt should be visible');

    const key = scenario.route[0].action === 'right' ? 'ArrowRight'
      : scenario.route[0].action === 'cw' ? 'x'
      : scenario.route[0].action === 'ccw' ? 'z' : 'a';
    await page.keyboard.press(key);

    const after = await page.evaluate(() => {
      const t = window.trainer;
      return {
        piece: t.piece ? { x:t.piece.x, y:t.piece.y, o:t.piece.o, type:t.piece.type } : null,
        progress: t.finesseProgress,
        faulted: t.finesseFaulted,
        promptKeys: [...(document.querySelector('#finessePrompt')?.querySelectorAll('.finesse-key') || [])].map(el => el.textContent)
      };
    });
    assert(after.piece && after.piece.x === scenario.afterInput.x &&
      after.piece.y === scenario.afterInput.y && after.piece.o === scenario.afterInput.o,
      scenario.name + ': actual input reached unexpected active state ' + JSON.stringify(after));
    assert(after.progress === 1 && !after.faulted,
      scenario.name + ': runtime observer did not accept the independently specified route ' + JSON.stringify(after));

    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.trainer.stats.piecesPlaced === 1, null, { timeout: 5000 });
    const locked = await page.evaluate(() => {
      const t = window.trainer;
      return {
        board: t.board.map(row => [...row]),
        perfect: t.stats.finessePerfect,
        faults: t.stats.finesseFaults,
        placed: t.stats.piecesPlaced
      };
    });
    assert(locked.perfect === 1 && locked.faults === 0 && locked.placed === 1,
      scenario.name + ': lock-time verification/scoring mismatch ' + JSON.stringify({
        perfect:locked.perfect, faults:locked.faults, placed:locked.placed
      }));
    for (const [x,y] of scenario.lockedCells) {
      assert(Boolean(locked.board[y][x]), scenario.name + ': expected locked mino missing at ' + x + ',' + y);
    }
    console.log(JSON.stringify({ scenario:scenario.name, passed:true, target:scenario.target, perfect:locked.perfect, faults:locked.faults }));
  }

  assert(pageErrors.length === 0, 'browser page errors: ' + JSON.stringify(pageErrors));
  console.log(JSON.stringify({ ok:true, scenarios:scenarios.length, pageErrors:pageErrors.length }));
} finally {
  await browser.close();
}
