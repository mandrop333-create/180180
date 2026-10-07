// Shared temporal-pattern primitives for training modes.
// This does not own rendering or gameplay; it describes rhythm data and evaluates timing.

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
    lastResult: null
  };
}

export function currentBeat(state) {
  if (!state?.sequence?.length) return null;
  return state.sequence[state.beatIndex % state.sequence.length];
}

export function beginBeat(state, now = performance.now()) {
  if (!state) return null;
  state.beatStartedAt = now;
  return currentBeat(state);
}

export function evaluateBeat(state, pieceType, now = performance.now()) {
  if (!state) return { valid: false, reason: 'No active rhythm.' };
  const expected = currentBeat(state);
  const interval = state.intervals[state.beatIndex % state.intervals.length] ?? 700;
  const expectedAt = state.beatStartedAt + interval;
  const errorMs = now - expectedAt;
  const absErrorMs = Math.abs(errorMs);
  const typeCorrect = pieceType === expected;
  const timingCorrect = absErrorMs <= state.timingWindowMs;
  const valid = typeCorrect && timingCorrect;

  state.lastTimingErrorMs = errorMs;
  state.lastResult = {
    expected,
    actual: pieceType,
    timingErrorMs: errorMs,
    typeCorrect,
    timingCorrect,
    valid
  };

  // Every attempted beat advances with the piece sequence. A mistimed response
  // is recorded as a miss rather than leaving rhythm state behind the generator.
  if (valid) state.completed++;
  else state.misses++;
  state.beatIndex = (state.beatIndex + 1) % state.sequence.length;
  state.lastBeatAt = now;
  state.beatStartedAt = now;

  return state.lastResult;
}

export function resetRhythmState(state, pattern = JOL_RHYTHM, now = performance.now()) {
  const fresh = createRhythmState(pattern, now);
  if (!state) return fresh;
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, fresh);
  return state;
}
