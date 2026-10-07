// Shared temporal-pattern primitives for training modes.
// Rhythm owns the timing window only. The Trainer continues to process
// real input normally; the mode decides how the resulting state is revealed.

export const JOL_RHYTHM = Object.freeze({
  id: 'jol-input-window-01',
  inputDurationMs: 2000,
  revealDurationMs: 500
});

export function createRhythmState(pattern = JOL_RHYTHM, now = performance.now()) {
  return {
    patternId: pattern.id,
    inputDurationMs: pattern.inputDurationMs,
    revealDurationMs: pattern.revealDurationMs,
    phase: 'input',
    phaseStartedAt: now,
    cycle: 0,
    active: true,
    visible: false,
    remainingMs: pattern.inputDurationMs,
    progress: 0
  };
}

export function advanceRhythm(state, now = performance.now()) {
  if (!state?.active) return false;

  let changed = false;
  let guard = 0;
  while (guard++ < 4) {
    const duration = state.phase === 'input' ? state.inputDurationMs : state.revealDurationMs;
    const elapsed = Math.max(0, now - state.phaseStartedAt);
    if (elapsed < duration) {
      state.remainingMs = Math.max(0, duration - elapsed);
      state.progress = Math.min(1, elapsed / duration);
      state.visible = state.phase === 'reveal';
      break;
    }

    const overflow = elapsed - duration;
    state.phase = state.phase === 'input' ? 'reveal' : 'input';
    if (state.phase === 'input') state.cycle += 1;
    state.phaseStartedAt = now - overflow;
    state.visible = state.phase === 'reveal';
    changed = true;
  }

  return changed;
}

export function resetRhythmState(state, pattern = JOL_RHYTHM, now = performance.now()) {
  const fresh = createRhythmState(pattern, now);
  if (!state) return fresh;
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, fresh);
  return state;
}
