// Tetromino definitions and orientation geometry.

export const PIECE_TYPES = Object.freeze(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);

const DEFINITIONS = {
  I: { spawn:{x:3,y:0}, cells:[
    [[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]
  ]},
  O: { spawn:{x:4,y:0}, cells:[
    [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]]
  ]},
  T: { spawn:{x:3,y:0}, cells:[
    [[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]
  ]},
  S: { spawn:{x:3,y:0}, cells:[
    [[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]
  ]},
  Z: { spawn:{x:3,y:0}, cells:[
    [[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]
  ]},
  J: { spawn:{x:3,y:0}, cells:[
    [[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]
  ]},
  L: { spawn:{x:3,y:0}, cells:[
    [[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]
  ]}
};

export function getPieceDefinition(type) {
  return DEFINITIONS[type] || DEFINITIONS.T;
}

export function cellsFor(type, orientation = 0) {
  const definition = getPieceDefinition(type);
  return definition.cells[((orientation % 4) + 4) % 4].map(([x,y]) => [x,y]);
}

export function spawnFor(type) {
  const definition = getPieceDefinition(type);
  return { type, x: definition.spawn.x, y: definition.spawn.y, o: 0 };
}

export function targetOrientation(from, delta) {
  return (from + (delta === 2 || delta === -2 ? 2 : delta) + 4) % 4;
}
