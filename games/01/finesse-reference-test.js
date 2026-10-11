import { PIECE_TYPES, cellsFor, spawnFor, targetOrientation } from './pieces.js';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error('finesse reference test: ' + message);
}
function canonical(cells) {
  return cells.map(([x,y]) => x + ',' + y).sort().join('|');
}

export function runFinesseReferenceTests() {
  assert(PIECE_TYPES.length === 7, 'must define seven tetromino types');
  assert(new Set(PIECE_TYPES).size === 7, 'piece type list contains duplicates');

  for (const type of ['I','O','T','S','Z','J','L']) {
    const expected = REFERENCE_PIECES[type];
    assert(!!expected, type + ' missing from independent fixture set');
    const spawn = spawnFor(type);
    assert(spawn.type === type, type + ' spawn type mismatch');
    assert(spawn.x === expected.spawn.x && spawn.y === expected.spawn.y && spawn.o === 0,
      type + ' spawn origin/orientation mismatch');

    for (let orientation = 0; orientation < 4; orientation++) {
      const actual = cellsFor(type, orientation);
      assert(actual.length === 4, type + ' orientation ' + orientation + ' must have four cells');
      assert(new Set(actual.map(([x,y]) => x + ',' + y)).size === 4,
        type + ' orientation ' + orientation + ' has duplicate cells');
      assert(canonical(actual) === canonical(expected.orientations[orientation]),
        type + ' orientation ' + orientation + ' differs from reference fixture');
    }
  }

  for (let orientation = 0; orientation < 4; orientation++) {
    assert(targetOrientation(orientation, 1) === (orientation + 1) % 4,
      'CW orientation transition failed from ' + orientation);
    assert(targetOrientation(orientation, -1) === (orientation + 3) % 4,
      'CCW orientation transition failed from ' + orientation);
    assert(targetOrientation(orientation, 2) === (orientation + 2) % 4,
      'direct 180 orientation transition failed from ' + orientation);
  }

  return { ok: true, pieces: 7, orientations: 28, checks: 'geometry, spawn, orientation arithmetic' };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  console.log(JSON.stringify(runFinesseReferenceTests()));
}
