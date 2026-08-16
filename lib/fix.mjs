// The smallest tool here and probably the most used.
//
// You have two colours. They fail. You do not want a new palette, a new brand,
// or a lecture — you want the nearest colour to the one you already picked that
// passes. That is a one-dimensional search and every contrast checker on the
// internet makes you do it by hand, nudging a slider and re-reading the number.

import { hexToOklch, oklchToHex, toDisplayable, contrast, AA_TEXT, AA_LARGE, AAA_TEXT, rate } from './color.mjs';
import { apca, apcaAdvice } from './apca.mjs';

/**
 * Move `fg` as little as possible until it clears `target` against `bg`.
 * Lightness only — hue and chroma are what make it *your* colour, so they stay.
 *
 * Returns the original untouched if it already passes.
 */
export function fixContrast(fg, bg, { target = AA_TEXT, move = 'fg' } = {}) {
  // Named after what moves, not what stays. "Fix the contrast" nearly always
  // means "change the text" — the background is usually someone else's
  // decision — so that is the default.
  const moving = move === 'bg' ? bg : fg;
  const fixed = move === 'bg' ? fg : bg;
  const start = contrast(fg, bg);
  if (start >= target) {
    return { changed: false, from: moving, to: moving, before: +start.toFixed(2), after: +start.toFixed(2) };
  }

  const [L, C, h] = hexToOklch(moving);

  // Search outward in both directions at once and take whichever passes first.
  // Going the "obvious" way is wrong surprisingly often — a mid-grey on a
  // mid-blue can be cheaper to fix by getting lighter even when instinct says
  // darker.
  let best = null;
  for (let step = 0.005; step <= 1; step += 0.005) {
    for (const dir of [-1, 1]) {
      const candidateL = L + dir * step;
      if (candidateL < 0 || candidateL > 1) continue;
      const candidate = oklchToHex(toDisplayable([candidateL, C, h]));
      const ratio = contrast(candidate, fixed);
      if (ratio >= target) {
        best = { candidate, ratio, distance: step };
        break;
      }
    }
    if (best) break;
  }

  // Nothing in this hue works — which happens for a mid-chroma colour against a
  // mid-grey. Then, and only then, give up the chroma.
  if (!best) {
    for (const fallback of ['#ffffff', '#000000']) {
      const ratio = contrast(fallback, fixed);
      if (ratio >= target) {
        best = { candidate: fallback, ratio, distance: 1, desaturated: true };
        break;
      }
    }
  }

  if (!best) {
    return {
      changed: false,
      impossible: true,
      from: moving,
      to: moving,
      before: +start.toFixed(2),
      after: +start.toFixed(2),
      says: `Nothing clears ${target}:1 against ${fixed}. That background is the problem, not the text.`,
    };
  }

  return {
    changed: true,
    from: moving,
    to: best.candidate,
    before: +start.toFixed(2),
    after: +best.ratio.toFixed(2),
    // How far it actually moved, in a unit that means something perceptually.
    moved: +best.distance.toFixed(3),
    desaturated: Boolean(best.desaturated),
    says: best.desaturated
      ? `Had to drop the hue entirely — ${moving} cannot reach ${target}:1 on ${fixed} at any lightness.`
      : `${moving} → ${best.candidate}. Same hue, ${best.distance < 0.06 ? 'barely' : 'noticeably'} different lightness.`,
  };
}

/** Everything worth knowing about one pairing, in both contrast models. */
export function inspect(fg, bg) {
  const ratio = +contrast(fg, bg).toFixed(2);
  const lc = apca(fg, bg);
  return {
    fg,
    bg,
    wcag: { ratio, grade: rate(ratio), aa: ratio >= AA_TEXT, aaLarge: ratio >= AA_LARGE, aaa: ratio >= AAA_TEXT },
    apca: apcaAdvice(lc),
    fixes: {
      aaLarge: fixContrast(fg, bg, { target: AA_LARGE }),
      aa: fixContrast(fg, bg, { target: AA_TEXT }),
      aaa: fixContrast(fg, bg, { target: AAA_TEXT }),
    },
  };
}
