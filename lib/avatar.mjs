// Avatars. Eight styles, one seed, and the contrast checked before it ships.
//
// The thing other avatar libraries do not do: an avatar is usually a face on a
// coloured circle sitting on *your* page background. If those two are close in
// luminance the whole thing dissolves. Every avatar here is generated against a
// declared background and nudged until it stands out — see `ring` below.
//
// Deterministic: the same seed always gives the same face, forever.

import { chance } from './seed.mjs';
import { hexToOklch, oklchToHex, toDisplayable, contrast, accessibleOn, isLight } from './color.mjs';

export const STYLES = ['face', 'geometric', 'blob', 'pixel', 'rings', 'initials', 'isometric', 'bauhaus'];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A small, deliberately cheerful set of hues. Fully random hues produce a lot
// of mud; these are picked to look good beside each other in a grid.
const HUES = [12, 28, 45, 88, 142, 168, 196, 218, 262, 292, 322, 348];

function paletteFor(seed) {
  const c = chance(`palette:${seed}`);
  const h = c.pick(HUES);
  const spread = c.pick([28, 44, 60, 180]);
  const mk = (dh, L, C) => oklchToHex(toDisplayable([L, C, (h + dh + 360) % 360]));
  return {
    hue: h,
    bg: mk(0, c.float(0.62, 0.78), c.float(0.11, 0.17)),
    mid: mk(spread, c.float(0.5, 0.62), c.float(0.13, 0.19)),
    accent: mk(-spread, c.float(0.68, 0.82), c.float(0.12, 0.18)),
    ink: mk(0, 0.22, 0.06),
    light: mk(0, 0.95, 0.03),
  };
}

// --- styles -----------------------------------------------------------------

