// Will this survive being printed?
//
// Screens are additive light; paper is subtractive ink. A lot of the colours a
// generator loves — electric cyan, acid lime, hot magenta — simply do not exist
// in CMYK. They come off the press muddy and someone blames the printer.
//
// This is a naive conversion, not an ICC profile. It cannot tell you what your
// specific press on your specific stock will do. What it *can* do is flag the
// colours that no press will manage, which is the 90% case and takes zero
// dependencies.

import { hexToRgb, rgbToHex, hexToOklch, oklchToHex, toDisplayable } from './color.mjs';

/** sRGB to naive CMYK, 0–1 each. */
export function toCmyk(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 1 };
  return {
    c: (1 - r - k) / (1 - k),
    m: (1 - g - k) / (1 - k),
    y: (1 - b - k) / (1 - k),
    k,
  };
}

export function fromCmyk({ c, m, y, k }) {
  return rgbToHex([255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k)]);
}

/**
 * Total Area Coverage — the sum of all four inks. Over about 300% the paper
 * cannot dry, sheets stick together, and the print shop will phone you.
 */
export function tac(hex) {
  const { c, m, y, k } = toCmyk(hex);
  return Math.round((c + m + y + k) * 100);
}

// The naive conversion above round-trips losslessly, so comparing a colour with
// its own round-trip tells you nothing — it is always zero. The real limit is
// that process inks can only reach so far. These are the six achievable
// secondaries of coated process ink: the pure primaries and their overprints.
// Everything a press can make lives inside the solid they describe.
const INKS = ['#00aeef', '#00a651', '#fff200', '#ed1c24', '#ec008c', '#2e3192'].map(hexToOklch);

/**
 * The most chroma a press can reach at this hue and lightness. Interpolates
 * between the two nearest ink primaries, then falls off toward paper white and
 * solid black — because a press cannot make a vivid pale colour any more than
 * it can make a vivid near-black one.
 */
export function maxPrintableChroma(hue, L) {
  const sorted = [...INKS].sort(
    (a, b) => Math.abs(((hue - a[2] + 540) % 360) - 180) - Math.abs(((hue - b[2] + 540) % 360) - 180)
  );
  const [a, b] = sorted;
  const da = Math.abs(((hue - a[2] + 540) % 360) - 180);
  const db = Math.abs(((hue - b[2] + 540) % 360) - 180);
  const span = da + db || 1;
  const peakC = (a[1] * db + b[1] * da) / span;
  const peakL = (a[0] * db + b[0] * da) / span;

  // Triangular falloff from the ink's own lightness out to white and black.
  const t = L >= peakL ? (1 - L) / Math.max(1e-6, 1 - peakL) : L / Math.max(1e-6, peakL);
  return peakC * Math.max(0, t);
}

/**
 * How far outside the printable solid a colour sits, and the nearest colour
 * that is inside it. Distance is in OKLab chroma units, where 0.02 is about
 * the smallest difference a person notices.
 */
// Well under the ~0.02 that anyone can actually see. Without it, white comes
// back out of gamut because its chroma rounds to 3.7e-8 and the limit at that
// lightness rounds to 1.0e-8 — a rounding artefact reported as a print defect.
const JUST_NOTICEABLE = 0.002;

export function printShift(hex) {
  const [L, C, h] = hexToOklch(hex);
  const limit = maxPrintableChroma(h, L);
  if (C <= limit + JUST_NOTICEABLE) return { as: hex, distance: 0, inGamut: true };
  return {
    as: oklchToHex(toDisplayable([L, limit, h])),
    distance: +(C - limit).toFixed(4),
    inGamut: false,
  };
}

/**
 * Everything wrong with one colour on paper.
 */
export function checkPrint(hex) {
  const notes = [];
  const [L, C] = hexToOklch(hex);
  const coverage = tac(hex);
  const shift = printShift(hex);

  if (coverage > 300) {
    notes.push({
      level: 'error',
      says: `${coverage}% total ink. Over 300% and it will not dry.`,
    });
  }
  if (C > 0.22 && L > 0.6) {
    notes.push({
      level: 'warn',
      says: 'Bright and very saturated. This is the classic screen colour that comes back from the press looking sad.',
    });
  }
  if (shift.distance > 0.06) {
    notes.push({
      level: 'warn',
      says: `Shifts noticeably in CMYK — closer to ${shift.as} on paper.`,
    });
  }
  if (L > 0.97) {
    notes.push({ level: 'info', says: 'Effectively paper white. It will print as nothing at all.' });
  }
  if (L < 0.2 && coverage < 100) {
    notes.push({
      level: 'info',
      says: 'Prints as single-plate black, which looks washed out at large sizes. Ask for rich black.',
    });
  }

  return { hex, cmyk: toCmyk(hex), coverage, shift, notes, safe: !notes.some((n) => n.level === 'error') };
}

/** The same check across a whole generated system. */
export function printReport(colour) {
  const keys = Object.keys(colour).filter((k) => typeof colour[k] === 'string' && colour[k].startsWith('#'));
  const checks = keys.map((k) => ({ role: k, ...checkPrint(colour[k]) }));
  return {
    checks,
    worst: checks.filter((c) => c.notes.length).sort((a, b) => b.shift.distance - a.shift.distance),
    safe: checks.every((c) => c.safe),
  };
}
