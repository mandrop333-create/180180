// Optional, bounded runtime recorder for 180180. No network requests unless an endpoint is explicitly configured.
const STORAGE_KEY = '180180.diagnostics.sessions.v1';
const MAX_SESSIONS = 8;
const MAX_EVENTS = 4000;
const MAX_BYTES = 700_000;

function safeReadSessions() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function clone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
}

export class RuntimeDiagnostics {
  constructor(trainer, { endpoint = '', enabled = false } = {}) {
    this.trainer = trainer;
    this.endpoint = endpoint;
    this.enabled = enabled;
    this.startedAt = new Date().toISOString();
    this.startedClock = performance.now();
    this.sessionId = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    this.events = [];
    this.lastStateSignature = '';
    this.lastBoardSignature = '';
    this.closed = false;
    this.persistTimer = null;
    this.uploadTimer = null;
    this.revision = 0;
    this.lastUploadedRevision = 0;
    this.uploading = false;
    this.originalConsoleError = null;
    if (!enabled) return;

    this.record('session-start', {
      sessionId: this.sessionId,
      mode: trainer.mode?.id || null,
      rules: {
        width: trainer.W, height: trainer.H, gravity: trainer.rules.gravity,
        das: trainer.rules.das, arr: trainer.rules.arr, lockDelay: trainer.rules.lockDelay,
        finesseEnabled: trainer.finesseEnabled
      }
    });
    this.onKeyDown = event => this.recordInput('keydown', event);
    this.onKeyUp = event => this.recordInput('keyup', event);
    this.onError = event => this.record('runtime-error', {
      message: String(event.message || 'Unknown window error'),
      filename: event.filename || null, line: event.lineno || null, column: event.colno || null
    });
    this.onRejection = event => this.record('unhandled-rejection', {
      reason: String(event.reason?.stack || event.reason?.message || event.reason || 'Unknown rejection')
    });
    this.onPageHide = () => this.flush();
    this.originalConsoleError = console.error;
    this.onConsoleError = (...args) => {
      this.record('console-error', { messages: args.map(value => String(value?.stack || value?.message || value)).slice(0, 12) });
      this.originalConsoleError.apply(console, args);
    };
    console.error = this.onConsoleError;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('error', this.onError);
    window.addEventListener('unhandledrejection', this.onRejection);
    window.addEventListener('pagehide', this.onPageHide);
    const originalHook = trainer.hook.bind(trainer);
    trainer.hook = (name, ...args) => {
      const result = originalHook(name, ...args);
      if (['spawn', 'move', 'rotate', 'hold', 'place', 'hardDrop', 'gameOver', 'reset'].includes(name)) {
        this.record('game-' + name, { args: clone(args) });
      }
      return result;
    };
    this.record('initial-state', this.snapshot());
    if (this.endpoint) this.uploadTimer = setInterval(() => this.flush(), 30000);
  }

  now() { return Math.round(performance.now() - this.startedClock); }

  record(type, data = {}) {
    if (!this.enabled || this.closed) return;
    this.events.push({ t: this.now(), type, data: clone(data) });
    this.revision++;
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
    this.schedulePersist();
  }

