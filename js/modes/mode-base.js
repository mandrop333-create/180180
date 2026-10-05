// Shared mode definition factory.
// Modes describe training rules; the Trainer owns execution.

export const baseRules = Object.freeze({
  width: 10,
  height: 20,
  gravity: 800,
  lockDelay: 500,
  das: 127,
  arr: 0,
  clearBoardAfterPlace: true
});

export function createMode({ id, number, name, description, color, rules = {}, hooks = {}, createSession, spawn }) {
  return {
    id,
    number,
    name,
    description,
    color,
    rules: { ...baseRules, ...rules },
    hooks,
    ...(createSession ? { createSession } : {}),
    ...(spawn ? { spawn } : {})
  };
}
