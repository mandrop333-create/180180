// Rendering logic for the generic trainer.

import { CELL, CELL_PITCH } from './state.js';

const ACTIVE_FRONT_GRADIENT = 'pieceFront';
const TURN_FRONT_GRADIENT = 'turnFront';
const TURN_BACK_GRADIENT = 'turnBack';

const PIECE_COLORS = Object.freeze({
  I: ['#8bd5ff', '#4aa7e8'], O: ['#ffe68a', '#e8b83f'], T: ['#d7a1ff', '#9a62df'],
  S: ['#8be7a7', '#45b96b'], Z: ['#ff8d9c', '#df5367'], J: ['#73a9ff', '#3978dc'], L: ['#ffb05f', '#e68528']
});

export function svgEl(tag, attrs = {}, cls = '', NS) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (cls) el.setAttribute('class', cls);
  return el;
}

function addGradient(defs, id, stops, NS) {
  const grad = svgEl('linearGradient', { id, x1: '0', y1: '0', x2: '1', y2: '1' }, '', NS);
  for (const stop of stops) grad.append(svgEl('stop', { offset: stop.offset, 'stop-color': stop.color }, '', NS));
  defs.append(grad);
}

function pieceGradient(type) {
  const [light, dark] = PIECE_COLORS[type] || PIECE_COLORS.T;
  return [{ offset: '0%', color: light }, { offset: '100%', color: dark }];
}

function appendPieceGeometry(root, shape, depthPx, NS, { frontGradient = ACTIVE_FRONT_GRADIENT } = {}) {
  const occupied = new Set(shape.map(([x, y]) => x + ',' + y));
  const X = x => x * CELL_PITCH, Y = y => y * CELL_PITCH;
  const poly = (pts, cls, attrs = {}) => root.append(svgEl('polygon', { points: pts.map(([x, y]) => x + ',' + y).join(' '), ...attrs }, cls, NS));
  for (const [x, y] of shape) {
    const x0 = X(x), y0 = Y(y), x1 = x0 + CELL_PITCH, y1 = y0 + CELL_PITCH;
    if (depthPx > 0) {
      if (!occupied.has((x + 1) + ',' + y)) poly([[x1, y0], [x1, y1], [x1 + depthPx, y1 + depthPx], [x1 + depthPx, y0 + depthPx]], 'side-face');
      if (!occupied.has(x + ',' + (y + 1))) poly([[x0, y1], [x1, y1], [x1 + depthPx, y1 + depthPx], [x0 + depthPx, y1 + depthPx]], 'side-face');
    }
  }
  for (const [x, y] of shape) {
    const x0 = X(x), y0 = Y(y), x1 = x0 + CELL_PITCH, y1 = y0 + CELL_PITCH;
    poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 'front-face', { fill: 'url(#' + frontGradient + ')' });
  }
  for (const [x, y] of shape) {
    const x0 = X(x), y0 = Y(y), x1 = x0 + CELL - 2, y1 = y0 + CELL - 2;
    if (occupied.has((x + 1) + ',' + y)) root.append(svgEl('line', { x1, y1: y0 + 1, x2: x1, y2: y1 - 1 }, 'seam', NS));
    if (occupied.has(x + ',' + (y + 1))) root.append(svgEl('line', { x1: x0 + 1, y1, x2: x1 - 1, y2: y1 }, 'seam', NS));
  }
}

export function drawActivePiece(piece, pieceSvg, anim, W, H, depth, cellsFor, NS, cache = {}, colorOnlyFocalPiece = false) {
  if (!piece || anim?.layer) { if (!anim?.layer) cache.activeKey = null; pieceSvg.replaceChildren(); return; }
  const key = piece.type + ':' + piece.x + ':' + piece.y + ':' + piece.o + ':' + depth + ':' + colorOnlyFocalPiece;
  if (cache.activeKey === key) return;
  cache.activeKey = key;
  pieceSvg.replaceChildren();
  const pitch = CELL_PITCH, depthPx = depth * 12;
  pieceSvg.setAttribute('viewBox', '0 0 ' + W * pitch + ' ' + H * pitch);
  const defs = svgEl('defs', {}, '', NS);
  addGradient(defs, ACTIVE_FRONT_GRADIENT, pieceGradient(piece.type), NS);
  pieceSvg.append(defs);
  const shape = cellsFor(piece.type, piece.o).map(([cx, cy]) => [piece.x + cx, piece.y + cy]).filter(([x, y]) => y >= 0 && y < H && x >= 0 && x < W);
  if (colorOnlyFocalPiece) {
    const minX = Math.min(...shape.map(([x]) => x)), maxX = Math.max(...shape.map(([x]) => x));
    const minY = Math.min(...shape.map(([,y]) => y)), maxY = Math.max(...shape.map(([,y]) => y));
    const widthPx = (maxX - minX + 1) * pitch;
    const heightPx = (maxY - minY + 1) * pitch;
    const cx = (minX + maxX + 1) * pitch / 2;
    const cy = (minY + maxY + 1) * pitch / 2;
    const radius = Math.hypot(widthPx, heightPx) / 2 + 1;
    const color = (PIECE_COLORS[piece.type] || PIECE_COLORS.T)[0];
    pieceSvg.append(svgEl('circle', { cx, cy, r: radius, fill: color }, 'color-only-focal-circle', NS));
    return;
  }
  appendPieceGeometry(pieceSvg, shape, depthPx, NS);
}

