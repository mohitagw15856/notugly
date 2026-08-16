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

export const STYLES = [
  'face', 'pencil', 'specs', 'cat', 'ghost', 'sticker',
  'geometric', 'blob', 'pixel', 'rings', 'initials', 'isometric', 'bauhaus',
];

const hueOf = (p) => p.hue;

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


// --- hand-drawn helpers -----------------------------------------------------

// A line drawn by a person is never straight. Jittering the midpoint of every
// segment is the cheapest convincing version of that, and it is the whole
// difference between "SVG" and "sketch".
function wobble(c, pts, amount = 1.6) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2 + c.float(-amount, amount);
    const my = (y0 + y1) / 2 + c.float(-amount, amount);
    d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

// A circle that looks drawn rather than computed: eight points round a ring,
// each nudged, closed with quadratics.
function sketchCircle(c, cx, cy, r, amount = 1.5) {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const rr = r + c.float(-amount, amount);
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  });
  return wobble(c, pts, amount) + ' Z';
}

// Pencil people. Sketchy, warm, and deliberately imperfect — the closest thing
// here to something drawn in a notebook.
function pencil(seed, p) {
  const c = chance(`pencil:${seed}`);
  const ink = p.ink;
  const w = c.float(2.2, 3.2);
  const stroke = `fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

  const headR = c.float(17, 21);
  const headY = 38;
  const armY = c.float(62, 68);
  const armSpread = c.float(16, 26);
  const legSpread = c.float(9, 16);
  const hasGlasses = c.bool(0.35);
  const hair = c.weighted([['none', 3], ['tuft', 3], ['scribble', 3], ['bun', 2]]);
  const arms = c.weighted([['down', 3], ['wave', 3], ['up', 2]]);

  const armPath =
    arms === 'wave'
      ? `<path d="${wobble(c, [[50 - armSpread, armY + 6], [50, armY - 4]])}" ${stroke}/>
         <path d="${wobble(c, [[50, armY - 4], [50 + armSpread, armY - 16]])}" ${stroke}/>`
      : arms === 'up'
        ? `<path d="${wobble(c, [[50 - armSpread, armY - 14], [50, armY - 2]])}" ${stroke}/>
           <path d="${wobble(c, [[50, armY - 2], [50 + armSpread, armY - 14]])}" ${stroke}/>`
        : `<path d="${wobble(c, [[50 - armSpread, armY + 10], [50, armY - 2]])}" ${stroke}/>
           <path d="${wobble(c, [[50, armY - 2], [50 + armSpread, armY + 10]])}" ${stroke}/>`;

  const hairs = {
    none: '',
    tuft: `<path d="${wobble(c, [[50, headY - headR - 1], [52, headY - headR - 8], [46, headY - headR - 5]], 1)}" ${stroke}/>`,
    scribble: Array.from({ length: 4 }, (_, i) =>
      `<path d="${wobble(c, [[42 + i * 5, headY - headR + 1], [40 + i * 5, headY - headR - 7]], 1.2)}" ${stroke}/>`
    ).join(''),
    bun: `<path d="${sketchCircle(c, 50, headY - headR - 5, 5, 1)}" ${stroke}/>`,
  };

  return `
    <path d="${sketchCircle(c, 50, headY, headR)}" ${stroke}/>
    ${hairs[hair]}
    <circle cx="${50 - 6.5}" cy="${headY - 2}" r="${c.float(1.6, 2.4)}" fill="${ink}"/>
    <circle cx="${50 + 6.5}" cy="${headY - 2}" r="${c.float(1.6, 2.4)}" fill="${ink}"/>
    ${hasGlasses
      ? `<path d="${sketchCircle(c, 43.5, headY - 2, 6, 0.9)}" ${stroke}/>
         <path d="${sketchCircle(c, 56.5, headY - 2, 6, 0.9)}" ${stroke}/>
         <path d="${wobble(c, [[49.5, headY - 2], [50.5, headY - 2]], 0.5)}" ${stroke}/>`
      : ''}
    <path d="${wobble(c, [[50 - 5, headY + 7], [50, headY + 10], [50 + 5, headY + 7]], 1)}" ${stroke}/>
    <path d="${wobble(c, [[50, headY + headR], [50, armY + 14]])}" ${stroke}/>
    ${armPath}
    <path d="${wobble(c, [[50, armY + 14], [50 - legSpread, 88]])}" ${stroke}/>
    <path d="${wobble(c, [[50, armY + 14], [50 + legSpread, 88]])}" ${stroke}/>`;
}

// The one you asked for: a small round character whose entire personality is
// its glasses.
function specs(seed, p, _label, _backdrop) {
  const c = chance(`specs:${seed}`);
  const skin = oklchToHex(toDisplayable([c.float(0.78, 0.9), c.float(0.03, 0.07), c.pick([40, 55, 70, 25])]));
  const frame = c.pick([p.ink, p.mid, p.accent]);
  const lensR = c.float(11, 14);
  const gap = c.float(12, 15);
  const eyeR = c.float(2.6, 3.6);
  const blink = c.bool(0.16);
  const mouth = c.weighted([['smile', 5], ['line', 2], ['oh', 2], ['grin', 3]]);
  const hair = c.weighted([['flat', 3], ['side', 3], ['none', 2], ['curl', 2]]);
  const eyeY = 50;

  const mouths = {
    smile: `<path d="M44 66 q6 6 12 0" fill="none" stroke="${p.ink}" stroke-width="2.6" stroke-linecap="round"/>`,
    line: `<path d="M45 67 h10" stroke="${p.ink}" stroke-width="2.6" stroke-linecap="round"/>`,
    oh: `<ellipse cx="50" cy="67" rx="3.4" ry="4" fill="${p.ink}"/>`,
    grin: `<path d="M43 65 q7 8 14 0 z" fill="${p.ink}"/>`,
  };
  const hairs = {
    none: '',
    flat: `<path d="M28 34 q22 -14 44 0 q-22 -6 -44 0z" fill="${p.ink}"/>`,
    side: `<path d="M28 36 q10 -18 32 -14 q10 2 12 12 q-20 -10 -44 2z" fill="${p.ink}"/>`,
    curl: `<g fill="${p.ink}"><circle cx="36" cy="30" r="7"/><circle cx="50" cy="26" r="8"/><circle cx="64" cy="30" r="7"/></g>`,
  };

  return `
    <circle cx="50" cy="52" r="30" fill="${skin}"/>
    ${hairs[hair]}
    ${blink
      ? `<path d="M${50 - gap - 3} ${eyeY} q3 3 6 0" stroke="${p.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
         <path d="M${50 + gap - 3} ${eyeY} q3 3 6 0" stroke="${p.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${50 - gap}" cy="${eyeY}" r="${eyeR}" fill="${p.ink}"/>
         <circle cx="${50 + gap}" cy="${eyeY}" r="${eyeR}" fill="${p.ink}"/>`}
    <g fill="none" stroke="${frame}" stroke-width="${c.float(2.6, 3.6)}">
      <circle cx="${50 - gap}" cy="${eyeY}" r="${lensR}"/>
      <circle cx="${50 + gap}" cy="${eyeY}" r="${lensR}"/>
      <path d="M${50 - gap + lensR} ${eyeY} h${gap * 2 - lensR * 2}"/>
      <path d="M${50 - gap - lensR} ${eyeY - 1} l-6 -3"/>
      <path d="M${50 + gap + lensR} ${eyeY - 1} l6 -3"/>
    </g>
    ${mouths[mouth]}`;
}

// A cat, in as few marks as it can be made from.
function cat(seed, p, _label, _backdrop) {
  const c = chance(`cat:${seed}`);
  const fur = oklchToHex(toDisplayable([c.float(0.62, 0.86), c.float(0.04, 0.13), c.pick([35, 60, 250, 20])]));
  const eyeY = 52;
  const gap = c.float(11, 14);
  const closed = c.bool(0.3);
  return `
    <path d="M26 44 l4 -20 l17 10 z" fill="${fur}"/>
    <path d="M74 44 l-4 -20 l-17 10 z" fill="${fur}"/>
    <ellipse cx="50" cy="56" rx="27" ry="24" fill="${fur}"/>
    ${closed
      ? `<path d="M${50 - gap - 4} ${eyeY} q4 4 8 0" stroke="${p.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
         <path d="M${50 + gap - 4} ${eyeY} q4 4 8 0" stroke="${p.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="${50 - gap}" cy="${eyeY}" rx="3" ry="${c.float(4, 6)}" fill="${p.ink}"/>
         <ellipse cx="${50 + gap}" cy="${eyeY}" rx="3" ry="${c.float(4, 6)}" fill="${p.ink}"/>`}
    <path d="M47 63 l3 3 l3 -3 z" fill="${p.ink}"/>
    <path d="M50 66 q-4 4 -8 1 M50 66 q4 4 8 1" stroke="${p.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round" opacity=".7">
      <path d="M22 58 h9 M22 64 h9 M78 58 h-9 M78 64 h-9"/>
    </g>`;
}

// A friendly ghost. Nothing but a wobbly outline and two dots, which is the
// point — it is the least drawing that still reads as a character.
function ghost(seed, p, _label, backdrop = null) {
  const c = chance(`ghost:${seed}`);
  // A pale ghost on a pale sticker plate is an invisible ghost. Choose a body
  // that actually separates from whatever is behind it.
  const options = [p.light, p.mid, p.accent].filter(
    (col) => !backdrop || contrast(col, backdrop) >= 1.35
  );
  const body = c.pick(options.length ? options : [p.mid]);
  const bumps = c.int(3, 4);
  const bottom = 74;
  let d = `M28 52 a22 22 0 0 1 44 0 V${bottom}`;
  for (let i = 0; i < bumps; i++) {
    const step = 44 / bumps;
    d += ` q-${step / 4} ${i % 2 ? -7 : 7} -${step / 2} 0 q-${step / 4} ${i % 2 ? 7 : -7} -${step / 2} 0`;
  }
  d += ' Z';
  const eyeY = c.float(46, 52);
  return `
    <path d="${d}" fill="${body}"/>
    <circle cx="${50 - 8}" cy="${eyeY}" r="3.4" fill="${p.ink}"/>
    <circle cx="${50 + 8}" cy="${eyeY}" r="3.4" fill="${p.ink}"/>
    ${c.bool(0.5) ? `<path d="M45 ${eyeY + 10} q5 5 10 0" fill="none" stroke="${p.ink}" stroke-width="2.4" stroke-linecap="round"/>` : `<ellipse cx="50" cy="${eyeY + 11}" rx="3" ry="4" fill="${p.ink}"/>`}`;
}

// A die-cut sticker: whatever the face would be, with a thick white edge and a
// drop shadow. The format, not the drawing.
function sticker(seed, p) {
  const c = chance(`sticker:${seed}`);
  // The plate is what the character sits on, so it has to be passed down.
  const plate = p.light;
  const inner = c.pick([specs, cat, ghost])(seed, p, null, plate);
  return `
    <g transform="translate(50 50) scale(0.78) translate(-50 -50)">
      <circle cx="50" cy="50" r="46" fill="${plate}"/>
      <g>${inner}</g>
      <circle cx="50" cy="50" r="46" fill="none" stroke="${plate}" stroke-width="8"/>
      <circle cx="50" cy="50" r="49.5" fill="none" stroke="${p.ink}" stroke-width="1.5" stroke-opacity=".25"/>
    </g>`;
}

const RENDER = { face, pencil, specs, cat, ghost, sticker, geometric, blob, pixel, rings, initials, isometric, bauhaus };

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

  // Sketch styles want paper behind them; a saturated disc makes a pencil
  // drawing look like clip art.
  const paper = chosen === 'pencil' ? oklchToHex(toDisplayable([0.96, 0.012, hueOf(p)])) : p.bg;
  const body = `
    <rect width="100" height="100" fill="${paper}"/>
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
