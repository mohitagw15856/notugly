// Type scales and pairings.
//
// The scale is the easy half. The half everybody skips is that a heading at
// 48px needs tighter tracking and a shorter line-height than body text — so
// those are computed from the size rather than left for you to guess.

export const RATIOS = {
  minor_third: 1.2,
  major_third: 1.25,
  perfect_fourth: 1.333,
  augmented_fourth: 1.414,
  perfect_fifth: 1.5,
  golden: 1.618,
};

// Font stacks that need no download. A design system that costs 300 kB of
// webfont before it renders is not a system, it is a liability.
export const STACKS = {
  system: `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  humanist: `Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", source-sans-pro, sans-serif`,
  geometric: `Avenir, Montserrat, Corbel, "URW Gothic", source-sans-pro, sans-serif`,
  editorial: `Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif`,
  transitional: `Charter, "Bitstream Charter", "Sitka Text", Cambria, serif`,
  oldstyle: `"Iowan Old Style", "Palatino Linotype", "URW Palladio L", P052, serif`,
  mono: `ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace`,
  rounded: `ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, system-ui`,
  slab: `Rockwell, "Rockwell Nova", "Roboto Slab", "DejaVu Serif", "Sitka Small", serif`,
};

export const PAIRINGS = [
  { name: 'Editorial', heading: 'editorial', body: 'system', why: 'A serif headline over a system body reads as a publication rather than an app.' },
  { name: 'Swiss', heading: 'geometric', body: 'system', why: 'Geometric headings, neutral body. Hard to get wrong.' },
  { name: 'Terminal', heading: 'mono', body: 'mono', why: 'Everything monospaced. Opinionated, and instantly legible as a developer tool.' },
  { name: 'Warm', heading: 'rounded', body: 'humanist', why: 'Rounded headings soften a product without making it childish.' },
  { name: 'Classic', heading: 'oldstyle', body: 'oldstyle', why: 'Old-style throughout, for long-form reading.' },
  { name: 'Impact', heading: 'slab', body: 'system', why: 'Slab headings carry weight at large sizes and stay readable small.' },
];

// Optical adjustments. Big text wants tighter tracking and leading; small text
// wants the opposite. These curves are the boring part nobody does by hand.
const tracking = (px) => +(Math.max(-0.045, 0.02 - 0.028 * Math.log2(px / 12))).toFixed(4);
const leading = (px) => +(Math.max(1.05, 1.75 - 0.16 * Math.log2(px / 14))).toFixed(3);

export function scale({ base = 16, ratio = 1.25, steps = 7, names = null } = {}) {
  const labels = names || ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
  const out = [];
  for (let i = 0; i < steps; i++) {
    const step = i - 2; // index 2 is the base size
    const px = +(base * ratio ** step).toFixed(2);
    out.push({
      name: labels[i] || `step${i}`,
      px,
      rem: +(px / 16).toFixed(4),
      lineHeight: leading(px),
      letterSpacing: tracking(px),
    });
  }
  return out;
}

export function typeSystem({ base = 16, ratio = 1.25, pairing = 'Editorial' } = {}) {
  const p = PAIRINGS.find((x) => x.name === pairing) || PAIRINGS[0];
  return {
    pairing: p,
    heading: STACKS[p.heading],
    body: STACKS[p.body],
    mono: STACKS.mono,
    ratioName: Object.keys(RATIOS).find((k) => RATIOS[k] === ratio) || 'custom',
    ratio,
    scale: scale({ base, ratio, steps: 9 }),
  };
}
