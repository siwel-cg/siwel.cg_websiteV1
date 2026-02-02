/**
 * Circuit Board Noise Contours
 * Snaps gradient directions to integer vectors for angular lines
 */

function initFlowField() {
  const canvas = document.createElement('canvas');
  canvas.id = 'flow-field';
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    opacity: 0.5;
  `;
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let width, height;
  let time = 0;

  const CONFIG = {
    noiseScale: 0.003,
    levels: 14,
    lineWidth: 1,
    colors: [
      'rgba(123, 220, 255, 0.8)',  // cyan
      'rgba(192, 132, 252, 0.6)',  // violet
      'rgba(255, 184, 107, 0.5)',  // amber
    ]
  };

  // Permutation table for noise
  const perm = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = [...perm, ...perm];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  
  // Quantized gradient - only returns integer direction vectors
  function grad(hash, x, y, z) {
    const h = hash & 7;
    // 8 directions: cardinal + diagonal
    const dirs = [
      [1, 0], [1, 1], [0, 1], [-1, 1],
      [-1, 0], [-1, -1], [0, -1], [1, -1]
    ];
    const [dx, dy] = dirs[h];
    return dx * x + dy * y;
  }

  function noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const a = p[X] + Y, aa = p[a] + Z, ab = p[a + 1] + Z;
    const b = p[X + 1] + Y, ba = p[b] + Z, bb = p[b + 1] + Z;
    return lerp(w,
      lerp(v,
        lerp(u, grad(p[aa], x, y, z), grad(p[ba], x - 1, y, z)),
        lerp(u, grad(p[ab], x, y - 1, z), grad(p[bb], x - 1, y - 1, z))
      ),
      lerp(v,
        lerp(u, grad(p[aa + 1], x, y, z - 1), grad(p[ba + 1], x - 1, y, z - 1)),
        lerp(u, grad(p[ab + 1], x, y - 1, z - 1), grad(p[bb + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  // Marching squares for contours
  function getContourSegments(noiseGrid, gridW, gridH, threshold, step) {
    const segments = [];
    
    for (let y = 0; y < gridH - 1; y++) {
      for (let x = 0; x < gridW - 1; x++) {
        const tl = noiseGrid[y][x];
        const tr = noiseGrid[y][x + 1];
        const bl = noiseGrid[y + 1][x];
        const br = noiseGrid[y + 1][x + 1];

        let code = 0;
        if (tl >= threshold) code |= 8;
        if (tr >= threshold) code |= 4;
        if (br >= threshold) code |= 2;
        if (bl >= threshold) code |= 1;

        if (code === 0 || code === 15) continue;

        const lerpPos = (v1, v2) => (threshold - v1) / (v2 - v1);
        
        // Snap interpolation to create more angular lines
        const snap = (val) => Math.round(val * 2) / 2;
        
        const top = { x: x + snap(lerpPos(tl, tr)), y: y };
        const right = { x: x + 1, y: y + snap(lerpPos(tr, br)) };
        const bottom = { x: x + snap(lerpPos(bl, br)), y: y + 1 };
        const left = { x: x, y: y + snap(lerpPos(tl, bl)) };

        const toPixel = (pt) => ({ x: pt.x * step, y: pt.y * step });

        switch (code) {
          case 1: case 14: segments.push([toPixel(left), toPixel(bottom)]); break;
          case 2: case 13: segments.push([toPixel(bottom), toPixel(right)]); break;
          case 3: case 12: segments.push([toPixel(left), toPixel(right)]); break;
          case 4: case 11: segments.push([toPixel(top), toPixel(right)]); break;
          case 5:
            segments.push([toPixel(left), toPixel(top)]);
            segments.push([toPixel(bottom), toPixel(right)]);
            break;
          case 6: case 9: segments.push([toPixel(top), toPixel(bottom)]); break;
          case 7: case 8: segments.push([toPixel(left), toPixel(top)]); break;
          case 10:
            segments.push([toPixel(top), toPixel(right)]);
            segments.push([toPixel(left), toPixel(bottom)]);
            break;
        }
      }
    }
    return segments;
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function draw() {
    ctx.fillStyle = 'rgba(6, 7, 10, 1)';
    ctx.fillRect(0, 0, width, height);

    const step = 8;
    const gridW = Math.ceil(width / step) + 1;
    const gridH = Math.ceil(height / step) + 1;

    // Build noise grid
    const noiseGrid = [];
    for (let y = 0; y < gridH; y++) {
      noiseGrid[y] = [];
      for (let x = 0; x < gridW; x++) {
        noiseGrid[y][x] = noise(
          x * step * CONFIG.noiseScale,
          y * step * CONFIG.noiseScale,
          time
        );
      }
    }

    // Draw contours
    for (let i = 0; i < CONFIG.levels; i++) {
      const threshold = -0.6 + (i / CONFIG.levels) * 1.2;
      const segments = getContourSegments(noiseGrid, gridW, gridH, threshold, step);

      const colorIndex = i % CONFIG.colors.length;
      ctx.strokeStyle = CONFIG.colors[colorIndex];
      ctx.lineWidth = CONFIG.lineWidth;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';

      ctx.beginPath();
      segments.forEach(([p1, p2]) => {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      });
      ctx.stroke();
    }

    time += 0.001;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFlowField);
} else {
  initFlowField();
}