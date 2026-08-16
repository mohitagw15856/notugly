// Colour vision deficiency, simulated properly.
//
// The usual approach is a CSS filter chain — some sepia, a hue-rotate, a
// squeeze of saturation — and it is a lie. It moves colours in roughly the
// right direction and gets the actual confusions wrong, which is the only part
// that matters. If two of your colours collapse into each other for 8% of men,
// a hue-rotate will not tell you.
//
// This is the Viénot, Brettel & Mollon (1999) method: linear RGB into LMS cone
// response, project onto the plane the missing cone can still distinguish,
// convert back. Same maths the good tools use.

import { hexToRgb, rgbToHex, contrast } from './color.mjs';

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

// Hunt-Pointer-Estevez, normalised — linear RGB to long/medium/short cone response.
const RGB_TO_LMS = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];

const LMS_TO_RGB = [
  [0.0809444479, -0.130504409, 0.116721066],
  [-0.0102485335, 0.0540193266, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405],
];

const apply = (m, [a, b, c]) => m.map((row) => row[0] * a + row[1] * b + row[2] * c);

// Each dichromacy replaces the missing cone's response with what the remaining
// two predict it would have been.
const PROJECT = {
  // No long-wave cone. Reds darken toward olive; red and green converge.
  protanopia: ([, M, S]) => [2.02344 * M - 2.52581 * S, M, S],
  // No medium-wave cone. The most common; ~6% of men.
  deuteranopia: ([L, , S]) => [L, 0.494207 * L + 1.24827 * S, S],
  // No short-wave cone. Rare. Blue and green converge, yellow goes pink.
  tritanopia: ([L, M]) => [L, M, -0.395913 * L + 0.801109 * M],
};

export const VISION = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

// How common each is, roughly, so a UI can say why you should care.
export const PREVALENCE = {
  protanopia: '~1% of men',
  deuteranopia: '~6% of men',
  tritanopia: '~0.01% of everyone',
  achromatopsia: '~0.003% of everyone',
};

/**
 * Simulate how a colour appears to someone with a given colour vision
 * deficiency. `severity` of 1 is full dichromacy; below that interpolates
 * toward normal vision, which is what anomalous trichromacy actually looks
 * like (and is far more common than the full version).
 */
export function simulate(hex, kind = 'deuteranopia', severity = 1) {
  const rgb = hexToRgb(hex);

  if (kind === 'achromatopsia') {
    const [r, g, b] = rgb.map((v) => toLinear(v / 255));
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const grey = toSrgb(y) * 255;
    return rgbToHex(rgb.map((v) => v + (grey - v) * severity));
  }

  const project = PROJECT[kind];
  if (!project) return hex;

  const linear = rgb.map((v) => toLinear(v / 255));
  const lms = apply(RGB_TO_LMS, linear);
  const out = apply(LMS_TO_RGB, project(lms));

  return rgbToHex(
    out.map((v, i) => {
      const seen = toSrgb(Math.min(1, Math.max(0, v))) * 255;
      return rgb[i] + (seen - rgb[i]) * severity;
    })
  );
}

/**
 * The question you actually want answered: do any two of these colours become
 * the same colour for someone? Returns every pair that collapses, worst first.
 *
 * `threshold` is a contrast ratio — two colours whose simulated versions sit
 * below it are, for practical purposes, one colour.
 */
export function collisions(colours, { threshold = 1.2 } = {}) {
  const found = [];
  for (const kind of VISION) {
    const seen = colours.map((c) => ({ original: c, as: simulate(c, kind) }));
    for (let i = 0; i < seen.length; i++) {
      for (let j = i + 1; j < seen.length; j++) {
        const before = contrast(seen[i].original, seen[j].original);
        const after = contrast(seen[i].as, seen[j].as);
        // Only interesting if they were distinguishable to begin with.
        if (after < threshold && before >= threshold) {
          found.push({
            kind,
            prevalence: PREVALENCE[kind],
            pair: [seen[i].original, seen[j].original],
            becomes: [seen[i].as, seen[j].as],
            before: +before.toFixed(2),
            after: +after.toFixed(2),
          });
        }
      }
    }
  }
  return found.sort((a, b) => a.after - b.after);
}

/**
 * A whole design system, checked. Contrast ratios are luminance-based and
 * therefore barely move under CVD — the real risk is two *different* colours
 * merging, which is what this looks for.
 */
export function checkVision(colour) {
  const meaningful = ['accent', 'mid', 'bg', 'ink', 'muted', 'surface', 'border']
    .filter((k) => typeof colour[k] === 'string')
    .map((k) => colour[k]);

  const hits = collisions([...new Set(meaningful)]);
  return {
    passed: hits.length === 0,
    collisions: hits,
    note: hits.length
      ? 'Two colours in this system merge for some viewers. Fine if they never carry meaning on their own — a problem if one of them is "error" and the other is "success".'
      : 'No two colours in this system collapse into each other under any simulated deficiency.',
  };
}
