// Colours have names because people cannot discuss hex codes.
//
// "Can we make it a bit less #4f76b6" is not a sentence anyone has said. Nobody
// remembers a hex code, nobody can picture one, and in a meeting they are
// actively hostile — you cannot point at a number and disagree with it.
//
// So: nearest match from a hand-written list, in OKLab, plus a modifier for how
// light and how saturated it is. `#4f76b6` becomes "Hydrangea". You can argue
// about Hydrangea.

import { hexToOklch, rgbToOklab, hexToRgb } from './color.mjs';

// Anchors chosen to be evocative and *spread out* — a dense list of near
// synonyms gives you "Cerulean" and "Cerulean Blue" for two colours nobody can
// tell apart, which is worse than no names at all.
const ANCHORS = [
  ['Ash', '#8b8f92'], ['Slate', '#5a6672'], ['Graphite', '#3c4147'], ['Soot', '#22262a'],
  ['Ink', '#12161c'], ['Pewter', '#a6adb4'], ['Chalk', '#e8eaec'], ['Paper', '#f7f5f0'],
  ['Bone', '#e6dfd2'], ['Linen', '#efe7da'],

  ['Rust', '#a6412a'], ['Terracotta', '#c56b4f'], ['Brick', '#8f3b2e'],
  ['Ember', '#d24b25'], ['Tangerine', '#f07514'], ['Apricot', '#f0a868'], ['Marmalade', '#e08a2c'],
  ['Amber', '#e0a020'], ['Honey', '#dbb64a'], ['Butter', '#f0d97a'], ['Mustard', '#c8a12a'],
  ['Ochre', '#b08030'],

  ['Olive', '#7a8034'], ['Moss', '#5c7042'], ['Fern', '#4e8656'], ['Sage', '#9aab90'],
  ['Pine', '#2c5344'], ['Emerald', '#0f8a5f'], ['Jade', '#3ba58a'], ['Mint', '#8fd6bd'],
  ['Seafoam', '#a8ded0'], ['Basil', '#3f7a3a'],

  ['Teal', '#1a7a8c'], ['Lagoon', '#2098ad'], ['Cyan', '#26bcd4'], ['Sky', '#7cc4e8'],
  ['Denim', '#3a6ea5'], ['Hydrangea', '#5478b8'], ['Cobalt', '#2b4fa8'], ['Navy', '#1e2f5c'],
  ['Midnight', '#161f38'], ['Cornflower', '#7a9ae0'], ['Powder', '#c4d8ee'],

  ['Iris', '#6a5acd'], ['Violet', '#7b4fbe'], ['Amethyst', '#9a6ec4'], ['Lilac', '#c3a8dd'],
  ['Plum', '#6b3a5e'], ['Mauve', '#a4788f'], ['Orchid', '#c469b0'], ['Fuchsia', '#d6399e'],
  ['Magenta', '#c62a86'],

  ['Rose', '#d4708a'], ['Blush', '#eeb4bb'], ['Coral', '#f0796b'], ['Salmon', '#ee9382'],
  ['Cherry', '#c31e3c'], ['Crimson', '#a81030'], ['Wine', '#701a34'], ['Oxblood', '#4e1520'],

  ['Cocoa', '#5a3f34'], ['Chestnut', '#7a4c34'], ['Camel', '#b98f60'], ['Sand', '#dcc9a8'],
  ['Taupe', '#a89a8c'], ['Mushroom', '#8a7f74'],
];

const ANCHOR_LAB = ANCHORS.map(([name, hex]) => ({ name, hex, lab: rgbToOklab(hexToRgb(hex)) }));

// Perceptual distance. Lightness is weighted down a little because a modifier
// ("Deep", "Pale") communicates that far better than picking a different name.
function distance(a, b) {
  return Math.hypot((a[0] - b[0]) * 0.7, a[1] - b[1], a[2] - b[2]);
}

/**
 * The nearest named colour, plus how far off it is. A large distance means the
 * name is a stretch and the caller may want to say so.
 */
export function nearestName(hex) {
  const lab = rgbToOklab(hexToRgb(hex));
  let best = ANCHOR_LAB[0];
  let bestD = Infinity;
  for (const a of ANCHOR_LAB) {
    const d = distance(lab, a.lab);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return { name: best.name, anchor: best.hex, distance: +bestD.toFixed(4) };
}

/**
 * A full name: modifier plus anchor. "Deep Hydrangea", "Pale Sage", "Muted Rust".
 *
 * The modifier is derived from the colour's own lightness and chroma relative
 * to the anchor it matched, so it says something true rather than decorative.
 */
export function name(hex) {
  const near = nearestName(hex);
  const [L, C] = hexToOklch(hex);
  const [aL, aC] = hexToOklch(near.anchor);

  const parts = [];
  const dL = L - aL;
  const dC = C - aC;

  if (dL > 0.14) parts.push('Pale');
  else if (dL > 0.06) parts.push('Light');
  else if (dL < -0.16) parts.push('Deep');
  else if (dL < -0.07) parts.push('Dark');

  // Only mention saturation when lightness has not already explained it —
  // "Pale Muted Sage" is three words doing one word's job.
  if (!parts.length) {
    if (dC > 0.06) parts.push('Vivid');
    else if (dC < -0.05) parts.push('Muted');
  }

  // Near-greys get named for what they are rather than pretending to be a hue.
  if (C < 0.02) {
    const greys = ['Ink', 'Soot', 'Graphite', 'Slate', 'Ash', 'Pewter', 'Chalk', 'Paper'];
    const idx = Math.min(greys.length - 1, Math.max(0, Math.round(L * (greys.length - 1))));
    return { hex, name: greys[idx], anchor: near.anchor, exact: false, grey: true };
  }

  const full = [...parts, near.name].join(' ');
  return {
    hex,
    name: full,
    anchor: near.anchor,
    // A close match is a name you can trust; a distant one is a label of
    // convenience, and honest tools say which they are giving you.
    exact: near.distance < 0.05,
    distance: near.distance,
    grey: false,
  };
}

/**
 * Name a whole palette, and make every name unique. Two roles called "Slate" in
 * the same table is worse than useless — it reads as a mistake.
 */
export function nameAll(colours) {
  const seen = new Map();
  return colours.map((hex) => {
    const n = name(hex);
    const count = seen.get(n.name) ?? 0;
    seen.set(n.name, count + 1);
    // Roman numerals rather than "Slate 2" — it reads as a deliberate scale
    // rather than a collision.
    const suffix = count ? ` ${['I', 'II', 'III', 'IV', 'V', 'VI'][count] ?? count + 1}` : '';
    return { ...n, name: n.name + suffix };
  });
}
