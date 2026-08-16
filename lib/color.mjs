// Colour, done in a space where the maths matches what eyes do.
//
// Nearly every palette generator works in HSL, which is why they produce ramps
// where the yellows look washed out and the blues look like holes. HSL's
// "lightness" is not lightness — #ffff00 and #0000ff both sit at L=50% and one
// of them is nine times brighter than the other.
//
// So everything here goes through OKLab. It costs about forty lines of matrix
// maths and it means an evenly spaced ramp actually looks evenly spaced.
//
// Contrast is WCAG 2.1 relative luminance, because that is the number people
// are audited against, whatever its flaws.

// --- hex and rgb ------------------------------------------------------------

export function hexToRgb(hex) {
  const h = String(hex).trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`"${hex}" is not a hex colour`);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const to255 = (n) => Math.round(clamp(n) * 255);

export const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

// --- gamma ------------------------------------------------------------------
// sRGB is stored gamma-encoded. Every calculation below needs it linear first,
// and forgetting this is the single most common colour bug there is.

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

// --- OKLab ------------------------------------------------------------------
// Björn Ottosson's OKLab. Perceptually uniform, cheap, and the reason the
// ramps here hold together across hues.

export function rgbToOklab([r, g, b]) {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToRgb([L, a, bb]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3;

  return [
    to255(fromLinear(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    to255(fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    to255(fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ];
}

// Polar form: lightness, chroma, hue. The form you actually want to think in.
export const oklabToOklch = ([L, a, b]) => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
export const oklchToOklab = ([L, C, h]) => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];

export const hexToOklch = (hex) => oklabToOklch(rgbToOklab(hexToRgb(hex)));
export const oklchToHex = (lch) => rgbToHex(oklabToRgb(oklchToOklab(lch)));

// Some OKLCH coordinates have no sRGB equivalent. Rather than clipping to a
// muddy approximation, walk chroma down until it fits — the hue and lightness
// you asked for are preserved, which is what matters in a ramp.
export function toDisplayable([L, C, h]) {
  let c = C;
  for (let i = 0; i < 40; i++) {
    const [r, g, b] = oklabToRgb(oklchToOklab([L, c, h]));
    const back = rgbToOklab([r, g, b]);
    const [L2, C2] = oklabToOklch(back);
    if (Math.abs(L2 - L) < 0.02 && Math.abs(C2 - c) < 0.02) return [L, c, h];
    c *= 0.92;
  }
  return [L, 0, h];
}

// --- contrast ---------------------------------------------------------------

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// WCAG thresholds, named rather than left as magic numbers.
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;
export const AAA_TEXT = 7;

export const rate = (ratio) =>
  ratio >= AAA_TEXT ? 'AAA' : ratio >= AA_TEXT ? 'AA' : ratio >= AA_LARGE ? 'AA Large' : 'fail';

// --- ramps ------------------------------------------------------------------

// Twelve steps, evenly spaced in perceptual lightness rather than in hex.
// Chroma is highest in the middle because fully light and fully dark colours
// cannot hold much of it — pushing chroma flat is what makes ramps look cheap.
export function ramp(baseHex, { steps = 12, hueShift = 0 } = {}) {
  const [, C, h] = hexToOklch(baseHex);
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const L = 0.97 - t * 0.87;
    // A bell curve over the ramp: chroma peaks in the middle third.
    const bell = Math.sin(Math.PI * t) ** 0.7;
    const chroma = Math.max(0.004, C * (0.35 + 0.9 * bell));
    // Hue shifting slightly along the ramp is what stops it looking flat —
    // shadows drift cool, highlights drift warm, the way paint does.
    const hue = (h + hueShift * (t - 0.5) * 2 + 360) % 360;
    out.push(oklchToHex(toDisplayable([L, chroma, hue])));
  }
  return out;
}

// Given a background and a set of candidates, return the first that clears the
// bar — and if none does, build one that does rather than shrugging.
export function accessibleOn(bg, candidates = [], target = AA_TEXT) {
  for (const c of candidates) if (contrast(bg, c) >= target) return c;

  const [, C, h] = hexToOklch(candidates[0] || bg);
  const bgL = luminance(bg);
  // Walk away from the background's luminance until the ratio clears.
  for (let i = 0; i <= 100; i++) {
    const L = bgL > 0.18 ? 0.95 - i / 100 : 0.05 + i / 100;
    const hex = oklchToHex(toDisplayable([L, C * 0.8, h]));
    if (contrast(bg, hex) >= target) return hex;
  }
  return bgL > 0.18 ? '#000000' : '#ffffff';
}

export const isLight = (hex) => luminance(hex) > 0.18;
