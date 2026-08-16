// Blobs, dividers and edges. The organic bits that make a layout feel drawn
// rather than assembled from rectangles.

import { chance } from './seed.mjs';

export const DIVIDERS = ['wave', 'tilt', 'curve', 'arrow', 'torn', 'steps'];

// A closed blob path with smooth joins. Points on a jittered circle, joined
// with quadratics through their midpoints, which is what keeps it smooth
// without needing bezier control-point maths.
export function blob(seed, { points = 7, jitter = 0.22, size = 200 } = {}) {
  const c = chance(`blob:${seed}`);
  const r = size / 2.6;
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const rad = r * (1 + c.float(-jitter, jitter));
    return [size / 2 + rad * Math.cos(a), size / 2 + rad * Math.sin(a)];
  });

  let d = `M${((pts[0][0] + pts[1][0]) / 2).toFixed(1)} ${((pts[0][1] + pts[1][1]) / 2).toFixed(1)}`;
  for (let i = 1; i <= points; i++) {
    const cur = pts[i % points];
    const nxt = pts[(i + 1) % points];
    d += ` Q${cur[0].toFixed(1)} ${cur[1].toFixed(1)} ${((cur[0] + nxt[0]) / 2).toFixed(1)} ${((cur[1] + nxt[1]) / 2).toFixed(1)}`;
  }
  d += ' Z';

  return {
    d,
    size,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><path d="${d}" fill="currentColor"/></svg>`,
    // A clip-path is the useful export: apply it to an image and it becomes a blob.
    clipPath: `clip-path: path('${d}');`,
  };
}

export function divider(kind = 'wave', { width = 1440, height = 80, flip = false, seed = 'a' } = {}) {
  const c = chance(`div:${seed}:${kind}`);
  const w = width;
  const h = height;

  const paths = {
    wave: `M0 ${h * 0.5} q${w * 0.25} -${h * 0.55} ${w * 0.5} 0 t${w * 0.5} 0 V${h} H0 Z`,
    tilt: `M0 ${h} L${w} 0 V${h} Z`,
    curve: `M0 ${h} Q${w / 2} -${h * 0.4} ${w} ${h} Z`,
    arrow: `M0 0 L${w / 2} ${h} L${w} 0 V${h} H0 Z`,
    steps: Array.from({ length: 6 }, (_, i) => `M${(w / 6) * i} ${h - (h / 6) * i} h${w / 6} v${h} h-${w / 6} Z`).join(' '),
    torn: `M0 ${h * 0.6} ${Array.from({ length: 12 }, (_, i) => `L${(w / 12) * (i + 1)} ${h * c.float(0.35, 0.85)}`).join(' ')} V${h} H0 Z`,
  };

  const d = paths[kind] || paths.wave;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"${flip ? ' transform="scale(1,-1)"' : ''}>` +
    `<path d="${d}" fill="currentColor"/></svg>`;
  return { kind, d, svg };
}
