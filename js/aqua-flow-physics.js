/* Aqua Space fluid microphysics.
 * A lightweight visual simulation only: no game state, input, or piece timing
 * is read or changed. It combines a damped ripple field with depth-biased
 * marine snow, drag, buoyancy, shear currents, vortices and pointer impulses.
 */
(() => {
  const canvas = document.getElementById('aquaFlowCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  let width = 1, height = 1, dpr = 1, cols = 0, rows = 0;
  let wave, previous, nextWave, particles = [], last = 0, frame = 0;
  let pointer = { x: -1000, y: -1000, active: false, lastX: 0, lastY: 0, vx: 0, vy: 0 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  function resize() {
    width = innerWidth; height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = width < 600 ? 18 : 22;
    cols = Math.ceil(width / cell) + 2; rows = Math.ceil(height / cell) + 2;
    wave = new Float32Array(cols * rows);
    previous = new Float32Array(cols * rows);
    nextWave = new Float32Array(cols * rows);
    const count = Math.round(clamp(width * height / (width < 600 ? 11500 : 8500), 24, 110));
    particles = Array.from({length: count}, () => makeParticle(true));
  }
  function makeParticle(randomY = false) {
    const depth = Math.random();
    return {
      x: rand(0, width), y: randomY ? rand(0, height) : height + rand(0, 30),
      depth, r: .35 + depth * 1.15, alpha: .09 + depth * .2,
      vx: rand(-.12, .12), vy: rand(-.2, .08), phase: rand(0, Math.PI * 2),
      trail: []
    };
  }
  function disturb(x, y, strength) {
    if (!wave) return;
    const gx = Math.round(x / width * (cols - 1));
    const gy = Math.round(y / height * (rows - 1));
    const radius = 4;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const xx = gx + dx, yy = gy + dy;
      if (xx < 1 || xx >= cols - 1 || yy < 1 || yy >= rows - 1) continue;
      const d = Math.hypot(dx, dy);
      if (d <= radius) wave[yy * cols + xx] += strength * Math.cos(d / radius * Math.PI / 2);
    }
  }
  function onPointer(e) {
    const x = e.clientX, y = e.clientY;
    if (pointer.active) {
      pointer.vx = x - pointer.lastX; pointer.vy = y - pointer.lastY;
      const speed = Math.hypot(pointer.vx, pointer.vy);
      if (speed > 2) disturb(x, y, Math.min(speed * .012, .42));
    }
    pointer.x = pointer.lastX = x; pointer.y = pointer.lastY = y; pointer.active = true;
  }
  function waveStep() {
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        const neighbors = wave[i - 1] + wave[i + 1] + wave[i - cols] + wave[i + cols];
        nextWave[i] = (neighbors * .5 - previous[i]) * .986;
      }
    }
    const old = previous; previous = wave; wave = nextWave; nextWave = old;
    // Gentle, sparse pressure pulses keep the water alive when untouched.
    if (Math.random() < .012) disturb(rand(width * .08, width * .92), rand(height * .12, height * .9), rand(.025, .08));
  }
  function field(x, y, t) {
    const nx = x / Math.max(1, width), ny = y / Math.max(1, height);
    // Two slow, crossing currents create shear instead of uniform particle drift.
    let u = .22 * Math.sin(ny * 5.3 + t * .00016) + .12 * Math.cos(nx * 8.1 - ny * 2 + t * .00011);
    let v = .11 * Math.sin(nx * 6.2 - t * .00013) + .07 * Math.cos(ny * 7.4 + nx * 3 + t * .00009);
    // Broad counter-rotating eddies; velocity weakens smoothly away from each core.
    for (const vortex of [{x:.17,y:.39,s:1},{x:.82,y:.62,s:-1},{x:.58,y:.17,s:-.6}]) {
      const dx = nx - vortex.x, dy = ny - vortex.y;
      const r2 = dx * dx + dy * dy;
      const strength = vortex.s * .0022 * Math.exp(-r2 * 12);
      u += -dy * strength * width;
      v += dx * strength * height;
    }
    const idx = clamp(Math.round(ny * (rows - 1)), 1, rows - 2) * cols + clamp(Math.round(nx * (cols - 1)), 1, cols - 2);
    const slopeX = (wave[idx + 1] - wave[idx - 1]) * 2.5;
    const slopeY = (wave[idx + cols] - wave[idx - cols]) * 2.5;
    u += slopeY * .16; v -= slopeX * .16;
    if (pointer.active) {
      const dx = x - pointer.x, dy = y - pointer.y, r2 = dx * dx + dy * dy;
      if (r2 < 180 * 180) {
        const influence = Math.exp(-r2 / 5200);
        u += (pointer.vx * .012 - dy * .0007) * influence;
        v += (pointer.vy * .012 + dx * .0007) * influence;
      }
    }
    return [u, v];
  }
  function drawCaustics(t) {
    // Low-frequency wave gradients create broken, soft caustic strokes.
    ctx.lineWidth = .7;
    for (let y = 2; y < rows - 2; y += 2) {
      for (let x = 2; x < cols - 2; x += 3) {
        const i = y * cols + x;
        const gx = wave[i + 1] - wave[i - 1];
        const gy = wave[i + cols] - wave[i - cols];
        const energy = Math.abs(gx) + Math.abs(gy);
        if (energy < .012 || ((x * 13 + y * 7 + frame) % 11) > 2) continue;
        const px = x / (cols - 1) * width, py = y / (rows - 1) * height;
        ctx.strokeStyle = 'rgba(119,238,220,' + Math.min(.12, energy * 1.3) + ')';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + gx * 12 + Math.sin(t * .0002 + y) * 2, py + gy * 10);
        ctx.stroke();
      }
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    if (!reduced.matches) waveStep();
    drawCaustics(t);
    for (const p of particles) {
      const [fu, fv] = reduced.matches ? [0, 0] : field(p.x, p.y, t);
      // Buoyancy offsets gravity-like settling; depth increases inertia and visibility.
      const buoyancy = -.008 + p.depth * .004;
      const drag = .965 - p.depth * .012;
      p.vx = (p.vx + fu * .012) * drag;
      p.vy = (p.vy + fv * .012 + buoyancy) * drag;
      p.phase += .012 + p.depth * .008;
      p.vx += Math.sin(p.phase + p.y * .01) * .004;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -8) p.x = width + 8;
      if (p.x > width + 8) p.x = -8;
      if (p.y < -8) { p.y = height + 8; p.x = rand(0, width); }
      if (p.y > height + 8) { p.y = -8; p.x = rand(0, width); }
      const waveIndex = clamp(Math.round(p.y / height * (rows - 1)), 1, rows - 2) * cols + clamp(Math.round(p.x / width * (cols - 1)), 1, cols - 2);
      const shimmer = Math.abs(wave[waveIndex] || 0);
      ctx.fillStyle = 'rgba(163,245,226,' + (p.alpha + Math.min(.12, shimmer * .3)) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      if (p.depth > .72 && !reduced.matches) {
        ctx.strokeStyle = 'rgba(121,221,215,' + (p.alpha * .22) + ')';
        ctx.lineWidth = .55; ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 4, p.y - p.vy * 4); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    }
    pointer.vx *= .82; pointer.vy *= .82;
    frame++;
  }
  function tick(t) {
    if (document.hidden) { last = t; requestAnimationFrame(tick); return; }
    if (t - last > (reduced.matches ? 120 : 40)) { last = t; draw(t); }
    requestAnimationFrame(tick);
  }
  window.addEventListener('resize', resize, {passive:true});
  if (finePointer.matches) window.addEventListener('pointermove', onPointer, {passive:true});
  window.addEventListener('pointerdown', e => { if (finePointer.matches) { pointer.active=true; pointer.x=e.clientX; pointer.y=e.clientY; disturb(pointer.x,pointer.y,.22); } }, {passive:true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) last = 0; });
  resize();
  requestAnimationFrame(tick);
})();
