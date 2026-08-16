// Design systems for the place most work actually gets seen.
//
// Product managers live in decks. Every generator in this space exports CSS and
// Tailwind and design tokens, and not one of them exports the thing a PM opens
// forty times a week. So: a real PowerPoint/Keynote theme file, and a paste-able
// palette for Google Slides, which has no import format at all.

import { zip } from './zip.mjs';
import { nameAll } from './names.mjs';
import { contrast, oklchToHex, toDisplayable, hexToOklch } from './color.mjs';

const bare = (hex) => hex.replace('#', '').toUpperCase();

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Office's twelve theme slots, filled from a notugly system.
 *
 * Office insists on exactly this shape: two dark/light pairs, six accents, and
 * two link colours. The mapping is not arbitrary —
 *   dk1/lt1 are text and background,
 *   dk2/lt2 are the "alternate" pair used by chart backgrounds,
 *   accent1..6 are what every chart series and shape fill cycles through.
 *
 * Charts are the reason to care. PowerPoint assigns accent1..6 to series in
 * order, so if those six are not distinguishable, every chart in the deck is
 * unreadable — and that is the single most common way a deck theme fails.
 */
export function officeColours(sys) {
  const c = sys.colour;
  const p = c.primary;
  const a = c.accentRamp;
  const n = c.neutral;

  return {
    dk1: c.text,
    lt1: c.bg,
    dk2: n[sys.dark ? 8 : 9],
    lt2: c.surface,
    // Derived, not hand-picked. Choosing six indices out of the ramps by eye
    // produced a palette where accent1 and accent5 were within 1.05:1 in every
    // single vibe — two chart series that look identical.
    ...chartAccents(sys),
    hlink: c.brand,
    folHlink: c.accent,
  };
}

/**
 * The six chart colours.
 *
 * The requirement is unusual and stricter than it looks: PowerPoint assigns
 * accent1..6 to series in order, so *every* pair has to be distinguishable —
 * not just neighbours. Hue alone will not do it, because a colour-blind viewer
 * loses hue and a greyscale printout loses it entirely.
 *
 * So the six are laid out as a monotonic lightness ladder with the hue rotating
 * underneath. Different in colour for most people, different in tone for
 * everyone.
 */
export function chartAccents(sys) {
  const [, , baseHue] = hexToOklch(sys.colour.primary[6]);
  const [, , accHue] = hexToOklch(sys.colour.accentRamp[6]);

  // Kept inside a range that stays visible on the slide background at both
  // ends — a 0.9-lightness fill on a white slide is not a colour, it is a gap.
  // The span has to be wide enough that six evenly spaced rungs still clear
  // 1.2:1 between *neighbours*, which is the tightest pair. A narrower dark
  // range put accent3 and accent4 at 1.19:1 — indistinguishable in a bar chart.
  const lo = sys.dark ? 0.4 : 0.3;
  const hi = sys.dark ? 0.92 : 0.82;

  const hues = [baseHue, accHue, baseHue + 42, accHue - 38, baseHue + 190, accHue + 96];
  const out = {};
  hues.forEach((h, i) => {
    const L = lo + ((hi - lo) * i) / (hues.length - 1);
    // Chroma eases off at the light end, where high chroma reads as neon.
    const C = 0.15 - Math.max(0, L - 0.6) * 0.12;
    out[`accent${i + 1}`] = oklchToHex(toDisplayable([L, Math.max(0.05, C), ((h % 360) + 360) % 360]));
  });
  return out;
}

/** Every accent pair, checked for whether a reader could tell them apart. */
export function chartLegibility(sys) {
  const t = officeColours(sys);
  const accents = [t.accent1, t.accent2, t.accent3, t.accent4, t.accent5, t.accent6];
  const problems = [];
  for (let i = 0; i < accents.length; i++) {
    for (let j = i + 1; j < accents.length; j++) {
      const ratio = contrast(accents[i], accents[j]);
      // Adjacent bars in a chart need to look different. 1.2 is the point at
      // which two fills stop being distinguishable at small sizes.
      if (ratio < 1.2) problems.push({ pair: [i + 1, j + 1], colours: [accents[i], accents[j]], ratio: +ratio.toFixed(2) });
    }
  }
  return { accents, problems, passed: problems.length === 0 };
}

