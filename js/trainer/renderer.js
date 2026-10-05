// Rendering logic for the generic seven-piece trainer.

import { CELL, CELL_PITCH } from './state.js';

const ACTIVE_FRONT_GRADIENT = 'pieceFront';
const TURN_FRONT_GRADIENT = 'turnFront';
const TURN_BACK_GRADIENT = 'turnBack';

export function svgEl(tag, attrs = {}, cls = '', NS) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (cls) el.setAttribute('class', cls);
  return el;
}

function addGradient(defs, id, stops, NS) {
  const grad = svgEl('linearGradient', {
    id,
    x1: '0',
    y1: '0',
    x2: '1',
    y2: '1'
  }, '', NS);

  for (const stop of stops) {
    grad.append(svgEl('stop', {
      offset: stop.offset,
      'stop-color': stop.color
    }, '', NS));
  }

  defs.append(grad);
}

function appendPieceGeometry(root, shape, depthPx, NS, { frontGradient = ACTIVE_FRONT_GRADIENT } = {}) {
  const occupied = new Set(shape.map(([x, y]) => x + ',' + y));
  const X = x => x * CELL_PITCH + 1;
  const Y = y => y * CELL_PITCH + 1;
  const poly = (pts, cls, attrs = {}) => root.append(svgEl('polygon', {
    points: pts.map(([x, y]) => x + ',' + y).join(' '),
    ...attrs
  }, cls, NS));

  for (const [x, y] of shape) {
    const x0 = X(x);
    const y0 = Y(y);
    const x1 = x0 + CELL - 2;
    const y1 = y0 + CELL - 2;

    if (depthPx > 0) {
      if (!occupied.has((x + 1) + ',' + y)) {
        poly([[x1, y0], [x1, y1], [x1 + depthPx, y1 + depthPx], [x1 + depthPx, y0 + depthPx]], 'side-face');
      }
      if (!occupied.has(x + ',' + (y + 1))) {
        poly([[x0, y1], [x1, y1], [x1 + depthPx, y1 + depthPx], [x0 + depthPx, y1 + depthPx]], 'side-face');
      }
    }
  }

  for (const [x, y] of shape) {
    const x0 = X(x);
    const y0 = Y(y);
    const x1 = x0 + CELL - 2;
    const y1 = y0 + CELL - 2;

    poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 'front-face', {
      fill: 'url(#' + frontGradient + ')'
    });
  }

  for (const [x, y] of shape) {
    const x0 = X(x);
    const y0 = Y(y);
    const x1 = x0 + CELL - 2;
    const y1 = y0 + CELL - 2;

    if (occupied.has((x + 1) + ',' + y)) {
      root.append(svgEl('line', {
        x1: x1, y1: y0 + 1, x2: x1, y2: y1 - 1
      }, 'seam', NS));
    }

    if (occupied.has(x + ',' + (y + 1))) {
      root.append(svgEl('line', {
        x1: x0 + 1, y1: y1, x2: x1 - 1, y2: y1
      }, 'seam', NS));
    }
  }
}

export function drawActivePiece(piece, pieceSvg, anim, W, H, depth, cellsFor, NS) {
  pieceSvg.replaceChildren();
  if (!piece || anim) return;

  const pitch = CELL_PITCH;
  const depthPx = depth * 12;
  pieceSvg.setAttribute('viewBox', '0 0 ' + W * pitch + ' ' + H * pitch);

  const defs = svgEl('defs', {}, '', NS);
  addGradient(defs, ACTIVE_FRONT_GRADIENT, [
    { offset: '0%', color: '#c8c1ff' },
    { offset: '100%', color: '#8d7fff' }
  ], NS);
  pieceSvg.append(defs);

  const shape = cellsFor(piece.type, piece.o)
    .map(([cx, cy]) => [piece.x + cx, piece.y + cy])
    .filter(([x, y]) => y >= 0 && y < H && x >= 0 && x < W);

  appendPieceGeometry(pieceSvg, shape, depthPx, NS);
}

