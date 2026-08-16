// Pull a palette out of an image.
//
// This is the "I know the feeling I want" workflow: you have a photograph, or
// four screenshots, or a mood board, and what you actually want is the design
// system those images imply. Describing that in words loses most of it.
//
// It is all pixel arithmetic. No model is called, nothing is uploaded, and the
// same image always gives the same palette — which matters, because a palette
// that changes every time you press the button is not a palette, it's a slot
// machine.
//
// Works on anything shaped like ImageData: `{ data: Uint8ClampedArray, width,
// height }`. The browser hands you one from a canvas; Node can build one from
// any decoder.

import { rgbToOklab, oklabToRgb, rgbToHex, hexToOklch, hexToRgb } from './color.mjs';

/**
 * Every pixel, reduced to a manageable set of representative colours.
 *
 * Deterministic k-means in OKLab: perceptual distance, so "close" means
 * "looks the same" rather than "has similar numbers in it".
 */
export function quantise({ data, width, height }, { colours = 6, sample = 1, minAlpha = 128 } = {}) {
  // Sampling stride. A 4000×3000 photo is 12M pixels and you do not need all of
  // them to know it is mostly orange.
  const total = width * height;
  const stride = Math.max(1, sample === 1 ? Math.floor(Math.sqrt(total / 20000)) : sample);

  const points = [];
  for (let i = 0; i < total; i += stride) {
    const p = i * 4;
    if (data[p + 3] < minAlpha) continue;
    points.push(rgbToOklab([data[p], data[p + 1], data[p + 2]]));
  }
  if (!points.length) return [];

  // --- deterministic seeding ------------------------------------------------
  // k-means++ picks its first centroid at random. That would make the palette
  // different on every run, so instead: start at the point closest to the mean,
  // then repeatedly take the point furthest from everything chosen so far.
  const mean = points
    .reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
    .map((v) => v / points.length);

  const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

  const centroids = [points.reduce((best, p) => (dist2(p, mean) < dist2(best, mean) ? p : best), points[0])];
  while (centroids.length < Math.min(colours, points.length)) {
    let far = points[0];
    let farD = -1;
    for (const p of points) {
      const d = Math.min(...centroids.map((c) => dist2(p, c)));
      if (d > farD) {
        farD = d;
        far = p;
      }
    }
    centroids.push(far);
  }

  // --- Lloyd's algorithm ----------------------------------------------------
  let assignment = new Array(points.length).fill(0);
  for (let iter = 0; iter < 24; iter++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = dist2(points[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assignment[i] !== best) {
        assignment[i] = best;
        moved = true;
      }
    }

    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < points.length; i++) {
      const s = sums[assignment[i]];
      s[0] += points[i][0];
      s[1] += points[i][1];
      s[2] += points[i][2];
      s[3]++;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3]) centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
    }
    if (!moved) break;
  }

  const counts = centroids.map(() => 0);
  for (const a of assignment) counts[a]++;

  return centroids
    .map((c, i) => ({
      hex: rgbToHex(oklabToRgb(c)),
      share: +(counts[i] / points.length).toFixed(4),
      pixels: counts[i],
    }))
    .filter((c) => c.pixels > 0)
    .sort((a, b) => b.share - a.share);
}

// How different two colours look, in OKLab. Roughly: 0.02 is the smallest
// difference anyone notices, 0.09 is "obviously two colours".
export function perceptualDistance(a, b) {
  const [l1, a1, b1] = rgbToOklab(hexToRgb(a));
  const [l2, a2, b2] = rgbToOklab(hexToRgb(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * A palette you can actually build with, rather than a list of what was in the
 * photo.
 *
 * The difference matters. A photograph is mostly mud — the average of a busy
 * image is always brownish grey — so the raw quantiser output contains several
 * colours nobody would ever choose. This drops the mud, merges near-duplicates,
 * and hands back something with a usable range.
 */
export function paletteFromImage(image, options = {}) {
  const { keep = 5 } = options;
  const raw = quantise(image, { colours: Math.max(8, keep + 4), ...options });

  const usable = raw.filter((c) => {
    const [L, C] = hexToOklch(c.hex);
    // Near-black and near-white are backgrounds, not brand colours — they come
    // back for every photograph ever taken and tell you nothing.
    if (L < 0.12 || L > 0.95) return false;
    // Desaturated mid-greys are the average of everything, which is what the
    // algorithm converges on when a picture is busy.
    if (C < 0.03 && c.share < 0.18) return false;
    return true;
  });

  // Merge anything that would read as the same colour side by side.
  //
  // Emphatically NOT by contrast ratio. Contrast is luminance only, and two
  // colours can have identical luminance while being nothing alike — a sunset
  // orange and a teal sit within 1.1:1 of each other, so a contrast-based merge
  // silently eats the accent colour and hands back a palette of browns. Ask
  // OKLab how different they *look*.
  const merged = [];
  for (const c of usable) {
    const near = merged.find((m) => perceptualDistance(m.hex, c.hex) < 0.09);
    if (near) near.share = +(near.share + c.share).toFixed(4);
    else merged.push({ ...c });
  }

  const chosen = merged.slice(0, keep);
  // If the image was genuinely monochrome, say so rather than inventing colours
  // that are not in it.
  return {
    colours: chosen,
    // The most saturated of the survivors is the one a person would call "the"
    // colour of the image — not the most common, which is usually the sky.
    dominant: chosen.length
      ? chosen.reduce((a, b) => (hexToOklch(a.hex)[1] > hexToOklch(b.hex)[1] ? a : b)).hex
      : null,
    // The most common one, which is what you would use as a background.
    ground: chosen[0]?.hex ?? null,
    monochrome: chosen.length <= 1,
    sampled: raw.length,
  };
}

/**
 * A mood board: several images at once, weighted equally regardless of size, so
 * one enormous photograph does not drown out the other four.
 */
export function paletteFromImages(images, options = {}) {
  const each = images.map((img) => paletteFromImage(img, { ...options, keep: 4 }));

  const pool = [];
  for (const result of each) {
    for (const c of result.colours) {
      // Normalise within its own image first — that is what "weighted equally"
      // means here.
      const existing = pool.find((p) => perceptualDistance(p.hex, c.hex) < 0.09);
      if (existing) existing.share += c.share / images.length;
      else pool.push({ hex: c.hex, share: c.share / images.length });
    }
  }

  pool.sort((a, b) => b.share - a.share);
  const chosen = pool.slice(0, options.keep ?? 5).map((c) => ({ ...c, share: +c.share.toFixed(4) }));

  return {
    colours: chosen,
    dominant: chosen.length
      ? chosen.reduce((a, b) => (hexToOklch(a.hex)[1] > hexToOklch(b.hex)[1] ? a : b)).hex
      : null,
    ground: chosen[0]?.hex ?? null,
    fromImages: images.length,
    // What each image contributed on its own, so a UI can show which picture is
    // driving the result.
    perImage: each.map((e) => e.colours.map((c) => c.hex)),
  };
}