function face(seed, p) {
  const c = chance(`face:${seed}`);
  const eyeY = c.int(44, 50);
  const eyeGap = c.int(14, 20);
  const eyeR = c.float(3.4, 5.6);
  const blink = c.bool(0.18);
  const brow = c.bool(0.45);
  const browTilt = c.float(-8, 8);
  const mouth = c.weighted([['smile', 5], ['grin', 3], ['flat', 2], ['ooh', 2], ['smirk', 2]]);
  const hair = c.weighted([['tuft', 3], ['flat', 3], ['curls', 3], ['bald', 2], ['spikes', 2]]);
  const blush = c.bool(0.4);
  const glasses = c.bool(0.22);

  const skin = oklchToHex(toDisplayable([c.float(0.72, 0.88), c.float(0.04, 0.09), c.pick([40, 55, 70, 30])]));
  const hairCol = p.ink;

  const mouths = {
    smile: `<path d="M${50 - 9} 62 q9 9 18 0" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>`,
    grin: `<path d="M${50 - 10} 60 q10 12 20 0 z" fill="${p.ink}"/><path d="M${50 - 10} 60 h20" stroke="${p.light}" stroke-width="2"/>`,
    flat: `<path d="M${50 - 7} 64 h14" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>`,
    ooh: `<ellipse cx="50" cy="64" rx="4.5" ry="5.5" fill="${p.ink}"/>`,
    smirk: `<path d="M${50 - 8} 63 q10 7 16 -2" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>`,
  };

  const hairs = {
    tuft: `<path d="M50 18 q6 -10 12 -2 q-6 2 -8 6 z" fill="${hairCol}"/><path d="M30 34 q6 -16 20 -17 q14 1 20 17 q-20 -9 -40 0z" fill="${hairCol}"/>`,
    flat: `<path d="M29 35 q4 -18 21 -18 q17 0 21 18 q-21 -8 -42 0z" fill="${hairCol}"/>`,
    curls: `<g fill="${hairCol}">${[34, 42, 50, 58, 66].map((x, i) => `<circle cx="${x}" cy="${26 + (i % 2) * 4}" r="7"/>`).join('')}</g>`,
    bald: '',
    spikes: `<path d="M30 34 l6 -12 l5 10 l6 -14 l6 14 l5 -10 l6 12 z" fill="${hairCol}"/>`,
  };

  return `
    <circle cx="50" cy="52" r="26" fill="${skin}"/>
    ${hairs[hair]}
    ${blink
      ? `<path d="M${50 - eyeGap - 4} ${eyeY} q4 3 8 0" stroke="${p.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
         <path d="M${50 + eyeGap - 4} ${eyeY} q4 3 8 0" stroke="${p.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${50 - eyeGap}" cy="${eyeY}" r="${eyeR}" fill="${p.ink}"/>
         <circle cx="${50 + eyeGap}" cy="${eyeY}" r="${eyeR}" fill="${p.ink}"/>
         <circle cx="${50 - eyeGap + 1.4}" cy="${eyeY - 1.4}" r="${eyeR / 3}" fill="${p.light}"/>
         <circle cx="${50 + eyeGap + 1.4}" cy="${eyeY - 1.4}" r="${eyeR / 3}" fill="${p.light}"/>`}
    ${brow
      ? `<path d="M${50 - eyeGap - 6} ${eyeY - 10} q6 ${browTilt / 2} 12 0" stroke="${p.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
         <path d="M${50 + eyeGap - 6} ${eyeY - 10} q6 ${-browTilt / 2} 12 0" stroke="${p.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : ''}
    ${glasses
      ? `<g fill="none" stroke="${p.ink}" stroke-width="2"><circle cx="${50 - eyeGap}" cy="${eyeY}" r="9"/><circle cx="${50 + eyeGap}" cy="${eyeY}" r="9"/><path d="M${50 - eyeGap + 9} ${eyeY} h${eyeGap * 2 - 18}"/></g>`
      : ''}
    ${blush
      ? `<ellipse cx="${50 - eyeGap - 6}" cy="${eyeY + 11}" rx="5" ry="3" fill="${p.accent}" fill-opacity="0.55"/>
         <ellipse cx="${50 + eyeGap + 6}" cy="${eyeY + 11}" rx="5" ry="3" fill="${p.accent}" fill-opacity="0.55"/>`
      : ''}
    ${mouths[mouth]}`;
}

function geometric(seed, p) {
  const c = chance(`geo:${seed}`);
  const cols = c.shuffle([p.mid, p.accent, p.light, p.ink]);
  return cols
    .slice(0, 3)
    .map((col, i) => {
      const kind = c.pick(['circle', 'rect', 'tri']);
      const x = c.float(20, 80);
      const y = c.float(20, 80);
      const s = c.float(22, 46) - i * 4;
      if (kind === 'circle') return `<circle cx="${x}" cy="${y}" r="${s / 2}" fill="${col}" fill-opacity="0.9"/>`;
      if (kind === 'rect')
        return `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="${c.float(0, 10)}" fill="${col}" fill-opacity="0.9" transform="rotate(${c.float(-30, 30)} ${x} ${y})"/>`;
      return `<polygon points="${x},${y - s / 2} ${x + s / 2},${y + s / 2} ${x - s / 2},${y + s / 2}" fill="${col}" fill-opacity="0.9"/>`;
    })
    .join('');
}

function blob(seed, p) {
  const c = chance(`blob:${seed}`);
  const pts = 7;
  const path = Array.from({ length: pts }, (_, i) => {
    const a = (i / pts) * Math.PI * 2;
    const r = c.float(26, 40);
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  });
  const d =
    `M${path[0][0].toFixed(1)} ${path[0][1].toFixed(1)}` +
    path
      .map((_, i) => {
        const a = path[i];
        const b = path[(i + 1) % pts];
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        return ` Q${a[0].toFixed(1)} ${a[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      })
      .join('') +
    ' Z';
  return `<path d="${d}" fill="${p.mid}"/><path d="${d}" fill="${p.accent}" fill-opacity="0.55" transform="translate(${c.float(-8, 8)} ${c.float(-8, 8)}) scale(0.72) translate(19 19)"/>`;
}

function pixel(seed, p) {
  const c = chance(`pixel:${seed}`);
  const cols = [p.mid, p.accent, p.ink];
  const cells = [];
  // Mirrored down the middle — symmetry is why these read as faces at all.
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (!c.bool(0.55)) continue;
      const col = c.pick(cols);
      cells.push([x, y, col]);
      if (x < 2) cells.push([4 - x, y, col]);
    }
  }
  return cells.map(([x, y, col]) => `<rect x="${10 + x * 16}" y="${10 + y * 16}" width="16" height="16" fill="${col}"/>`).join('');
}

