// Rendering logic for the board and pieces

/**
 * Create an SVG element with attributes and class
 * @param {string} tag - SVG tag name
 * @param {Object} attrs - Attributes object
 * @param {string} cls - CSS class name
 * @param {string} NS - SVG namespace
 * @returns {SVGElement} SVG element
 */
export function svgEl(tag, attrs = {}, cls = '', NS) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  if (cls) el.setAttribute('class', cls);
  return el;
}

/**
 * Draw the active piece with 3D extrusion
 * @param {Object} piece - Piece object {x, y, o}
 * @param {SVGElement} pieceSvg - SVG element to draw into
 * @param {Object} anim - Animation state {layer, until}
 * @param {number} W - Board width
 * @param {number} H - Board height
 * @param {number} depth - Current depth value (0-1)
 * @param {Function} cellsFor - Function to get piece cell coordinates
 * @param {string} NS - SVG namespace
 */
export function drawActivePiece(piece, pieceSvg, anim, W, H, depth, cellsFor, NS) {
  pieceSvg.replaceChildren();
  if (!piece || anim) return;
  
  const pitch = 30, block = 28, d = depth * 8;
  pieceSvg.setAttribute('viewBox', `0 0 ${W * pitch} ${H * pitch}`);
  
  const defs = svgEl('defs', {}, '', NS);
  const grad = svgEl('linearGradient', { id: 'tFront', x1: '0', y1: '0', x2: '1', y2: '1' }, '', NS);
  grad.append(svgEl('stop', { offset: '0%', 'stop-color': '#c8c1ff' }, '', NS));
  grad.append(svgEl('stop', { offset: '100%', 'stop-color': '#8d7fff' }, '', NS));
  defs.append(grad);
  pieceSvg.append(defs);
  
  const shape = cellsFor(piece.o)
    .map(([cx, cy]) => [piece.x + cx, piece.y + cy])
    .filter(([x, y]) => y >= 0 && y < H && x >= 0 && x < W);
  
  const occupied = new Set(shape.map(([x, y]) => `${x},${y}`));
  const X = x => x * pitch + 1, Y = y => y * pitch + 1;
  
  const poly = (pts, cls) => pieceSvg.append(svgEl('polygon', { points: pts.map(([x, y]) => `${x},${y}`).join(' ') }, cls, NS));
  
  // Draw one continuous extruded silhouette: only the outer boundary receives depth faces
  if (d > 0) {
    for (const [x, y] of shape) {
      const x0 = X(x), y0 = Y(y), x1 = X(x + 1) - 2, y1 = Y(y + 1) - 2;
      if (!occupied.has(`${x + 1},${y}`)) poly([[x1, y0], [x1, y1], [x1 + d, y1 + d], [x1 + d, y0 + d]], 'side-face');
      if (!occupied.has(`${x},${y + 1}`)) poly([[x0, y1], [x1, y1], [x1 + d, y1 + d], [x0 + d, y1 + d]], 'side-face');
    }
  }
  
  // The front is a single silhouette, with subtle internal seams only where cells meet
  for (const [x, y] of shape) {
    poly([[X(x), Y(y)], [X(x + 1) - 2, Y(y)], [X(x + 1) - 2, Y(y + 1) - 2], [X(x), Y(y + 1) - 2]], 'front-face');
  }
  
  // Draw low-contrast internal seams to retain the familiar Tetris cell structure
  for (const [x, y] of shape) {
    if (occupied.has(`${x + 1},${y}`)) {
      pieceSvg.append(svgEl('line', { x1: X(x + 1) - 2, y1: Y(y) + 1, x2: X(x + 1) - 2, y2: Y(y + 1) - 3 }, 'seam', NS));
    }
    if (occupied.has(`${x},${y + 1}`)) {
      pieceSvg.append(svgEl('line', { x1: X(x) + 1, y1: Y(y + 1) - 2, x2: X(x + 1) - 3, y2: Y(y + 1) - 2 }, 'seam', NS));
    }
  }
}

/**
 * Render the board state to DOM cells
 * @param {Array<Array<number>>} board - Board state
 * @param {Object} piece - Active piece
 * @param {Object} anim - Animation state
 * @param {Array<HTMLElement>} cells - DOM cell elements
 * @param {number} W - Board width
 * @param {number} H - Board height
 * @param {Function} cellsFor - Function to get piece cell coordinates
 * @param {Function} collides - Collision detection function
 * @param {number} depth - Current depth value (0-1)
 */