export function renderBoard(board, piece, anim, cells, W, H, cellsFor, collides, depth, shadowOpacity = .6, shadowBrightness = 1, showGhost = true, cache = {}) {
  const all = Array(H * W).fill('');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (board[y][x]) {
      const type = typeof board[y][x] === 'string' ? board[y][x].toLowerCase() : '';
      all[y * W + x] = type ? `locked locked-${type}` : 'locked';
    }
  }

  const ghostHidden = cells.some(el => el.classList.contains('ghost-hide-marker'));
  if (showGhost && !ghostHidden && piece && !anim?.layer) {
    let gy = piece.y;
    while (!collides(piece.x, gy + 1, piece.o, piece.type)) gy++;
    for (const [cx, cy] of cellsFor(piece.type, piece.o)) {
      const x = piece.x + cx, y = gy + cy;
      if (y >= 0 && y < H && x >= 0 && x < W && !all[y * W + x]) all[y * W + x] = 'ghost ghost-' + piece.type.toLowerCase();
    }
  }

  document.documentElement.style.setProperty('--depth', (depth * 12) + 'px');
  document.documentElement.style.setProperty('--depth-factor', depth);
  document.documentElement.style.setProperty('--shadow-opacity', shadowOpacity);
  document.documentElement.style.setProperty('--shadow-brightness', shadowBrightness);
  const previous = cache.cellClasses || (cache.cellClasses = []);
  cells.forEach((el, i) => { const cls = 'cell' + (all[i] ? ' ' + all[i] : ''); if (previous[i] !== cls) { el.className = cls; previous[i] = cls; } });
}

export function startHalfTurn(animation, boardEl, cellsFor, NS, onRender) {
  const old = animation.from, next = animation.to, BOX_SIZE = 4 * CELL_PITCH;
  const oldShape = cellsFor(old.type, old.o), nextShape = cellsFor(next.type, next.o);
  const layer = document.createElement('div');
  layer.className = 'turn-layer playing';
  layer.style.left = (old.x * CELL_PITCH) + 'px'; layer.style.top = (old.y * CELL_PITCH) + 'px';
  layer.style.width = BOX_SIZE + 'px'; layer.style.height = BOX_SIZE + 'px';
  layer.style.setProperty('--turn-shift-x', ((next.x - old.x) * CELL_PITCH) + 'px');
  layer.style.setProperty('--turn-shift-y', ((next.y - old.y) * CELL_PITCH) + 'px');
  layer.style.setProperty('--turn-duration', animation.duration + 'ms');
  const pivotX = old.type === 'I' ? 1.5 : old.type === 'O' ? 0.5 : 1;
  const pivotY = old.type === 'I' ? 1.5 : old.type === 'O' ? 0.5 : 1;
  const pivotPxX = pivotX * CELL_PITCH + CELL_PITCH * .5;
  const pivotPxY = pivotY * CELL_PITCH + CELL_PITCH * .5;
  const scene = document.createElement('div');
  scene.className = 'turn-scene'; scene.style.width = BOX_SIZE + 'px'; scene.style.height = BOX_SIZE + 'px';
  scene.style.transformOrigin = pivotPxX + 'px ' + pivotPxY + 'px'; scene.style.setProperty('--turn-perspective', '1000px');

  const makeFace = (className, shape, gradient, transform) => {
    const face = document.createElement('div');
    face.className = 'turn-face ' + className; face.style.width = BOX_SIZE + 'px'; face.style.height = BOX_SIZE + 'px'; face.style.transform = transform;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + BOX_SIZE + ' ' + BOX_SIZE); svg.setAttribute('width', String(BOX_SIZE)); svg.setAttribute('height', String(BOX_SIZE)); svg.setAttribute('aria-hidden', 'true');
    const defs = svgEl('defs', {}, '', NS); addGradient(defs, gradient, pieceGradient(old.type), NS); svg.append(defs);
    appendPieceGeometry(svg, shape, 0, NS, { frontGradient: gradient }); face.append(svg); return face;
  };
  scene.append(makeFace('turn-front', oldShape, TURN_FRONT_GRADIENT, 'translateZ(1px)'), makeFace('turn-back', nextShape, TURN_BACK_GRADIENT, 'rotateX(180deg) translateZ(1px)'));
  layer.append(scene); boardEl.appendChild(layer); animation.layer = layer; animation.started = performance.now();

  // The gameplay rotation is already committed before this visual starts.
  // Never let the visual lifecycle strand the engine in an animated state:
  // animationend is the normal path, while animationcancel/reduced-motion and
  // a timeout are safety paths. This is especially important because the
  // reduced-motion stylesheet intentionally disables the CSS animation.
  let finished = false;
  let fallbackTimer = null;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (fallbackTimer !== null) clearTimeout(fallbackTimer);
    if (layer.isConnected) layer.remove();
    if (animation.layer === layer) animation.layer = null;
    if (onRender) onRender();
  };
  scene.addEventListener('animationend', event => {
    if (event.animationName === 'halfFlip') finish();
  }, { once: true });
  scene.addEventListener('animationcancel', finish, { once: true });
  fallbackTimer = window.setTimeout(finish, Math.max(0, Number(animation.duration) || 0) + 80);
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) window.requestAnimationFrame(finish);
}
