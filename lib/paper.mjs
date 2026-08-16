// Things you print.
//
// A design system that has only ever existed on a screen has not been tested.
// Paper is unforgiving: no backlight, no hover states, a fixed size, and a
// gamut roughly two thirds of sRGB. Colours that looked confident at 400 nits
// come back looking like they were left in the sun.
//
// Everything here is an SVG at a real paper size, gamut-checked, with the
// warnings printed on the artefact itself rather than hidden in a report.

import { hexToOklch, contrast, AA_TEXT } from './color.mjs';
import { checkPrint, printShift } from './print.mjs';
import { nameAll } from './names.mjs';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Real paper, in millimetres, at 1 unit = 1mm so the SVG prints at true size.
export const PAPER = {
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  letter: [215.9, 279.4],
};

const svg = ([w, h], body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;

// --- the poster ---------------------------------------------------------------

/**
 * The system as something you would put on a wall.
 *
 * Not a swatch grid — a designed object that happens to be made of the palette.
 * The colours are pulled into gamut first, so what you pin up is what came out
 * of the printer.
 */
export function poster(sys, { size = 'A3', title = null, gamut = true } = {}) {
  const [w, h] = PAPER[size] ?? PAPER.A3;
  const c = sys.colour;
  const safe = (hex) => (gamut ? printShift(hex).as : hex);

  const ramp = c.primary.slice(1, 11).map(safe);
  const accent = c.accentRamp.slice(2, 10).map(safe);
  const ink = safe(c.text);
  const paper = safe(c.bg);

  const margin = w * 0.08;
  const inner = w - margin * 2;

  // A stack of bars whose heights follow the type scale, so the poster is
  // literally a picture of the system's proportions.
  const steps = sys.type.scale.slice(-6);
  const totalUnits = steps.reduce((n, s) => n + s.rem, 0);
  let y = margin * 1.6;
  const bars = steps
    .map((s, i) => {
      const barH = ((h * 0.56) * s.rem) / totalUnits;
      const rect = `<rect x="${margin}" y="${y.toFixed(2)}" width="${inner}" height="${(barH - 2).toFixed(2)}" rx="${Math.min(sys.radius.md, barH / 3).toFixed(1)}" fill="${ramp[i % ramp.length]}"/>`;
      y += barH;
      return rect;
    })
    .join('');

  const dots = accent
    .map((hex, i) => {
      const r = inner / (accent.length * 2.6);
      const cx = margin + r + (i * (inner - r * 2)) / (accent.length - 1);
      return `<circle cx="${cx.toFixed(2)}" cy="${(y + r + 6).toFixed(2)}" r="${r.toFixed(2)}" fill="${hex}"/>`;
    })
    .join('');

  const named = nameAll([c.brand, c.accent, c.text]);
  const caption = named.map((n) => n.name).join(' · ');
  const footY = h - margin * 0.9;

  return svg(
    [w, h],
    `<rect width="${w}" height="${h}" fill="${paper}"/>
     ${bars}
     ${dots}
     <text x="${margin}" y="${(h - margin * 2.4).toFixed(1)}" font-family="${esc(sys.type.heading)}" font-size="${(w * 0.085).toFixed(1)}" font-weight="700" fill="${ink}">${esc(title || sys.seed)}</text>
     <text x="${margin}" y="${(h - margin * 1.7).toFixed(1)}" font-family="${esc(sys.type.body)}" font-size="${(w * 0.026).toFixed(1)}" fill="${ink}" opacity=".72">${esc(caption)}</text>
     <text x="${margin}" y="${footY.toFixed(1)}" font-family="${esc(sys.type.mono)}" font-size="${(w * 0.018).toFixed(1)}" fill="${ink}" opacity=".5">${esc(sys.vibeLabel)} · seed ${esc(sys.seed)} · ${gamut ? 'CMYK-safe' : 'screen colours, not gamut-checked'}</text>`,
    `A ${size} poster of the ${sys.seed} design system`
  );
}

// --- the type specimen --------------------------------------------------------

const PANGRAM = 'The quick brown fox jumps over the lazy dog';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const FIGURES = '0123456789 &@£$%()[]{}?!';

/**
 * A specimen sheet, the kind type foundries print.
 *
 * Its job is to show a typeface doing work at every size it will be asked to
 * do work at — because a font that looks superb at 72px is frequently illegible
 * at 13, and a screen preview at one size never tells you.
 */
export function specimen(sys, { size = 'A4', gamut = true } = {}) {
  const [w, h] = PAPER[size] ?? PAPER.A4;
  const safe = (hex) => (gamut ? printShift(hex).as : hex);
  const ink = safe(sys.colour.text);
  const muted = safe(sys.colour.textMuted);
  const paper = safe(sys.colour.bg);
  const rule = safe(sys.colour.border);

  const m = w * 0.09;
  let y = m * 1.3;
  const out = [];

  // Rough advance width per character. Not font metrics — but enough to stop a
  // pangram running off the right edge of the sheet, which is what happens if
  // you trust the nominal size and never measure.
  const measure = (text, mm) =>
    [...text].reduce((n, ch) => n + (/[ilj.,'!|]/.test(ch) ? 0.28 : /[A-Z@MW]/.test(ch) ? 0.68 : 0.5), 0) * mm;

  const line = (text, px, family, fill = ink, weight = 400, reserve = 0) => {
    // px in the design scale, converted to mm at 96dpi so the print is true.
    let mm = px * 0.2646;
    // Shrink until it fits the measure. A specimen that clips its own pangram
    // is worse than one that sets it a point smaller. `reserve` keeps a gutter
    // clear on the right for the size annotations — without it the pangram
    // grows to the full measure and the labels print on top of the words.
    const maxW = w - m * 2 - reserve;
    while (measure(text, mm) > maxW && mm > 1.2) mm *= 0.96;
    y += mm;
    out.push(
      `<text x="${m}" y="${y.toFixed(2)}" font-family="${esc(family)}" font-size="${mm.toFixed(2)}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`
    );
    y += mm * 0.35;
    return mm;
  };

  const hr = () => {
    y += 3;
    out.push(`<line x1="${m}" y1="${y.toFixed(2)}" x2="${w - m}" y2="${y.toFixed(2)}" stroke="${rule}" stroke-width="0.3"/>`);
    y += 5;
  };

  line(sys.type.heading.split(',')[0].replace(/["']/g, ''), 54, sys.type.heading, ink, 700);
  line(`${sys.type.pairing?.name ?? sys.vibeLabel} · ${String(sys.type.ratioName).replace(/_/g, ' ')} · ${sys.type.ratio}× scale`, 11, sys.type.mono, muted);
  hr();

  line(LETTERS, 26, sys.type.heading, ink, 700);
  line(LOWER, 26, sys.type.heading, ink);
  line(FIGURES, 22, sys.type.heading, muted);
  hr();

  // The scale, largest to smallest, each showing the same words — the only way
  // to compare sizes honestly.
  for (const step of [...sys.type.scale].reverse().slice(0, 7)) {
    line(PANGRAM, Math.min(46, step.px), step.px > 24 ? sys.type.heading : sys.type.body, ink, step.px > 24 ? 700 : 400, 38);
    y -= 1.5;
    out.push(
      `<text x="${w - m}" y="${(y - 1).toFixed(2)}" text-anchor="end" font-family="${esc(sys.type.mono)}" font-size="2.4" fill="${muted}">${step.name} · ${step.px}px · ${step.lineHeight}</text>`
    );
    y += 3;
  }

  hr();
  // Body copy at its real size, which is the only test that matters.
  const body = [
    'Body copy, set at the size it will actually be read at. Most specimens skip',
    'this and show a headline instead, which is how a typeface with a beautiful',
    'display cut and an unusable text cut gets chosen for a product.',
  ];
  for (const l of body) line(l, sys.type.scale[2]?.px ?? 16, sys.type.body, ink);

  return svg(
    [w, h],
    `<rect width="${w}" height="${h}" fill="${paper}"/>${out.join('')}
     <text x="${m}" y="${h - m * 0.5}" font-family="${esc(sys.type.mono)}" font-size="2.6" fill="${muted}">notugly · ${esc(sys.seed)} · printed at true size</text>`,
    `A type specimen for ${sys.seed}`
  );
}

// --- the zine -----------------------------------------------------------------

/**
 * An eight-page zine on a single sheet, with the pages rotated for the standard
 * one-cut fold. Print double-sided, cut the middle, fold.
 *
 * The imposition is the interesting part: fold an A4 into eighths and the pages
 * do not land in reading order, and half of them are upside down. Getting that
 * wrong is the classic zine mistake, so the layout below is the real one.
 */
export function zine(sys, pages, { size = 'A4', gamut = true } = {}) {
  const [w, h] = PAPER[size] ?? PAPER.A4;
  const safe = (hex) => (gamut ? printShift(hex).as : hex);

  // Landscape sheet, 4 across × 2 down.
  const sheetW = h;
  const sheetH = w;
  const cellW = sheetW / 4;
  const cellH = sheetH / 2;

  // Standard 8-page imposition. Top row is printed upside down; after the fold
  // and cut these come out as pages 1-8 in order.
  const LAYOUT = [
    { page: 5, x: 0, y: 0, flip: true },
    { page: 4, x: 1, y: 0, flip: true },
    { page: 1, x: 2, y: 0, flip: true },
    { page: 8, x: 3, y: 0, flip: true },
    { page: 6, x: 0, y: 1, flip: false },
    { page: 3, x: 1, y: 1, flip: false },
    { page: 2, x: 2, y: 1, flip: false },
    { page: 7, x: 3, y: 1, flip: false },
  ];

  const c = sys.colour;
  const ink = safe(c.text);
  const paper = safe(c.bg);
  const pad = cellW * 0.12;

  const cells = LAYOUT.map(({ page, x, y, flip }) => {
    const content = pages[page - 1] ?? { title: `${page}`, body: '' };
    const ox = x * cellW;
    const oy = y * cellH;
    const transform = flip ? `translate(${ox + cellW} ${oy + cellH}) rotate(180)` : `translate(${ox} ${oy})`;
    const fill = content.colour ? safe(content.colour) : paper;
    const textCol = contrast(ink, fill) >= AA_TEXT ? ink : safe(c.bg);

    const words = String(content.body ?? '').split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).length > 26) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);

    return `<g transform="${transform}">
      <rect width="${cellW}" height="${cellH}" fill="${fill}"/>
      <text x="${pad}" y="${pad + 8}" font-family="${esc(sys.type.heading)}" font-size="7" font-weight="700" fill="${textCol}">${esc(content.title ?? '')}</text>
      ${lines
        .slice(0, 12)
        .map((l, i) => `<text x="${pad}" y="${pad + 20 + i * 5}" font-family="${esc(sys.type.body)}" font-size="3.6" fill="${textCol}">${esc(l)}</text>`)
        .join('')}
      <text x="${cellW / 2}" y="${cellH - pad / 2}" text-anchor="middle" font-family="${esc(sys.type.mono)}" font-size="3" fill="${textCol}" opacity=".55">${page}</text>
    </g>`;
  }).join('');

  // Fold and cut marks, outside the content, so the printer knows what to do.
  const marks = `
    <g stroke="${ink}" stroke-width="0.2" opacity=".45">
      <line x1="${sheetW / 2}" y1="0" x2="${sheetW / 2}" y2="4"/>
      <line x1="${sheetW / 2}" y1="${sheetH - 4}" x2="${sheetW / 2}" y2="${sheetH}"/>
      <line x1="${cellW}" y1="0" x2="${cellW}" y2="3"/>
      <line x1="${cellW * 3}" y1="0" x2="${cellW * 3}" y2="3"/>
      <line x1="0" y1="${cellH}" x2="3" y2="${cellH}"/>
      <line x1="${sheetW - 3}" y1="${cellH}" x2="${sheetW}" y2="${cellH}"/>
    </g>
    <g stroke="${ink}" stroke-width="0.35" stroke-dasharray="2 1.5" opacity=".7">
      <line x1="${cellW}" y1="${cellH}" x2="${cellW * 3}" y2="${cellH}"/>
    </g>
    <text x="${cellW * 2}" y="${cellH - 1.5}" text-anchor="middle" font-family="${esc(sys.type.mono)}" font-size="2.4" fill="${ink}" opacity=".7">cut along this line</text>`;

  return svg([sheetW, sheetH], `<rect width="${sheetW}" height="${sheetH}" fill="${paper}"/>${cells}${marks}`, 'An eight-page zine, imposed for one fold and one cut');
}

/**
 * Everything about a system that will surprise you on paper — collected once so
 * the print artefacts and the CLI say the same thing.
 */
export function printWarnings(sys) {
  const roles = Object.entries(sys.colour).filter(([, v]) => typeof v === 'string' && v.startsWith('#'));
  const out = [];
  for (const [role, hex] of roles) {
    const check = checkPrint(hex);
    if (!check.shift.inGamut) {
      const [, C] = hexToOklch(hex);
      out.push({
        role,
        hex,
        becomes: check.shift.as,
        distance: check.shift.distance,
        says: `${role} (${hex}) is outside CMYK — expect roughly ${check.shift.as} on paper.`,
      });
    }
    if (check.coverage > 300) {
      out.push({ role, hex, says: `${role} is ${check.coverage}% ink. Over 300% will not dry.` });
    }
  }
  return { warnings: out, safe: out.length === 0 };
}