export function renderBoard(board, piece, anim, cells, W, H, cellsFor, collides, depth) {
  const all = Array(H * W).fill('');

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (board[y][x]) all[y * W + x] = 'locked';
    }
  }

  if (piece && !anim) {
    let gy = piece.y;
    while (!collides(piece.x, gy + 1, piece.o, piece.type)) gy++;
    for (const [cx, cy] of cellsFor(piece.type, piece.o)) {
      const x = piece.x + cx;
      const y = gy + cy;
      if (y >= 0 && y < H && x >= 0 && x < W) all[y * W + x] = 'ghost';
    }
  }

  document.documentElement.style.setProperty('--depth', (depth * 12) + 'px');
  document.documentElement.style.setProperty('--depth-factor', depth);

  cells.forEach((el, i) => {
    el.className = 'cell' + (all[i] ? ' ' + all[i] : '');
  });
}

export function startHalfTurn(old, next, boardEl, anim, depth, cellsFor, NS, onRender) {
  if (anim?.layer) anim.layer.remove();

  const BOX_SIZE = 4 * CELL_PITCH;
  const oldShape = cellsFor(old.type, old.o);
  const nextShape = cellsFor(next.type, next.o);

  const layer = document.createElement('div');
  layer.className = 'turn-layer playing';
  layer.style.left = (old.x * CELL_PITCH) + 'px';
  layer.style.top = (old.y * CELL_PITCH) + 'px';
  layer.style.width = BOX_SIZE + 'px';
  layer.style.height = BOX_SIZE + 'px';
  layer.style.setProperty('--turn-depth', '0px');
  layer.style.setProperty('--turn-perspective', (650 - depth * 250) + 'px');
  const shiftX = (next.x - old.x) * CELL_PITCH;
  const shiftY = (next.y - old.y) * CELL_PITCH;
  layer.style.setProperty('--turn-shift-x', shiftX + 'px');
  layer.style.setProperty('--turn-shift-y', shiftY + 'px');
  layer.style.setProperty('--turn-duration', '420ms');

  const pivotY = old.type === 'I' ? 1.5 : old.type === 'O' ? 0.5 : 1;
  const pivotPx = pivotY * CELL_PITCH + CELL_PITCH * .5;

  const scene = document.createElement('div');
  scene.className = 'turn-scene';
  scene.style.width = BOX_SIZE + 'px';
  scene.style.height = BOX_SIZE + 'px';
  scene.style.transformOrigin = '50% ' + pivotPx + 'px';

  const front = document.createElementNS(NS, 'svg');
  front.setAttribute('viewBox', '0 0 ' + BOX_SIZE + ' ' + BOX_SIZE);
  front.setAttribute('width', String(BOX_SIZE));
  front.setAttribute('height', String(BOX_SIZE));
  front.classList.add('turn-face', 'turn-front');

  const defs = svgEl('defs', {}, '', NS);
  addGradient(defs, TURN_FRONT_GRADIENT, [
    { offset: '0%', color: '#d2caff' },
    { offset: '55%', color: '#a899ff' },
    { offset: '100%', color: '#7664e8' }
  ], NS);
  front.append(defs);
  appendPieceGeometry(front, oldShape, 0, NS, {
    frontGradient: TURN_FRONT_GRADIENT
  });

  const back = document.createElementNS(NS, 'svg');
  back.setAttribute('viewBox', '0 0 ' + BOX_SIZE + ' ' + BOX_SIZE);
  back.setAttribute('width', String(BOX_SIZE));
  back.setAttribute('height', String(BOX_SIZE));
  back.classList.add('turn-face', 'turn-back');

  appendPieceGeometry(back, nextShape, 0, NS, {
    frontGradient: TURN_BACK_GRADIENT
  });

  scene.append(front, back);
  layer.append(scene);
  boardEl.appendChild(layer);

  anim.layer = layer;
  anim.until = performance.now() + 440;

  scene.addEventListener('animationend', () => {
    if (layer.isConnected) layer.remove();
    if (anim.layer === layer) {
      anim.layer = null;
      anim.until = null;
    }
    if (onRender) onRender();
  }, { once: true });
}
