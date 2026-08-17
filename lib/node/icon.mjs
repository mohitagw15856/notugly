// A favicon / app-icon package: a monogram — rounded-square background, first
// letter as a bitmap glyph — rendered as actual pixels, not vector.
//
// Everything else in this repo hands you an SVG because SVG scales for free
// and never needs a second version. A favicon.ico and an Android launcher
// icon are the one place that doesn't hold: some consumers still insist on
// raster. So this renders one. The outline is the same superellipse used for
// Liquid Glass containers (`lib/liquidglass.mjs`), scan-converted pixel by
// pixel, and the letter's colour is picked the same way every other text
// colour in this project is picked — `accessibleOn()` — so a generated icon
// can't produce an unreadable initial any more than a generated page can
// produce unreadable body text.

import { accessibleOn, hexToRgb, AA_LARGE } from '../color.mjs';
import { encodePng, encodeIco } from './raster.mjs';
import { glyphFor, GLYPH_W, GLYPH_H } from './font5x7.mjs';

export const ICON_SIZES = [16, 32, 48, 180, 512];

// The same corner test as `squirclePath` in liquidglass.mjs, but evaluated
// per pixel instead of walked as a path — a scanline rasteriser for the
// identical curve, so the vector and raster outputs agree on the shape.
function insideSquircle(x, y, w, h, r, n = 5) {
  if (x >= r && x <= w - r) return true;
  if (y >= r && y <= h - r) return true;
  const cx = x < r ? r : w - r;
  const cy = y < r ? r : h - r;
  const dx = Math.abs(x - cx) / r;
  const dy = Math.abs(y - cy) / r;
  return dx ** n + dy ** n <= 1;
}

/** One size of the icon, as raw RGBA pixels ready for `encodePng`. */
export function iconPixels(letter, { bg, fg = null, size = 64 } = {}) {
  const radius = size * 0.22;
  const ink = fg || accessibleOn(bg, ['#ffffff', '#000000'], AA_LARGE);
  const glyph = glyphFor(letter);
  const [br, bgc, bb] = hexToRgb(bg);
  const [ir, ig, ib] = hexToRgb(ink);

  // Fit the 5×7 grid inside a padded square at a whole-pixel cell size, so
  // edges stay crisp at the sizes a favicon actually ships at.
  const pad = size * 0.22;
  const cell = Math.max(1, Math.floor(Math.min((size - pad * 2) / GLYPH_W, (size - pad * 2) / GLYPH_H)));
  const glyphW = cell * GLYPH_W;
  const glyphH = cell * GLYPH_H;
  const ox = (size - glyphW) / 2;
  const oy = (size - glyphH) / 2;

  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = (y * size + x) * 4;
      if (!insideSquircle(x + 0.5, y + 0.5, size, size, radius)) continue; // stays transparent

      let isInk = false;
      if (x >= ox && x < ox + glyphW && y >= oy && y < oy + glyphH) {
        const gx = Math.min(GLYPH_W - 1, Math.floor((x - ox) / cell));
        const gy = Math.min(GLYPH_H - 1, Math.floor((y - oy) / cell));
        isInk = glyph[gy][gx];
      }
      data[p] = isInk ? ir : br;
      data[p + 1] = isInk ? ig : bgc;
      data[p + 2] = isInk ? ib : bb;
      data[p + 3] = 255;
    }
  }
  return { data, width: size, height: size };
}

/**
 * The whole package: a PNG per size, plus a `favicon.ico` bundling the small
 * ones — the two formats that between them cover every browser tab, iOS home
 * screen, and Android launcher.
 */
export function iconPackage(name, sys, { sizes = ICON_SIZES } = {}) {
  const letter = [...String(name)].find((ch) => /[a-z0-9]/i.test(ch)) || String(name)[0] || '?';
  const bg = sys.colour.buttonBg;

  const files = {};
  const icoSizes = [];
  for (const size of sizes) {
    const png = encodePng(iconPixels(letter, { bg, size }));
    files[`icon-${size}.png`] = png;
    if (size <= 48) icoSizes.push({ size, png });
  }
  files['favicon.ico'] = encodeIco(icoSizes);
  return { letter: letter.toUpperCase(), bg, sizes, files };
}