const themeXml = (sys) => {
  const t = officeColours(sys);
  const heading = sys.type.heading.split(',')[0].replace(/["']/g, '').trim();
  const body = sys.type.body.split(',')[0].replace(/["']/g, '').trim();
  const slot = (k, v) => `<a:${k}><a:srgbClr val="${bare(v)}"/></a:${k}>`;
  const sysSlot = (k, v) => `<a:${k}><a:sysClr val="window" lastClr="${bare(v)}"/></a:${k}>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="notugly ${esc(sys.seed)}">
  <a:themeElements>
    <a:clrScheme name="notugly ${esc(sys.seed)}">
      ${sysSlot('dk1', t.dk1)}
      ${sysSlot('lt1', t.lt1)}
      ${slot('dk2', t.dk2)}
      ${slot('lt2', t.lt2)}
      ${slot('accent1', t.accent1)}
      ${slot('accent2', t.accent2)}
      ${slot('accent3', t.accent3)}
      ${slot('accent4', t.accent4)}
      ${slot('accent5', t.accent5)}
      ${slot('accent6', t.accent6)}
      ${slot('hlink', t.hlink)}
      ${slot('folHlink', t.folHlink)}
    </a:clrScheme>
    <a:fontScheme name="notugly ${esc(sys.seed)}">
      <a:majorFont><a:latin typeface="${esc(heading)}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="${esc(body)}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="notugly ${esc(sys.seed)}">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="60000"/></a:schemeClr></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:shade val="80000"/></a:schemeClr></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="${Math.round(sys.borderWeight * 6350)}"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:shade val="90000"/></a:schemeClr></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;
};

/**
 * A .thmx file. Double-clickable in PowerPoint; Keynote will import the colours
 * from it too.
 *
 * Returns raw bytes — the caller writes them.
 */
export function toThmx(sys) {
  return zip([
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="thmx" ContentType="application/vnd.ms-officetheme"/>
  <Override PartName="/theme/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme/theme1.xml"/>
</Relationships>`,
    },
    { name: 'theme/theme/theme1.xml', data: themeXml(sys) },
  ]);
}

/**
 * Google Slides has no theme import. What it has is a custom-colour field that
 * takes one hex at a time, so the useful artefact is an ordered list with the
 * names beside it and instructions that fit on one screen.
 */
export function toSlidesGuide(sys) {
  const t = officeColours(sys);
  const named = nameAll(Object.values(t));
  const keys = Object.keys(t);
  const chart = chartLegibility(sys);

  const rows = keys.map((k, i) => `${(k + ':').padEnd(10)} ${t[k].toUpperCase()}   ${named[i].name}`);

  return `notugly — ${sys.seed} (${sys.vibeLabel}${sys.dark ? ', dark' : ''})
Theme colours for Google Slides

Slide > Edit theme > Colors > Custom, then paste each hex into the matching slot.

${rows.join('\n')}

Fonts
  Headings: ${sys.type.heading.split(',')[0].replace(/["']/g, '')}
  Body:     ${sys.type.body.split(',')[0].replace(/["']/g, '')}

Charts
  Slides assigns accent1..6 to series in order.
  ${chart.passed
    ? 'All six accents are distinguishable from each other.'
    : `Warning: ${chart.problems.length} accent pair(s) look alike — ${chart.problems
        .map((p) => `accent${p.pair[0]}/accent${p.pair[1]} at ${p.ratio}:1`)
        .join(', ')}.`}

Every colour above is checked for contrast before it is offered.
Generated by notugly — no model involved.
`;
}

/** The same palette as a plain list, for anything that just wants hexes. */
export function toSlidesJson(sys) {
  const t = officeColours(sys);
  const named = nameAll(Object.values(t));
  return JSON.stringify(
    {
      name: `notugly ${sys.seed}`,
      vibe: sys.vibe,
      dark: sys.dark,
      fonts: {
        heading: sys.type.heading.split(',')[0].replace(/["']/g, ''),
        body: sys.type.body.split(',')[0].replace(/["']/g, ''),
      },
      colours: Object.fromEntries(Object.keys(t).map((k, i) => [k, { hex: t[k], name: named[i].name }])),
      chartSafe: chartLegibility(sys).passed,
    },
    null,
    2
  );
}
