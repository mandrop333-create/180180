/* Aqua Space fluid microphysics — v2.
 * A decorative, isolated fluid field: never reads or mutates game state.
 * The background flow is derived from a stream function (approximately
 * divergence-free), particles use midpoint integration, and the ripple field
 * advances at a fixed step so motion is less dependent on display frame rate.
 */
(() => {
  const canvas = document.getElementById('aquaFlowCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const vortices = [
    { x: .17, y: .39, spin: 1.0, radius: .22 },
    { x: .82, y: .62, spin: -1.0, radius: .25 },
    { x: .58, y: .17, spin: -.6, radius: .18 }
  ];
  let width = 1, height = 1, dpr = 1, cols = 0, rows = 0, cell = 22;
  let wave, previous, nextWave, particles = [], last = 0, accumulator = 0, frame = 0;
  let pointer = { x: -1000, y: -1000, active: false, lastX: 0, lastY: 0, vx: 0, vy: 0 };
  const STEP = 1 / 30;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    width = innerWidth; height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = width < 600 ? 20 : 24;
    cols = Math.ceil(width / cell) + 2;
    rows = Math.ceil(height / cell) + 2;
    wave = new Float32Array(cols * rows);
    previous = new Float32Array(cols * rows);
    nextWave = new Float32Array(cols * rows);
    const count = Math.round(clamp(width * height / (finePointer.matches ? 10000 : 16000), 18, finePointer.matches ? 96 : 36));
    particles = Array.from({ length: count }, () => makeParticle(true));
    accumulator = 0;
  }

  function makeParticle(randomY = false) {
    const depth = Math.random();
    return {
      x: rand(0, width), y: randomY ? rand(0, height) : height + rand(0, 30),
      depth, r: .35 + depth * 1.15, alpha: .08 + depth * .18,
      vx: rand(-.1, .1), vy: rand(-.12, .05), phase: rand(0, Math.PI * 2)
    };
  }

  function disturb(x, y, strength) {
    if (!wave || width <= 0 || height <= 0) return;
    const gx = Math.round(x / cell) + 1;
    const gy = Math.round(y / cell) + 1;
    const radius = 4;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const xx = gx + dx, yy = gy + dy, d = Math.hypot(dx, dy);
        if (xx < 1 || xx >= cols - 1 || yy < 1 || yy >= rows - 1 || d > radius) continue;
        wave[yy * cols + xx] += strength * Math.cos(d / radius * Math.PI / 2);
      }
    }
  }

  function onPointer(e) {
    const x = e.clientX, y = e.clientY;
    if (pointer.active) {
      pointer.vx = clamp(x - pointer.lastX, -45, 45);
      pointer.vy = clamp(y - pointer.lastY, -45, 45);
      const speed = Math.hypot(pointer.vx, pointer.vy);
      if (speed > 2) disturb(x, y, Math.min(speed * .008, .3));
    }
    pointer.x = pointer.lastX = x;
    pointer.y = pointer.lastY = y;
    pointer.active = true;
  }

  function waveStep() {
    // Stable damped wave equation; borders absorb energy instead of reflecting it.
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        const laplacian = wave[i - 1] + wave[i + 1] + wave[i - cols] + wave[i + cols] - 4 * wave[i];
        nextWave[i] = (2 * wave[i] - previous[i] + .22 * laplacian) * .992;
      }
    }
    for (let x = 0; x < cols; x++) {
      nextWave[x] = nextWave[(rows - 1) * cols + x] = 0;
    }
    for (let y = 0; y < rows; y++) {
      nextWave[y * cols] = nextWave[y * cols + cols - 1] = 0;
    }
    const old = previous; previous = wave; wave = nextWave; nextWave = old;
    if (Math.random() < .014) {
      disturb(rand(width * .08, width * .92), rand(height * .12, height * .9), rand(.018, .055));
    }
  }

  // Stream-function flow: u = dψ/dy, v = -dψ/dx. Its smooth derivatives
  // reduce artificial sources/sinks and make currents bend around eddy cores.
  function flow(x, y, t) {
    const nx = x / Math.max(1, width), ny = y / Math.max(1, height);
    const a = ny * 5.3 + t * .00013;
    const b = nx * 7.1 - ny * 2.4 - t * .00009;
    let u = .18 * Math.sin(a) + .11 * Math.cos(b);
    let v = .08 * Math.sin(b) + .06 * Math.cos(a);
    for (const q of vortices) {
      const dx = nx - q.x, dy = ny - q.y;
      const r2 = dx * dx + dy * dy;
      const envelope = Math.exp(-r2 / (q.radius * q.radius));
      const strength = q.spin * envelope * .48;
      u += -dy * strength;
      v += dx * strength;
    }

    // Surface-wave slope adds local orbital motion, not just a brightness effect.
    const gx = clamp(Math.round(x / cell) + 1, 1, cols - 2);
    const gy = clamp(Math.round(y / cell) + 1, 1, rows - 2);
    const i = gy * cols + gx;
    const sx = wave[i + 1] - wave[i - 1];
    const sy = wave[i + cols] - wave[i - cols];
    u += sy * .08;
    v -= sx * .08;

    if (pointer.active) {
      const dx = x - pointer.x, dy = y - pointer.y, r2 = dx * dx + dy * dy;
      if (r2 < 190 * 190) {
        const influence = Math.exp(-r2 / 6800);
        u += (pointer.vx * .003 - dy * .00022) * influence;
        v += (pointer.vy * .003 + dx * .00022) * influence;
      }
    }
    return [u, v];
  }

  function moveParticles(t, dt) {
    for (const p of particles) {
      // Midpoint (RK2) integration follows curved currents more smoothly than
      // applying the velocity sampled only at the particle's starting point.
      const [u1, v1] = flow(p.x, p.y, t);
      const mx = p.x + u1 * dt * 16;
      const my = p.y + v1 * dt * 16;
      const [u2, v2] = flow(mx, my, t + dt * 500);
      const inertia = .9 + p.depth * .085;
      const drag = Math.pow(inertia, dt * 30);
      const buoyancy = (-.16 + p.depth * .08) * dt;
      p.vx = (p.vx + u2 * dt * 2.2) * drag;
      p.vy = (p.vy + v2 * dt * 2.2 + buoyancy) * drag;
      p.phase += dt * (1.4 + p.depth * 1.2);
      p.vx += Math.sin(p.phase + p.y * .01) * dt * .12;
      p.x += p.vx * dt * 30;
      p.y += p.vy * dt * 30;
      if (p.x < -8) p.x = width + 8;
      if (p.x > width + 8) p.x = -8;
      if (p.y < -8) { p.y = height + 8; p.x = rand(0, width); }
      if (p.y > height + 8) { p.y = -8; p.x = rand(0, width); }
    }
  }

  function drawCaustics(t) {
    ctx.lineWidth = .7;
    const yStep = finePointer.matches ? 2 : 3;
    const xStep = finePointer.matches ? 3 : 5;
    for (let y = 2; y < rows - 2; y += yStep) {
      for (let x = 2; x < cols - 2; x += xStep) {
        const i = y * cols + x;
        const gx = wave[i + 1] - wave[i - 1];
        const gy = wave[i + cols] - wave[i - cols];
        const energy = Math.abs(gx) + Math.abs(gy);
        if (energy < .008 || ((x * 13 + y * 7 + frame) % 13) > 2) continue;
        const px = (x - 1) * cell, py = (y - 1) * cell;
        ctx.strokeStyle = 'rgba(119,238,220,' + Math.min(.11, energy * 1.5) + ')';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + gx * 10 + Math.sin(t * .00018 + y) * 1.5, py + gy * 9);
        ctx.stroke();
      }
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    if (!reduced.matches) {
      accumulator = Math.min(accumulator, STEP * 2);
      while (accumulator >= STEP) { waveStep(); moveParticles(t, STEP); accumulator -= STEP; }
    }
    drawCaustics(t);
    for (const p of particles) {
      const gx = clamp(Math.round(p.x / cell) + 1, 1, cols - 2);
      const gy = clamp(Math.round(p.y / cell) + 1, 1, rows - 2);
      const shimmer = Math.abs(wave[gy * cols + gx] || 0);
      ctx.fillStyle = 'rgba(163,245,226,' + (p.alpha + Math.min(.1, shimmer * .25)) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      if (p.depth > .76 && !reduced.matches) {
        ctx.strokeStyle = 'rgba(121,221,215,' + (p.alpha * .2) + ')';
        ctx.lineWidth = .55; ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
        ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    }
    pointer.vx *= .8; pointer.vy *= .8;
    frame++;
  }

  let animationFrame = 0;
  let running = false;
  let lastDraw = 0;

  function tick(t) {
    if (!running || document.hidden || reduced.matches) {
      running = false;
      animationFrame = 0;
      return;
    }

    const elapsed = last ? Math.min((t - last) / 1000, .08) : 0;
    last = t;
    if (elapsed > 0) accumulator += elapsed;

    // Fine-pointer devices get the full 25fps decorative pass. Touch devices
    // use a lighter 15fps pass; gameplay itself runs independently.
    const drawInterval = finePointer.matches ? 40 : 66;
    if (t - lastDraw >= drawInterval) {
      lastDraw = t;
      draw(t);
    }
    animationFrame = requestAnimationFrame(tick);
  }

  function stopAnimation() {
    running = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function startAnimation() {
    if (running || document.hidden || reduced.matches) return;
    running = true;
    last = 0;
    lastDraw = 0;
    animationFrame = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', () => {
    resize();
    if (reduced.matches) draw(performance.now());
  }, { passive: true });
  if (finePointer.matches) window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', e => {
    if (finePointer.matches) {
      pointer.active = true; pointer.x = e.clientX; pointer.y = e.clientY;
      disturb(pointer.x, pointer.y, .18);
    }
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnimation();
    else if (reduced.matches) draw(performance.now());
    else startAnimation();
  });

  reduced.addEventListener?.('change', () => {
    stopAnimation();
    if (reduced.matches) draw(performance.now());
    else startAnimation();
  });

  resize();
  if (reduced.matches) draw(performance.now());
  else startAnimation();
})();
