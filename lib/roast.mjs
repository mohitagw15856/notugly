// Tells you what is wrong with your design, rudely, with numbers.
//
// Every accessibility tool phrases its findings like a compliance document —
// "Element does not meet minimum contrast requirements (1.4.3 AA)" — and the
// result is that nobody reads them and nothing gets fixed. A specific insult
// with a specific number attached gets fixed the same afternoon.
//
// Every line here is earned from a measurement. There are no generic burns.

import { hexToOklch, contrast, luminance, AA_TEXT } from './color.mjs';
import { apca } from './apca.mjs';
import { collisions } from './vision.mjs';
import { checkPrint } from './print.mjs';
import { fixContrast } from './fix.mjs';

const pct = (n) => `${Math.round(n * 100)}%`;

/**
 * Roast a palette. `colours` is a list of hex strings; the first is assumed to
 * be the background if `bg` isn't given, because that is how people paste them.
 */
export function roast(colours, { bg = null, fonts = [], radii = [] } = {}) {
  const list = [...new Set(colours.filter((c) => /^#[0-9a-f]{6}$/i.test(c)))];
  const burns = [];
  const background = bg || list.find((c) => luminance(c) > 0.7) || list[0];

  if (list.length === 0) {
    return { score: 0, burns: [{ says: 'There are no colours here at all. Bold.', severity: 0 }], verdict: 'Nothing to judge.' };
  }

  // --- too many nearly-identical greys ---------------------------------------
  const greys = list.filter((c) => hexToOklch(c)[1] < 0.03);
  if (greys.length >= 4) {
    const pairs = [];
    for (let i = 0; i < greys.length; i++)
      for (let j = i + 1; j < greys.length; j++)
        if (contrast(greys[i], greys[j]) < 1.15) pairs.push([greys[i], greys[j]]);
    if (pairs.length) {
      burns.push({
        severity: 2,
        says: `${greys.length} greys, and ${pairs.length} of those pairs are indistinguishable. ${pairs[0][0]} and ${pairs[0][1]} are the same grey wearing a hat.`,
        evidence: pairs.slice(0, 3),
      });
    }
  }

  // --- unreadable text -------------------------------------------------------
  const unreadable = list
    .filter((c) => c !== background)
    .map((c) => ({ c, ratio: contrast(c, background), lc: apca(c, background) }))
    .filter((r) => r.ratio < AA_TEXT)
    .sort((a, b) => a.ratio - b.ratio);

  if (unreadable.length) {
    const worst = unreadable[0];
    const fix = fixContrast(worst.c, background);
    burns.push({
      severity: 4,
      says: `${worst.c} on ${background} is ${worst.ratio.toFixed(2)}:1. You need 4.5. That is not a colour, that is a rumour of a colour.`,
      fix: fix.changed ? `${fix.to} would clear it, and it is still the same hue.` : null,
      evidence: unreadable.slice(0, 4).map((u) => [u.c, +u.ratio.toFixed(2)]),
    });
  }

  // --- everything at maximum saturation --------------------------------------
  const hot = list.filter((c) => hexToOklch(c)[1] > 0.18);
  if (hot.length >= 3) {
    burns.push({
      severity: 2,
      says: `${hot.length} colours at near-maximum saturation. Nothing can be emphasis when everything is. Pick one thing to shout.`,
      evidence: hot.slice(0, 4),
    });
  }

  // --- colours that merge for a lot of people --------------------------------
  // Sorted by how many people it affects, not by how dramatic it looks —
  // a deuteranopia collision matters roughly 600× more than a tritan one.
  const RANK = { deuteranopia: 0, protanopia: 1, tritanopia: 2, achromatopsia: 3 };
  const merge = collisions(list).sort((a, b) => RANK[a.kind] - RANK[b.kind] || a.after - b.after);
  if (merge.length) {
    const m = merge[0];
    burns.push({
      severity: 3,
      says: `${m.pair[0]} and ${m.pair[1]} are the same colour to anyone with ${m.kind} — ${m.prevalence}. If one of those means "error", that is a real bug.`,
      evidence: merge.slice(0, 3),
    });
  }

  // --- a hue that is doing nothing -------------------------------------------
  const hues = list.filter((c) => hexToOklch(c)[1] > 0.05).map((c) => Math.round(hexToOklch(c)[2]));
  const distinct = [...new Set(hues.map((h) => Math.round(h / 30)))];
  if (distinct.length > 4) {
    burns.push({
      severity: 2,
      says: `${distinct.length} unrelated hues. This is not a palette, it is a bag of markers.`,
      evidence: hues,
    });
  }

  // --- print -----------------------------------------------------------------
  const unprintable = list.filter((c) => !checkPrint(c).shift.inGamut);
  if (unprintable.length >= 2) {
    burns.push({
      severity: 1,
      says: `${unprintable.length} of these do not exist in CMYK. Fine on screen, a disappointment on a business card.`,
      evidence: unprintable.slice(0, 4),
    });
  }

  // --- fonts -----------------------------------------------------------------
  const families = [...new Set(fonts.map((f) => String(f).split(',')[0].replace(/["']/g, '').trim()).filter(Boolean))];
  if (families.length > 3) {
    burns.push({
      severity: 2,
      says: `${families.length} typefaces: ${families.slice(0, 4).join(', ')}. Two is a decision. ${families.length} is an accident.`,
      evidence: families,
    });
  }

  // --- radii -----------------------------------------------------------------
  const rs = [...new Set(radii.map((r) => parseFloat(r)).filter((n) => Number.isFinite(n) && n > 0 && n < 100))];
  if (rs.length > 4) {
    burns.push({
      severity: 1,
      says: `${rs.length} different corner radii (${rs.slice(0, 5).join('px, ')}px…). Nobody chose these. They accumulated.`,
      evidence: rs,
    });
  }

  if (!burns.length) {
    burns.push({ severity: 0, says: 'Genuinely fine. Annoying, but fine.' });
  }

  // Score out of 100, weighted by how bad each finding is. Unreadable text
  // costs far more than an untidy radius scale, because it should.
  const damage = burns.reduce((sum, b) => sum + b.severity ** 2 * 4, 0);
  const score = Math.max(0, Math.min(100, 100 - damage));

  return {
    score,
    burns: burns.sort((a, b) => b.severity - a.severity),
    verdict:
      score >= 90 ? 'Not ugly.'
      : score >= 70 ? 'Mildly ugly.'
      : score >= 40 ? 'Ugly.'
      : score >= 15 ? 'Quite ugly.'
      : 'Spectacularly ugly. Genuinely impressive.',
    checked: list.length,
  };
}

/** Roast whatever `extract()` pulled off a real site. */
export function roastDna(dna) {
  return roast(dna.colours?.map((c) => (typeof c === 'string' ? c : c.hex)) ?? [], {
    fonts: dna.fonts ?? [],
    radii: dna.radii ?? [],
  });
}
