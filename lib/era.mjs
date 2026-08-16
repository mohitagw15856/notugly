// The same seed, rendered as four different decades.
//
// It is a joke that turns into an argument you can win. "Modern" is not a
// property of a design; it is a description of when the design was made. Every
// era on this list was, at the time, what modern looked like — bevels and all —
// and the current one will read exactly as dated in eight years.
//
// Useful beyond the gag: it is the fastest way to show a stakeholder that the
// thing they are calling "timeless" is in fact 2015.

import { hexToOklch, oklchToHex, toDisplayable, accessibleOn, contrast, AA_TEXT } from './color.mjs';

export const ERAS = [
  {
    year: 1998,
    label: 'Web 1.0',
    blurb: 'Tables, bevels, and a background tile. Nobody had heard of a grid.',
    radius: 0,
    borderWeight: 2,
    chroma: 1.35, // websafe palettes were brutally saturated
    heading: '"Times New Roman", Times, serif',
    body: '"Times New Roman", Times, serif',
    shadow: 'none',
    bevel: true,
    underlineLinks: true,
    maxWidth: null,
    letterSpacing: 0,
  },
  {
    year: 2008,
    label: 'Web 2.0',
    blurb: 'Glossy pills, reflections, and a gradient on absolutely everything.',
    radius: 12,
    borderWeight: 1,
    chroma: 1.15,
    heading: '"Lucida Grande", "Helvetica Neue", Helvetica, sans-serif',
    body: '"Lucida Grande", "Helvetica Neue", Helvetica, sans-serif',
    shadow: '0 1px 0 rgba(255,255,255,.6) inset, 0 2px 4px rgba(0,0,0,.28)',
    gloss: true,
    underlineLinks: false,
    maxWidth: 960,
    letterSpacing: 0,
  },
  {
    year: 2015,
    label: 'Flat',
    blurb: 'Everything flat, everything centred, one enormous hero. No shadows at all — which is why nobody could find the buttons.',
    radius: 3,
    borderWeight: 1,
    chroma: 0.95,
    heading: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    body: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    shadow: 'none',
    flat: true,
    underlineLinks: false,
    maxWidth: 1140,
    letterSpacing: 0.02,
  },
  {
    year: 2026,
    label: 'Now',
    blurb: 'Soft shadows, generous radius, a tinted neutral, and a system font stack. Which will look exactly this dated in eight years.',
    radius: null, // whatever the system chose
    borderWeight: null,
    chroma: 1,
    heading: null,
    body: null,
    shadow: null,
    underlineLinks: false,
    maxWidth: 720,
    letterSpacing: null,
  },
];

/**
 * A system, re-rendered in a given era.
 *
 * Only the styling moves. The hue is the same, the seed is the same, the
 * content is the same — so what you are looking at really is one design in four
 * different decades rather than four different designs.
 *
 * Contrast is still enforced. 1998 was not accessible, but shipping a knowingly
 * unreadable artefact to make a period joke is not a trade this library makes.
 */
export function inEra(sys, year) {
  const era = ERAS.find((e) => e.year === year) ?? ERAS[ERAS.length - 1];
  const c = sys.colour;
  const [L, C, h] = hexToOklch(c.brand);

  const shift = (hex, mult) => {
    const [l, ch, hu] = hexToOklch(hex);
    return oklchToHex(toDisplayable([l, ch * mult, hu]));
  };

  const bg = era.year === 1998 ? '#ffffff' : c.bg;
  const brand = shift(c.brand, era.chroma);
  const buttonBg = shift(c.buttonBg, era.chroma);

  return {
    era,
    colour: {
      ...c,
      bg,
      brand: accessibleOn(bg, [brand, c.brand, c.text], AA_TEXT),
      buttonBg,
      // Re-derive the label rather than inherit it: pushing chroma around moves
      // the button's luminance, and the old label may no longer clear it.
      buttonText: accessibleOn(buttonBg, ['#ffffff', '#000000', c.buttonText], AA_TEXT),
      link: era.year === 1998 ? '#0000ee' : accessibleOn(bg, [brand, c.brand], AA_TEXT),
    },
    type: {
      heading: era.heading ?? sys.type.heading,
      body: era.body ?? sys.type.body,
      mono: sys.type.mono,
      letterSpacing: era.letterSpacing ?? 0,
    },
    radius: era.radius ?? sys.radius.md,
    borderWeight: era.borderWeight ?? sys.borderWeight,
    shadow: era.shadow ?? sys.shadow.layers.join(', '),
    maxWidth: era.maxWidth,
    flourishes: {
      bevel: Boolean(era.bevel),
      gloss: Boolean(era.gloss),
      flat: Boolean(era.flat),
      underlineLinks: Boolean(era.underlineLinks),
    },
  };
}

/** All four, for showing side by side. */
export const allEras = (sys) => ERAS.map((e) => inEra(sys, e.year));

/**
 * A small rendered card per era — enough to read the difference at a glance
 * without needing a full page each.
 */
export function eraCard(rendered, { width = 300, height = 200 } = {}) {
  const { colour: c, type, radius, flourishes: f, era } = rendered;
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // Period-correct button treatment. The bevel is two lines, not a filter,
  // because that is genuinely how it was done.
  const btnY = height - 62;
  const button = f.bevel
    ? `<rect x="20" y="${btnY}" width="112" height="30" fill="${c.buttonBg}"/>
       <path d="M20 ${btnY} h112 M20 ${btnY} v30" stroke="#ffffff" stroke-opacity=".7" stroke-width="2" fill="none"/>
       <path d="M132 ${btnY} v30 M20 ${btnY + 30} h112" stroke="#000000" stroke-opacity=".45" stroke-width="2" fill="none"/>`
    : f.gloss
      ? `<defs><linearGradient id="g${era.year}" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="#ffffff" stop-opacity=".45"/>
           <stop offset=".5" stop-color="#ffffff" stop-opacity=".08"/>
           <stop offset=".5" stop-color="#000000" stop-opacity=".05"/>
           <stop offset="1" stop-color="#000000" stop-opacity=".16"/></linearGradient></defs>
         <rect x="20" y="${btnY}" width="112" height="30" rx="${radius}" fill="${c.buttonBg}"/>
         <rect x="20" y="${btnY}" width="112" height="30" rx="${radius}" fill="url(#g${era.year})"/>`
      : `<rect x="20" y="${btnY}" width="112" height="30" rx="${radius}" fill="${c.buttonBg}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(era.label)} — ${esc(String(era.year))}">
  <rect width="${width}" height="${height}" fill="${c.bg}"/>
  <text x="20" y="40" font-family="${esc(type.heading)}" font-size="26" font-weight="700" fill="${c.text}" letter-spacing="${type.letterSpacing}em">Headline</text>
  <text x="20" y="66" font-family="${esc(type.body)}" font-size="13" fill="${c.textMuted}">A sentence of body copy.</text>
  <text x="20" y="88" font-family="${esc(type.body)}" font-size="13" fill="${c.link}"${f.underlineLinks ? ' text-decoration="underline"' : ''}>a link</text>
  ${button}
  <text x="76" y="${btnY + 20}" text-anchor="middle" font-family="${esc(type.body)}" font-size="13" font-weight="600" fill="${c.buttonText}">Button</text>
  <text x="${width - 16}" y="${height - 16}" text-anchor="end" font-family="ui-monospace, monospace" font-size="11" fill="${c.textMuted}">${era.year} · ${esc(era.label)}</text>
</svg>`;
}
