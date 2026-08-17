// One product, several brands: whitelabel and multi-tenant design systems.
//
// `team.mjs` solved "one seed, many people, all visually distinct, all
// obviously the same company." This solves the adjacent problem an agency or
// platform actually has: one product, several client brand colours, each
// locked exactly as given — that's the entire point of a brand lock, see
// `system.mjs` — but sharing every decision that ISN'T the brand colour, so
// switching tenants doesn't also quietly switch the typeface or the corner
// radius. And because a brand colour is handed to you, not chosen by you,
// two clients can hand you near-identical reds without anyone noticing until
// a support ticket says "which environment am I even in" — so that gets
// checked the same way `teamDistinct` checks people.

import { system, audit } from './system.mjs';
import { hexToOklch } from './color.mjs';

/**
 * @param {string} seed    shared across every brand — type, radius, motion,
 *                          pattern and vibe all come from here
 * @param {string[]} hexes one locked brand colour per tenant
 */
export function brandSet(seed, hexes, { vibe = 'editorial', dark = false } = {}) {
  const tenants = hexes.map((hex) => {
    const sys = system(seed, { vibe, dark, brand: hex });
    return { brand: hex, system: sys, audit: audit(sys) };
  });
  return { seed, vibe, dark, tenants };
}

/** Are any two brand colours close enough in hue to be mistaken for the
 * same tenant? Same threshold and maths as `teamDistinct` in team.mjs. */
export function brandDistinct(result) {
  const clashes = [];
  const list = result.tenants;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i].brand;
      const b = list[j].brand;
      const gap = Math.abs(((hexToOklch(a)[2] - hexToOklch(b)[2] + 540) % 360) - 180);
      if (gap < 14) clashes.push({ a, b, degrees: +gap.toFixed(1) });
    }
  }
  return { passed: clashes.length === 0, clashes };
}
