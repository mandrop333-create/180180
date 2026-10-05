// Rendering logic for the generic seven-piece trainer.

import { CELL, CELL_PITCH } from './state.js';

export function svgEl(tag, attrs = {}, cls = '', NS) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (cls) el.setAttribute('class', cls);
  return el;
}

export function drawActivePiece(piece, pieceSvg, anim, W, H, depth, cellsFor, NS) {
  pieceSvg.replaceChildren();
  if (!piece || anim) return;

  const pitch = CELL_PITCH;
  const block = CELL;
  const d = depth * 8;
  pieceSvg.setAttribute('viewBox', `0 0 ${W * pitch} ${H * pitch}`);

  const defs = svgEl('defs', {}, '', NS);
  const grad = svgEl('linearGradient', { id: 'pieceFront', x1:'0', y1:'0', x2:'1', y2:'1' }, '', NS);
  grad.append(svgEl('stop', { offset:'0%', 'stop-color':'#c8c1ff' }, '', NS));
  grad.append(svgEl('stop', { offset:'100%', 'stop-color':'#8d7fff' }, '', NS));
  defs.append(grad);
  pieceSvg.append(defs);

  const shape = cellsFor(piece.type, piece.o)
    .map(([cx,cy]) => [piece.x + cx, piece.y + cy])
    .filter(([x,y]) => y >= 0 && y < H && x >= 0 && x < W);

  const occupied = new Set(shape.map(([x,y]) => x + ',' + y));
  const X = x => x * pitch + 1;
  const Y = y => y * pitch + 1;
  const poly = (pts, cls) => pieceSvg.append(svgEl('polygon', {
    points: pts.map(([x,y]) => x + ',' + y).join(' ')
  }, cls, NS));

  if (d > 0) {
    for (const [x,y] of shape) {
      const x0=X(x), y0=Y(y), x1=X(x)+block-2, y1=Y(y)+block-2;
      if (!occupied.has((x+1)+','+y)) poly([[x1,y0],[x1,y1],[x1+d,y1+d],[x1+d,y0+d]], 'side-face');
      if (!occupied.has(x+','+(y+1))) poly([[x0,y1],[x1,y1],[x1+d,y1+d],[x0+d,y1+d]], 'side-face');
    }
  }

  for (const [x,y] of shape) {
    poly([[X(x),Y(y)],[X(x)+block-2,Y(y)],[X(x)+block-2,Y(y)+block-2],[X(x),Y(y)+block-2]], 'front-face');
  }

  for (const [x,y] of shape) {
    if (occupied.has((x+1)+','+y)) {
      pieceSvg.append(svgEl('line', {
        x1:X(x)+block-2, y1:Y(y)+1, x2:X(x)+block-2, y2:Y(y)+block-3
      }, 'seam', NS));
    }
    if (occupied.has(x+','+(y+1))) {
      pieceSvg.append(svgEl('line', {
        x1:X(x)+1, y1:Y(y)+block-2, x2:X(x)+block-3, y2:Y(y)+block-2
      }, 'seam', NS));
    }
  }
}

export function renderBoard(board, piece, anim, cells, W, H, cellsFor, collides, depth) {
  const all = Array(H * W).fill('');

  for (let y=0; y<H; y++) {
    for (let x=0; x<W; x++) {
      if (board[y][x]) all[y*W+x] = 'locked';
    }
  }

  if (piece && !anim) {
    let gy=piece.y;
    while (!collides(piece.x, gy+1, piece.o, piece.type)) gy++;
    for (const [cx,cy] of cellsFor(piece.type, piece.o)) {
      const x=piece.x+cx, y=gy+cy;
      if (y>=0 && y<H && x>=0 && x<W) all[y*W+x]='ghost';
    }
  }

  document.documentElement.style.setProperty('--depth', `${depth * 8}px`);
  document.documentElement.style.setProperty('--depth-factor', depth);

  cells.forEach((el,i) => {
    el.className='cell' + (all[i] ? ' ' + all[i] : '');
  });
}

export function startHalfTurn(old, boardEl, anim, depth, cellsFor, NS, onRender) {
  if (anim && anim.layer) anim.layer.remove();

  const shape = cellsFor(old.type, old.o);
  const minX=Math.min(...shape.map(c=>c[0]));
  const minY=Math.min(...shape.map(c=>c[1]));
  const maxX=Math.max(...shape.map(c=>c[0]));
  const maxY=Math.max(...shape.map(c=>c[1]));
  const width=(maxX-minX+1)*CELL_PITCH;
  const height=(maxY-minY+1)*CELL_PITCH;

  const layer=document.createElement('div');
  layer.className='turn-layer playing';
  layer.style.transform='perspective(700px) rotateX(0deg)';
  layer.style.animationIterationCount='1';
  layer.style.animationFillMode='forwards';
  layer.style.left=((old.x+minX)*CELL_PITCH)+'px';
  layer.style.top=((old.y+minY)*CELL_PITCH)+'px';
  layer.style.width=width+'px';
  layer.style.height=height+'px';
  layer.style.transformStyle='preserve-3d';

  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.setAttribute('width',String(width));
  svg.setAttribute('height',String(height));

  const defs=svgEl('defs',{},'',NS);
  const grad=svgEl('linearGradient',{id:'turnFront',x1:'0',y1:'0',x2:'1',y2:'1'},'',NS);
  grad.append(svgEl('stop',{offset:'0%','stop-color':'#c8c1ff'},'',NS));
  grad.append(svgEl('stop',{offset:'100%','stop-color':'#8d7fff'},'',NS));
  defs.append(grad);
  svg.append(defs);

  const d=depth*8;
  const occupied=new Set(shape.map(([x,y])=>x+','+y));
  const poly=(pts,cls)=>svg.append(svgEl('polygon',{points:pts.map(([x,y])=>x+','+y).join(' ')},cls,NS));

  for (const [x,y] of shape) {
    const x0=(x-minX)*CELL_PITCH+1, y0=(y-minY)*CELL_PITCH+1;
    const x1=x0+CELL-2, y1=y0+CELL-2;
    if(d>0 && !occupied.has((x+1)+','+y)) poly([[x1,y0],[x1,y1],[x1+d,y1+d],[x1+d,y0+d]],'side-face');
    if(d>0 && !occupied.has(x+','+(y+1))) poly([[x0,y1],[x1,y1],[x1+d,y1+d],[x0+d,y1+d]],'side-face');
    poly([[x0,y0],[x1,y0],[x1,y1],[x0,y1]],'front-face');
  }

  layer.append(svg);
  boardEl.appendChild(layer);
  anim.layer=layer;
  anim.until=performance.now()+180;

  layer.addEventListener('animationend',()=>{
    layer.remove();
    if(anim && anim.layer===layer){ anim.layer=null; anim.until=null; }
    if(onRender) onRender();
  },{once:true});
}
