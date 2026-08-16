// Design DNA: point it at a URL, get the palette, type and shape back as tokens.
//
// Honest about what this is: a heuristic. It reads the HTML and any linked
// stylesheets and counts what it finds. It cannot see anything a framework
// computes at runtime, and it will miss colours that only exist inside a
// component's own scoped styles.
//
// What it is good at — and what nobody else offers for free — is answering
// "what is this site's actual palette" in about a second, so you can start from
// something real instead of a blank slider.

import { hexToOklch, oklchToHex, toDisplayable, contrast } from './color.mjs';

const FETCH_OPTS = {
  headers: { 'user-agent': 'notugly-extract/1.0 (+https://github.com/mohitagw15856/notugly)' },
  redirect: 'follow',
};

const normaliseHex = (h) => {
  const s = h.replace('#', '').toLowerCase();
  return '#' + (s.length === 3 ? s.split('').map((c) => c + c).join('') : s);
};

function rgbFuncToHex(str) {
  const m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (!m) return null;
  const [r, g, b] = m.slice(1, 4).map((n) => Math.round(Number(n)));
  if ([r, g, b].some((n) => Number.isNaN(n) || n > 255)) return null;
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

export function extractFromCss(css) {
  const colours = new Map();
  const bump = (hex) => {
    if (!/^#[0-9a-f]{6}$/.test(hex)) return;
    colours.set(hex, (colours.get(hex) || 0) + 1);
  };

  for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const h = m[0].slice(0, 7);
    if (h.length === 4 || h.length === 7) bump(normaliseHex(h));
  }
  for (const m of css.matchAll(/rgba?\([^)]+\)/gi)) {
    const h = rgbFuncToHex(m[0]);
    if (h) bump(h);
  }

  const fonts = new Map();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
    const stack = m[1].trim().replace(/["']/g, '');
    fonts.set(stack, (fonts.get(stack) || 0) + 1);
  }

  const radii = new Map();
  for (const m of css.matchAll(/border-radius\s*:\s*([^;}]+)/gi)) {
    const v = m[1].trim();
    radii.set(v, (radii.get(v) || 0) + 1);
  }

  const shadows = [];
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;}]+)/gi)) {
    if (!/none/i.test(m[1])) shadows.push(m[1].trim());
  }

  const sizes = new Map();
  for (const m of css.matchAll(/font-size\s*:\s*([\d.]+)(px|rem|em)/gi)) {
    const px = m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
    if (px >= 8 && px <= 120) sizes.set(Math.round(px), (sizes.get(Math.round(px)) || 0) + 1);
  }

  const byCount = (m, n = 12) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));

  return {
    colours: byCount(colours, 16),
    fonts: byCount(fonts, 5),
    radii: byCount(radii, 5),
    shadows: shadows.slice(0, 5),
    fontSizes: byCount(sizes, 10).sort((a, b) => Number(a.value) - Number(b.value)),
  };
}

// The two colours doing the most work: the one used most (usually the
// background) and the most saturated one (usually the brand).
export function summarise(dna) {
  const hexes = dna.colours.map((c) => c.value);
  if (!hexes.length) return null;

  const background = hexes[0];
  let brand = null;
  let bestChroma = -1;
  for (const h of hexes) {
    const [, C] = hexToOklch(h);
    // Ignore near-greys and anything that would be unreadable on the background.
    if (C > bestChroma && C > 0.04 && contrast(h, background) > 1.6) {
      bestChroma = C;
      brand = h;
    }
  }
  return {
    background,
    brand: brand || hexes[1] || hexes[0],
    headingFont: dna.fonts[0]?.value || null,
    radius: dna.radii[0]?.value || null,
    hasShadows: dna.shadows.length > 0,
    scale: dna.fontSizes.map((s) => Number(s.value)),
  };
}

export async function extract(url, { fetchImpl = fetch, maxSheets = 6 } = {}) {
  const page = await fetchImpl(url, FETCH_OPTS);
  if (!page.ok) throw new Error(`${url} returned ${page.status}`);
  const html = await page.text();

  let css = '';
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) css += m[1] + '\n';
  // Inline style attributes carry a lot of a site's real colour on modern sites.
  for (const m of html.matchAll(/style="([^"]+)"/gi)) css += m[1] + ';\n';

  const links = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
    .map((m) => (m[0].match(/href=["']([^"']+)["']/) || [])[1])
    .filter(Boolean)
    .slice(0, maxSheets);

  const fetched = [];
  for (const href of links) {
    try {
      const abs = new URL(href, url).href;
      const res = await fetchImpl(abs, FETCH_OPTS);
      if (res.ok) {
        css += (await res.text()) + '\n';
        fetched.push(abs);
      }
    } catch {
      /* a stylesheet that will not load is a gap in the sample, not a failure */
    }
  }

  const dna = extractFromCss(css);
  return { url, stylesheets: fetched, cssBytes: css.length, ...dna, summary: summarise(dna) };
}
