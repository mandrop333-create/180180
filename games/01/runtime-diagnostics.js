const STORAGE_KEY = '180180.runtimeDiagnostics.v1';
const MAX_EVENTS = 500;
const PERSIST_EVERY = 5;

function safeRead() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function compactState(trainer) {
  return {
    piece: trainer.piece ? { ...trainer.piece } : null,
    board: Array.isArray(trainer.board) ? trainer.board.map(row => [...row]) : [],
    queue: [...(trainer.queue || [])],
    hold: trainer.holdType ?? null,
    holdUsed: !!trainer.holdUsed,
    lines: trainer.lines,
    stats: trainer.stats ? { ...trainer.stats } : null,
    gameOver: !!trainer.gameOver,
    finesse: {
      enabled: !!trainer.finesseEnabled,
      target: trainer.finesseTarget ? { ...trainer.finesseTarget } : null,
      actions: (trainer.finesseActions || []).map(step =>
        typeof step === 'string' ? { action: step, mode: 'tap' } : { ...step }
      ),
      progress: trainer.finesseProgress,
      mistakes: trainer.finesseMistakes,
      faulted: !!trainer.finesseFaulted
    }
  };
}

export function startRuntimeDiagnostics(trainer) {
  if (!trainer || typeof window === 'undefined') return null;

  const session = {
    schemaVersion: 1,
    sessionId: (globalThis.crypto?.randomUUID?.() || 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
    startedAt: new Date().toISOString(),
    page: window.location.pathname,
    mode: trainer.mode?.id || null,
    events: []
  };
  let dirtyEvents = 0;
  let previousState = '';

  function persist() {
    try {
      const saved = safeRead().filter(item => item.sessionId !== session.sessionId);
      saved.unshift({ ...session, events: session.events.slice(-MAX_EVENTS) });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.slice(0, 5)));
      dirtyEvents = 0;
    } catch (error) {
      // Diagnostics must never interfere with gameplay, including when storage is full.
      console.warn('180180 diagnostics could not persist this session', error);
    }
  }

  function record(type, details = {}, includeState = true) {
    try {
      const event = {
        t: Math.round(performance.now()),
        type,
        details
      };
      if (includeState) event.state = compactState(trainer);
      session.events.push(event);
      if (session.events.length > MAX_EVENTS) session.events.splice(0, session.events.length - MAX_EVENTS);
      dirtyEvents++;
      if (dirtyEvents >= PERSIST_EVERY) persist();
    } catch (error) {
      console.warn('180180 diagnostics event was skipped', error);
    }
  }

  // Keep the recorder observational: it never changes or blocks a game action.
  const originalOnState = trainer.options.onState;
  trainer.options.onState = state => {
    if (typeof originalOnState === 'function') originalOnState(state);
    try {
      const snapshot = compactState(trainer);
      const signature = JSON.stringify(snapshot);
      if (signature !== previousState) {
        previousState = signature;
        record('state', { finesseState: state?.finesseState || null });
      }
    } catch (error) {
      console.warn('180180 diagnostics state was skipped', error);
    }
  };

  const originalHook = trainer.hook.bind(trainer);
  trainer.hook = (name, ...args) => {
    const result = originalHook(name, ...args);
    if (['spawn', 'input', 'rotate', 'move', 'hold', 'place', 'reset', 'gameOver', 'hardDrop'].includes(name)) {
      record(name, { args: args.map(value => {
        if (!value || typeof value !== 'object') return value;
        if (value instanceof Event) return { type: value.type, code: value.code };
        try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
      }) });
    }
    return result;
  };

  const actionFor = code => Object.keys(trainer.binds || {}).find(action => trainer.binds[action] === code) || null;
  const onKeyDown = event => {
    const action = actionFor(event.code);
    if (action) record('keydown', { code: event.code, action, repeat: !!event.repeat }, false);
  };
  const onKeyUp = event => {
    const action = actionFor(event.code);
    if (action) record('keyup', { code: event.code, action }, false);
  };
  const onError = event => record('error', {
    message: String(event.message || 'Unknown window error'),
    source: event.filename || null,
    line: event.lineno || null,
    column: event.colno || null
  }, false);
  const onRejection = event => record('unhandledrejection', {
    message: String(event.reason?.stack || event.reason?.message || event.reason || 'Unknown rejection')
  }, false);
  const finish = () => {
    session.finishedAt = new Date().toISOString();
    persist();
  };

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  window.addEventListener('pagehide', finish);
  window.get180180Diagnostics = () => ({ ...session, events: [...session.events] });
  window.export180180Diagnostics = () => {
    finish();
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '180180-diagnostics-' + session.sessionId + '.json';
    link.click();
    URL.revokeObjectURL(url);
  };
  record('session-start', { userAgent: navigator.userAgent, finesseEnabled: !!trainer.finesseEnabled });
  persist();
  return { sessionId: session.sessionId, getReport: () => ({ ...session, events: [...session.events] }), flush: finish };
}