  schedulePersist() {
    if (!this.enabled || this.persistTimer !== null) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persist();
    }, 250);
  }

  recordInput(type, event) {
    if (!this.enabled) return;
    const action = Object.keys(this.trainer.binds || {}).find(key => this.trainer.binds[key] === event.code) || null;
    this.record('input-' + type, {
      code: event.code || null, key: event.key || null, action,
      repeat: !!event.repeat, defaultPrevented: !!event.defaultPrevented,
      piece: this.trainer.piece ? { ...this.trainer.piece } : null,
      finesseProgress: this.trainer.finesseProgress,
      finesseMistakes: this.trainer.finesseMistakes,
      finesseFaulted: this.trainer.finesseFaulted
    });
  }

  snapshot() {
    const t = this.trainer;
    return {
      piece: t.piece ? { ...t.piece } : null,
      queue: [...(t.queue || [])], hold: t.holdType, holdUsed: t.holdUsed,
      lines: t.lines, gameOver: t.gameOver, stats: { ...t.stats },
      finesse: {
        enabled: t.finesseEnabled, target: clone(t.finesseTarget),
        actions: clone(t.finesseActions), progress: t.finesseProgress,
        mistakes: t.finesseMistakes, faulted: t.finesseFaulted
      },
      board: clone(t.board)
    };
  }

  recordState(state) {
    if (!this.enabled) return;
    const t = this.trainer;
    const piece = state?.piece || null;
    const board = t.board || [];
    const boardSignature = JSON.stringify(board);
    if (boardSignature !== this.lastBoardSignature) {
      this.lastBoardSignature = boardSignature;
      this.record('board-change', { board: clone(board), piece: clone(piece), lines: state?.lines ?? t.lines });
    }
    const reduced = {
      piece, queue: state?.queue, hold: state?.hold, holdUsed: state?.holdUsed,
      lines: state?.lines, gameOver: state?.gameOver, stats: state?.stats,
      finesseState: state?.finesseState, finesse: state?.finesse,
      finesseProgress: t.finesseProgress, finesseMistakes: t.finesseMistakes,
      finesseFaulted: t.finesseFaulted
    };
    const signature = JSON.stringify(reduced);
    if (signature === this.lastStateSignature) return;
    this.lastStateSignature = signature;
    this.record('state-change', reduced);
  }

  recordReset(reason) {
    if (!this.enabled) return;
    this.record('reset', { reason: reason || 'unknown', state: this.snapshot() });
  }

  report() {
    return {
      schema: '180180-runtime-diagnostics/v1',
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      durationMs: this.now(),
      mode: this.trainer.mode?.id || null,
      eventCount: this.events.length,
      events: this.events.slice()
    };
  }

  persist() {
    if (!this.enabled) return;
    const report = this.report();
    let json = JSON.stringify(report);
    while (json.length > MAX_BYTES && this.events.length > 100) {
      this.events.splice(0, Math.ceil(this.events.length * 0.1));
      report.events = this.events.slice();
      report.eventCount = this.events.length;
      json = JSON.stringify(report);
    }
    const sessions = safeReadSessions().filter(item => item.sessionId !== this.sessionId);
    sessions.unshift(report);
    try {
      let stored = JSON.stringify(sessions.slice(0, MAX_SESSIONS));
      while (stored.length > MAX_BYTES && sessions.length > 1) {
        sessions.pop();
        stored = JSON.stringify(sessions);
      }
      localStorage.setItem(STORAGE_KEY, stored);
    } catch (error) {
      // Storage may be disabled or full; diagnostics must never break gameplay.
      console.warn('180180 diagnostics could not persist this session:', error);
    }
  }

  async flush() {
    if (!this.enabled) return;
    this.persist();
    if (!this.endpoint || this.uploading || this.revision <= this.lastUploadedRevision) return;
    this.uploading = true;
    const revisionAtStart = this.revision;
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(this.report()),
        keepalive: true
      });
      if (!response.ok) throw new Error('Diagnostics upload returned HTTP ' + response.status);
      this.lastUploadedRevision = revisionAtStart;
    } catch (error) {
      this.record('upload-error', { message: String(error?.message || error) });
    } finally {
      this.uploading = false;
    }
  }

  export() {
    if (!this.enabled) return null;
    const report = this.report();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '180180-diagnostics-' + this.sessionId + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return report;
  }

  destroy() {
    if (!this.enabled || this.closed) return;
    this.flush();
    this.closed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('error', this.onError);
    window.removeEventListener('unhandledrejection', this.onRejection);
    window.removeEventListener('pagehide', this.onPageHide);
    if (console.error === this.onConsoleError && this.originalConsoleError) console.error = this.originalConsoleError;
    if (this.persistTimer !== null) { clearTimeout(this.persistTimer); this.persistTimer = null; }
    if (this.uploadTimer !== null) { clearInterval(this.uploadTimer); this.uploadTimer = null; }
  }
}

export function getSavedDiagnosticSessions() {
  return safeReadSessions();
}
