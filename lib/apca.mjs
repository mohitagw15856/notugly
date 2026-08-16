// APCA — the contrast model that's likely to replace the WCAG 2 ratio.
//
// WCAG 2's ratio has a known flaw: it's symmetric. It says dark-on-light and
// light-on-dark are equally readable at the same number, and they aren't —
// light text on a dark background needs to be heavier to read the same. It also
// gets dark colours badly wrong; a lot of "passing" dark greys are unreadable
// and a lot of failing mid-greys are fine.
//
// APCA returns a signed Lc value from about -108 to +106. The sign is the
// polarity. It is NOT a ratio and does not convert to one.
//
// Implementation of APCA-W3 0.1.9 constants. This is a draft standard and the
// legal requirement is still WCAG 2, which is why notugly reports both and
// only *fails* on WCAG.

import { hexToRgb } from './color.mjs';

const MAIN_TRC = 2.4;
const Rco = 0.2126729, Gco = 0.7151522, Bco = 0.072175;

const NORM_BG = 0.56, NORM_TXT = 0.57, REV_TXT = 0.62, REV_BG = 0.65;
const BLK_THRS = 0.022, BLK_CLMP = 1.414;
const SCALE_BOW = 1.14, SCALE_WOB = 1.14;
const LO_BOW_OFFSET = 0.027, LO_WOB_OFFSET = 0.027;
const DELTA_Y_MIN = 0.0005, LO_CLIP = 0.1;

function screenLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return Rco * (r / 255) ** MAIN_TRC + Gco * (g / 255) ** MAIN_TRC + Bco * (b / 255) ** MAIN_TRC;
}

// Very dark colours get flare-compensated rather than allowed to run to zero.
const softClamp = (y) => (y < BLK_THRS ? y + (BLK_THRS - y) ** BLK_CLMP : y);

/**
 * Lightness contrast between text and its background. Positive means dark text
 * on a light background, negative means the reverse. Argument order matters and
 * is not interchangeable — that's the whole point of the model.
 */
export function apca(textHex, bgHex) {
  const txt = softClamp(screenLuminance(textHex));
  const bg = softClamp(screenLuminance(bgHex));

  if (Math.abs(bg - txt) < DELTA_Y_MIN) return 0;

  let sapc;
  let out;
  if (bg > txt) {
    sapc = (bg ** NORM_BG - txt ** NORM_TXT) * SCALE_BOW;
    out = sapc < LO_CLIP ? 0 : sapc - LO_BOW_OFFSET;
  } else {
    sapc = (bg ** REV_BG - txt ** REV_TXT) * SCALE_WOB;
    out = sapc > -LO_CLIP ? 0 : sapc + LO_WOB_OFFSET;
  }
  return +(out * 100).toFixed(2);
}

// APCA's guidance is a font-size/weight lookup, not a pass/fail line. This is
// the plain-language summary of it.
export const APCA_LEVELS = [
  { min: 90, use: 'anything, including thin body text' },
  { min: 75, use: 'body text at normal weight' },
  { min: 60, use: 'body text if it is 16px or larger' },
  { min: 45, use: 'large or bold text only' },
  { min: 30, use: 'headlines and non-essential text' },
  { min: 15, use: 'decorative only — do not put words here' },
  { min: 0, use: 'invisible' },
];

export function apcaAdvice(lc) {
  const abs = Math.abs(lc);
  const level = APCA_LEVELS.find((l) => abs >= l.min);
  return {
    lc,
    polarity: lc > 0 ? 'dark text on light' : lc < 0 ? 'light text on dark' : 'no difference',
    use: level.use,
    // The honest framing: this is advisory, WCAG is what you get sued over.
    bodyText: abs >= 60,
  };
}
