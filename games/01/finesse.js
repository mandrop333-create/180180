// Compatibility facade for legacy imports and existing tests.
// The replacement implementation lives in finesse-core.js; do not add planner
// logic here. Runtime integration imports finesse-core.js directly.
export { enumerateFinesseTargets, planFinesse, minimumRoutesForTargets } from './finesse-core.js';
