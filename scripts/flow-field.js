/**
 * Smooth Layered Contours
 * Simple perlin noise with filled bands fading to black
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
    noiseScale: 0.0012,
    levels: 24,
    resolution: 8,
  };

  // Colors cycling through accretion gradient
  const levelHighlights = [
    [130, 50, 45],    // coral
    [140, 100, 40],   // amber
    [45, 140, 160],   // cyan
    [80, 55, 115],    // violet
  ];

  // Perlin noise
  const perm = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = [...perm, ...perm];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  
  function grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
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

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function draw() {
    const res = CONFIG.resolution;
    const cols = Math.ceil(width / res);
    const rows = Math.ceil(height / res);
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let py = 0; py < rows; py++) {
      for (let px = 0; px < cols; px++) {
        const x = px * res;
        const y = py * res;
        
        const n = (noise(
          x * CONFIG.noiseScale,
          y * CONFIG.noiseScale,
          time
        ) + 1) / 2;

        const levelFloat = n * CONFIG.levels;
        const level = Math.min(Math.floor(levelFloat), CONFIG.levels - 1);
        const levelFrac = levelFloat - level;
        
        const highlight = levelHighlights[level % levelHighlights.length];
        
        const brightness = Math.pow(1 - levelFrac, 6);
        
        const r = Math.round(highlight[0] * brightness * 0.7);
        const g = Math.round(highlight[1] * brightness * 0.7);
        const b = Math.round(highlight[2] * brightness * 0.7);

        for (let dy = 0; dy < res && y + dy < height; dy++) {
          for (let dx = 0; dx < res && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    time += 0.0003;
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