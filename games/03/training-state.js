// Shared training telemetry/state. This is infrastructure only: modes decide how the
// information is interpreted. Gameplay remains owned by Trainer.

export function createTrainingState(now = performance.now()) {
  return {
    startedAt: now,
    elapsedMs: 0,
    lastActionAt: null,
    lastAction: null,
    actionCount: 0,
    rotationCount: 0,
    halfTurns: 0,
    rotationHistory: [],
    timing: {
      lastIntervalMs: null,
      intervals: []
    },
    rhythm: {
      patternId: null,
      beatIndex: 0,
      beats: [],
      active: false,
      completed: 0,
      misses: 0
    }
  };
}

export function recordTrainingAction(state, action, now = performance.now(), detail = {}) {
  if (!state) return;
  const interval = state.lastActionAt == null ? null : Math.max(0, now - state.lastActionAt);
  state.lastActionAt = now;
  state.lastAction = { action, at: now, ...detail };
  state.actionCount++;
  if (interval != null) {
    state.timing.lastIntervalMs = interval;
    state.timing.intervals.push(interval);
    if (state.timing.intervals.length > 64) state.timing.intervals.shift();
  }
}

export function recordTrainingRotation(state, delta, before, after, now = performance.now()) {
  if (!state) return;
  state.rotationCount++;
  if (Math.abs(delta) === 2) state.halfTurns++;
  state.rotationHistory.push({ delta, before: { ...before }, after: { ...after }, at: now });
  if (state.rotationHistory.length > 64) state.rotationHistory.shift();
}

export function tickTrainingState(state, now = performance.now()) {
  if (!state) return;
  state.elapsedMs = Math.max(0, now - state.startedAt);
}

export function resetTrainingState(state, now = performance.now()) {
  const fresh = createTrainingState(now);
  if (!state) return fresh;
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, fresh);
  return state;
}