export function renderBoard(board, piece, anim, cells, W, H, cellsFor, collides, depth) {
  const all = Array(H * W).fill('');
  
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (board[y][x]) all[y * W + x] = 'locked';
    }
  }
  
  if (piece && !anim) {
    let gy = piece.y;
    while (!collides(piece.x, gy + 1, piece.o)) gy++;
    
    for (const [cx, cy] of cellsFor(piece.o)) {
      let x = piece.x + cx, y = gy + cy;
      if (y >= 0 && y < H && x >= 0 && x < W) all[y * W + x] = 'ghost';
    }
  }
  
  document.documentElement.style.setProperty('--depth', `${depth * 8}px`);
  document.documentElement.style.setProperty('--depth-factor', depth);
  
  cells.forEach((el, i) => {
    el.className = 'cell' + (all[i] ? ' ' + all[i] : '');
  });
}

/**
 * Start the 180° turn animation
 * @param {Object} old - Old piece state {x, y, o}
 * @param {HTMLElement} boardEl - Board DOM element
 * @param {Object} anim - Animation state object (will be modified)
 * @param {number} depth - Current depth value (0-1)
 * @param {Function} cellsFor - Function to get piece cell coordinates
 * @param {string} NS - SVG namespace
 * @param {Function} onRender - Callback to render after animation ends
 */
export function startHalfTurn(old, boardEl, anim, depth, cellsFor, NS, onRender) {
  if (anim && anim.layer) anim.layer.remove();
  
  const layer = document.createElement('div');
  layer.className = 'turn-layer playing';
  layer.style.transform = 'perspective(700px) rotateX(0deg)';
  layer.style.animationIterationCount = '1';
  layer.style.animationFillMode = 'forwards';
  layer.style.left = (old.x * 30) + 'px';
  layer.style.top = (old.y * 30) + 'px';
  layer.style.width = '90px';
  layer.style.height = '90px';
  layer.style.transformStyle = 'preserve-3d';
  
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 90 90');
  svg.setAttribute('width', '90');
  svg.setAttribute('height', '90');
  
  const defs = svgEl('defs', {}, '', NS);
  const grad = svgEl('linearGradient', { id: 'turnFront', x1: '0', y1: '0', x2: '1', y2: '1' }, '', NS);
  grad.append(svgEl('stop', { offset: '0%', 'stop-color': '#c8c1ff' }, '', NS));
  grad.append(svgEl('stop', { offset: '100%', 'stop-color': '#8d7fff' }, '', NS));
  defs.append(grad);
  svg.append(defs);
  
  const d = depth * 8;
  const shape = cellsFor(old.o);
  const occupied = new Set(shape.map(([x, y]) => `${x},${y}`));
  
  const poly = (pts, cls) => {
    const el = svgEl('polygon', { points: pts.map(([x, y]) => x + ',' + y).join(' ') }, cls, NS);
    svg.append(el);
  };
  
  if (d > 0) {
    for (const [x, y] of shape) {
      const x0 = x * 30 + 1, y0 = y * 30 + 1, x1 = x * 30 + 29, y1 = y * 30 + 29;
      if (!occupied.has(`${x + 1},${y}`)) poly([[x1, y0], [x1, y1], [x1 + d, y1 + d], [x1 + d, y0 + d]], 'side-face');
      if (!occupied.has(`${x},${y + 1}`)) poly([[x0, y1], [x1, y1], [x1 + d, y1 + d], [x0 + d, y1 + d]], 'side-face');
    }
  }
  
  for (const [x, y] of shape) {
    poly([[x * 30 + 1, y * 30 + 1], [x * 30 + 29, y * 30 + 1], [x * 30 + 29, y * 30 + 29], [x * 30 + 1, y * 30 + 29]], 'front-face');
  }
  
  layer.append(svg);
  boardEl.appendChild(layer);
  anim.layer = layer;
  anim.until = performance.now() + 180;
  
  layer.addEventListener('animationend', () => {
    layer.remove();
    if (anim && anim.layer === layer) {
      anim.layer = null;
      anim.until = null;
    }
    if (onRender) onRender();
  }, { once: true });
}
