// Shared temporal-pattern primitives for training modes.
// Rhythm owns temporal data only. Modes decide how the pattern is presented
// and how a player's response is interpreted.

export const JOL_RHYTHM = Object.freeze({
  id: 'jol-steady-01',
  sequence: Object.freeze(['J', 'O', 'L']),
  intervals: Object.freeze([700, 700, 700]),
  durationMs: 2100,
  timingWindowMs: 220
});

export function createRhythmState(pattern = JOL_RHYTHM, now = performance.now()) {
  return {
    patternId: pattern.id,
    sequence: [...pattern.sequence],
    intervals: [...pattern.intervals],
    durationMs: pattern.durationMs,
    timingWindowMs: pattern.timingWindowMs,
    beatIndex: 0,
    beatStartedAt: now,
    lastBeatAt: null,
    active: true,
    completed: 0,
    misses: 0,
    lastTimingErrorMs: null,
    lastResult: null,
    expectedPiece: pattern.sequence[0] ?? null
  };
}

export function currentBeat(state) {
  if (!state?.sequence?.length) return null;
  return state.sequence[state.beatIndex % state.sequence.length];
}

export function beginBeat(state, now = performance.now()) {
  if (!state) return null;
  state.beatStartedAt = now;
  state.expectedPiece = currentBeat(state);
  return state.expectedPiece;
}

export function evaluateBeat(state, pieceType, now = performance.now()) {
  if (!state?.active || !state.sequence.length) {
    return { valid: false, reason: 'No active rhythm.' };
  }

  const expected = currentBeat(state);
  const interval = state.intervals[state.beatIndex % state.intervals.length] ?? 700;
  const expectedAt = state.beatStartedAt + interval;
  const timingErrorMs = now - expectedAt;
  const typeCorrect = pieceType === expected;
  const timingCorrect = Math.abs(timingErrorMs) <= state.timingWindowMs;
  const valid = typeCorrect && timingCorrect;

  state.lastTimingErrorMs = timingErrorMs;
  state.lastResult = {
    expected,
    actual: pieceType,
    timingErrorMs,
    typeCorrect,
    timingCorrect,
    valid
  };

  if (valid) state.completed += 1;
  else state.misses += 1;

  state.beatIndex = (state.beatIndex + 1) % state.sequence.length;
  state.lastBeatAt = now;
  state.beatStartedAt = now;
  state.expectedPiece = currentBeat(state);

  return state.lastResult;
}

export function resetRhythmState(state, pattern = JOL_RHYTHM, now = performance.now()) {
  const fresh = createRhythmState(pattern, now);
  if (!state) return fresh;
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, fresh);
  return state;
}
