// Layered shadows, because one box-shadow never looks like a real shadow.
//
// Light falls off; a single shadow does not. Stacking five or six with growing
// blur and shrinking opacity is what separates "designed" from "has a shadow".
// The colour is tinted towards the surface hue rather than pure black, which is
// the other half of why default shadows look grey and dead.

import { hexToOklch, oklchToHex, toDisplayable, contrast, AA_TEXT } from './color.mjs';

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

// --- elevation on dark backgrounds -------------------------------------------
//
// Shadows are a light-mode idea. On a dark page a darker shadow lands on an
// already-dark background and does nothing at all — five elevation levels look
// like five identical flat rectangles, which is exactly the complaint every
// dark theme gets.
//
// What actually reads as "closer to the viewer" in the dark is a *lighter*
// surface. So elevation raises the surface instead, and the shadow becomes a
// faint supporting detail rather than the whole signal.


/**
 * The surface colour for a given elevation.
 *
 * In light mode this is the surface you passed in, unchanged — shadows already
 * do the job. In dark mode each level lifts the lightness a little, but never
 * so far that the text sitting on it stops clearing AA. Contrast wins over
 * depth every time; that is the entire premise of this library.
 */
export function elevationSurface(base, level, { dark = false, text = null } = {}) {
  if (!dark) return base;

  const step = LEVELS.indexOf(level);
  if (step <= 0) return base;

  const [L, C, h] = hexToOklch(base);
  // Roughly 3.5% lightness per rung. Enough to see, small enough that a card
  // three levels up does not look like a different theme.
  const lifted = oklchToHex(toDisplayable([Math.min(0.4, L + step * 0.035), C, h]));

  // If lifting the surface would push the text below AA, don't lift it. A
  // pretty elevation scale is not worth an unreadable card.
  if (text && contrast(text, lifted) < AA_TEXT) return base;
  return lifted;
}

export const allElevationSurfaces = (base, opts) =>
  Object.fromEntries(LEVELS.map((l) => [l, elevationSurface(base, l, opts)]));
