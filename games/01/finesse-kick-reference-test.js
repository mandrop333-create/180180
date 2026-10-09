import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { REFERENCE_I_SRS_PLUS, REFERENCE_I_180_SRS_PLUS, REFERENCE_JLSTZ_SRS, REFERENCE_JLSTZ_180_SRS_PLUS } from './finesse-kick-reference-fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error('finesse kick reference test: ' + message);
}
function same(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function runFinesseKickReferenceTests() {
  let checks = 0;
  for (const [transition, expected] of Object.entries(REFERENCE_I_SRS_PLUS)) {
    const [from, to] = transition.split('>').map(Number);
    assert(same(getSrsKicks('I', from, to), expected),
      'I SRS+ ordered kicks differ for ' + transition + '; expected ' + JSON.stringify(expected) +
      ', got ' + JSON.stringify(getSrsKicks('I', from, to)));
    checks++;
  }
  for (const [orientationText, expected] of Object.entries(REFERENCE_I_180_SRS_PLUS)) {
    const orientation = Number(orientationText);
    assert(same(getTetrio180Kicks('I', orientation), expected),
      'I direct-180 ordered kicks differ for orientation ' + orientation + '; expected ' +
      JSON.stringify(expected) + ', got ' + JSON.stringify(getTetrio180Kicks('I', orientation)));
    checks++;
  }
  for (const [transition, expected] of Object.entries(REFERENCE_JLSTZ_SRS)) {
    const [from, to] = transition.split('>').map(Number);
    assert(same(getSrsKicks('T', from, to), expected),
      'JLSTZ SRS ordered kicks differ for ' + transition + '; expected ' + JSON.stringify(expected) +
      ', got ' + JSON.stringify(getSrsKicks('T', from, to)));
    checks++;
  }
  for (const [orientationText, expected] of Object.entries(REFERENCE_JLSTZ_180_SRS_PLUS)) {
    const orientation = Number(orientationText);
    assert(same(getTetrio180Kicks('T', orientation), expected),
      'JLSTZ direct-180 ordered kicks differ for orientation ' + orientation + '; expected ' +
      JSON.stringify(expected) + ', got ' + JSON.stringify(getTetrio180Kicks('T', orientation)));
    checks++;
  }
  return { ok: true, checks, transitions90: 16, orientations180: 8, source: 'TetrisWiki SRS baseline + S-Finder SRSPlus reference, y-axis normalized' };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  console.log(JSON.stringify(runFinesseKickReferenceTests()));
}
