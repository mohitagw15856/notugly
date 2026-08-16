// Layered shadows, because one box-shadow never looks like a real shadow.
//
// Light falls off; a single shadow does not. Stacking five or six with growing
// blur and shrinking opacity is what separates "designed" from "has a shadow".
// The colour is tinted towards the surface hue rather than pure black, which is
// the other half of why default shadows look grey and dead.

import { hexToOklch, oklchToHex, toDisplayable } from './color.mjs';

export const LEVELS = ['flat', 'low', 'medium', 'high', 'floating'];

const SPEC = {
  flat: { layers: 1, spread: 1, alpha: 0.06 },
  low: { layers: 3, spread: 2, alpha: 0.08 },
  medium: { layers: 4, spread: 5, alpha: 0.09 },
  high: { layers: 5, spread: 10, alpha: 0.1 },
  floating: { layers: 6, spread: 20, alpha: 0.11 },
};

export function shadow(level = 'medium', { hue = 250, tint = 0.4, dark = false } = {}) {
  const s = SPEC[level] || SPEC.medium;
  // Tinting the shadow towards the surface's hue is what stops it reading as
  // dirt on the screen.
  const [, , h] = [0, 0, hue];
  const col = oklchToHex(toDisplayable([dark ? 0.06 : 0.18, 0.05 * tint, h]));
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16));

  const layers = Array.from({ length: s.layers }, (_, i) => {
    const t = (i + 1) / s.layers;
    const y = +(s.spread * t * t * 1.6).toFixed(1);
    const blur = +(s.spread * t * 3).toFixed(1);
    const alpha = +(s.alpha * (1 - t * 0.55)).toFixed(3);
    return `0 ${y}px ${blur}px rgba(${r}, ${g}, ${b}, ${alpha})`;
  });

  return { level, css: `box-shadow:\n    ${layers.join(',\n    ')};`, layers, colour: col };
}

export const allShadows = (opts) => Object.fromEntries(LEVELS.map((l) => [l, shadow(l, opts)]));