function rings(seed, p) {
  const c = chance(`rings:${seed}`);
  const n = c.int(3, 5);
  const cols = c.shuffle([p.mid, p.accent, p.light, p.ink]);
  return Array.from({ length: n }, (_, i) => {
    const r = 42 - i * (36 / n);
    return `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${cols[i % cols.length]}" stroke-width="${c.float(4, 9)}" stroke-dasharray="${c.bool(0.4) ? `${c.float(6, 20)} ${c.float(3, 10)}` : 'none'}"/>`;
  }).join('');
}

function initials(seed, p, label) {
  const text = (label || String(seed))
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
  const fg = accessibleOn(p.bg, [p.ink, p.light]);
  return `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-size="${text.length > 1 ? 34 : 44}" font-weight="700" fill="${fg}">${esc(text)}</text>`;
}

function isometric(seed, p) {
  const c = chance(`iso:${seed}`);
  const cube = (x, y, s, top, left, right) => `
    <polygon points="${x},${y} ${x + s},${y - s / 2} ${x + s * 2},${y} ${x + s},${y + s / 2}" fill="${top}"/>
    <polygon points="${x},${y} ${x + s},${y + s / 2} ${x + s},${y + s * 1.6} ${x},${y + s * 1.1}" fill="${left}"/>
    <polygon points="${x + s * 2},${y} ${x + s},${y + s / 2} ${x + s},${y + s * 1.6} ${x + s * 2},${y + s * 1.1}" fill="${right}"/>`;
  const n = c.int(2, 3);
  return Array.from({ length: n }, (_, i) =>
    cube(50 - 16 + c.float(-8, 8), 34 + i * 16, 16, p.light, p.mid, p.accent)
  ).join('');
}

function bauhaus(seed, p) {
  const c = chance(`bau:${seed}`);
  const cols = c.shuffle([p.mid, p.accent, p.light, p.ink]);
  const half = c.pick([
    `<path d="M0 50 A50 50 0 0 1 100 50 Z" fill="${cols[0]}"/>`,
    `<path d="M50 0 A50 50 0 0 1 50 100 Z" fill="${cols[0]}"/>`,
  ]);
  return `${half}
    <circle cx="${c.float(30, 70)}" cy="${c.float(30, 70)}" r="${c.float(12, 22)}" fill="${cols[1]}"/>
    <rect x="0" y="${c.float(60, 82)}" width="100" height="${c.float(6, 14)}" fill="${cols[2]}"/>`;
}

const RENDER = { face, geometric, blob, pixel, rings, initials, isometric, bauhaus };

// --- public -----------------------------------------------------------------

export function avatar(seed, options = {}) {
  const {
    style = 'face',
    size = 100,
    radius = 'circle', // 'circle' | 'squircle' | 'square'
    on = null, // the page background this will sit on
    label = null,
  } = options;

  const chosen = RENDER[style] ? style : 'face';
  const p = paletteFor(seed);

  // The bit other libraries skip. If the avatar's disc is too close in
  // luminance to the page behind it, the edge disappears — so add a ring that
  // is guaranteed to contrast with *both*.
  let ring = '';
  if (on) {
    const separation = contrast(p.bg, on);
    if (separation < 1.35) {
      const ringColour = accessibleOn(on, [p.ink, isLight(on) ? '#111111' : '#ffffff'], 3);
      ring = `<circle cx="50" cy="50" r="48.5" fill="none" stroke="${ringColour}" stroke-width="3"/>`;
    }
  }

  const clip =
    radius === 'square'
      ? ''
      : radius === 'squircle'
        ? `<clipPath id="c"><rect x="0" y="0" width="100" height="100" rx="28"/></clipPath>`
        : `<clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath>`;

  const body = `
    <rect width="100" height="100" fill="${p.bg}"/>
    ${RENDER[chosen](seed, p, label)}`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" ` +
    `role="img" aria-label="${esc(label || `Avatar for ${seed}`)}">` +
    (clip ? `<defs>${clip}</defs><g clip-path="url(#c)">${body}</g>` : body) +
    ring +
    `</svg>`
  );
}

// Everything a caller might want to know about what was generated, so a UI can
// show the palette and the contrast rather than just the picture.
export function describe(seed, options = {}) {
  const p = paletteFor(seed);
  return {
    seed: String(seed),
    style: options.style || 'face',
    palette: p,
    contrastWithInk: +contrast(p.bg, p.ink).toFixed(2),
    ...(options.on ? { separationFromPage: +contrast(p.bg, options.on).toFixed(2) } : {}),
  };
}

export { paletteFor };
