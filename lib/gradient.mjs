// Mesh and aurora gradients, exported as CSS or SVG — never as a PNG.
//
// The usual mesh-gradient tool hands you a 400 kB image. This hands you four
// radial-gradients in a background shorthand, which scales to any size, weighs
// a few hundred bytes, and can be recoloured by changing a variable.

import { chance } from './seed.mjs';
import { oklchToHex, toDisplayable, hexToOklch } from './color.mjs';

export const KINDS = ['aurora', 'mesh', 'sunrise', 'duotone', 'spotlight'];

// Hues that sit well together. Random hue pairs go muddy far more often than
// people expect, so the relationships are chosen rather than rolled.
const HARMONY = {
  analogous: [0, 28, 56],
  triad: [0, 120, 240],
  split: [0, 150, 210],
  near: [0, 14, 30],
};

export function gradient(seed, { kind = 'aurora', base = null, dark = false } = {}) {
  const c = chance(`grad:${seed}:${kind}`);
  const rootHue = base ? hexToOklch(base)[2] : c.float(0, 360);
  const rel = HARMONY[c.pick(Object.keys(HARMONY))];
  const L = dark ? c.float(0.34, 0.46) : c.float(0.72, 0.86);
  const C = c.float(0.11, 0.19);

  const stops = rel.map((dh, i) =>
    oklchToHex(toDisplayable([L + (i - 1) * 0.05, C * (1 - i * 0.12), (rootHue + dh) % 360]))
  );
  const bg = oklchToHex(toDisplayable([dark ? 0.16 : 0.97, 0.02, rootHue]));

  const blobs = stops.map((col, i) => ({
    color: col,
    x: c.float(5, 95),
    y: c.float(5, 95),
    size: c.float(45, 95),
  }));

  // A background shorthand: several radial gradients stacked over a base
  // colour. No image, no runtime, resolution independent.
  const layers = blobs
    .map((b) => `radial-gradient(${b.size.toFixed(0)}% ${b.size.toFixed(0)}% at ${b.x.toFixed(0)}% ${b.y.toFixed(0)}%, ${b.color} 0%, transparent 60%)`)
    .join(',\n    ');

  const css = `background-color: ${bg};\n  background-image:\n    ${layers};`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">` +
    `<defs>${blobs
      .map(
        (b, i) =>
          `<radialGradient id="g${i}" cx="${b.x}%" cy="${b.y}%" r="${b.size}%">` +
          `<stop offset="0" stop-color="${b.color}"/><stop offset="1" stop-color="${b.color}" stop-opacity="0"/></radialGradient>`
      )
      .join('')}</defs>` +
    `<rect width="100" height="100" fill="${bg}"/>` +
    blobs.map((_, i) => `<rect width="100" height="100" fill="url(#g${i})"/>`).join('') +
    `</svg>`;

  return { kind, base: bg, stops, blobs, css, svg };
}
