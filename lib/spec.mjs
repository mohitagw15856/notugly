// The artefacts you take into a room with other people.
//
// Everything else in this repo makes designs. This file makes *documents about*
// designs, which is a different job with a different audience. A product
// manager does not need a colour picker; they need one page that says what is
// wrong, how wrong, and roughly what it costs to fix — in a form they can paste
// into a doc without reformatting it.
//
// Every number here is measured. None of it is estimated by a model.

import { contrast, hexToOklch, AA_TEXT, AA_LARGE, rate } from './color.mjs';
import { nameAll, name as nameColour } from './names.mjs';
import { apca, apcaAdvice } from './apca.mjs';
import { fixContrast } from './fix.mjs';
import { collisions } from './vision.mjs';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const round = (n, p = 2) => +Number(n).toFixed(p);

// --- the spec sheet -----------------------------------------------------------

/**
 * What a design is made of, as a table.
 *
 * Takes `extract()` output — so this works on somebody else's site as well as
 * your own. The intended use is unglamorous and very common: a competitor does
 * something you like, and you need to describe it precisely enough for an
 * engineer to build it.
 */
export function specSheet(dna, { title = null } = {}) {
  const colours = (dna.colours ?? []).map((c) => (typeof c === 'string' ? c : c.value));
  const named = nameAll(colours);
  const bg = dna.summary?.background ?? colours[0] ?? '#ffffff';

  const palette = named.map((n, i) => {
    const ratio = round(contrast(n.hex, bg));
    return {
      hex: n.hex,
      name: n.name,
      uses: typeof dna.colours?.[i] === 'object' ? dna.colours[i].count : null,
      onBackground: ratio,
      readable: ratio >= AA_TEXT,
      role: roleOf(n.hex, bg, ratio),
    };
  });

  const sizes = (dna.fontSizes ?? []).map((s) => Number(typeof s === 'object' ? s.value : s)).filter(Boolean);
  const uniqueSizes = [...new Set(sizes)].sort((a, b) => a - b);

  // A type scale has a ratio. If consecutive steps do not share one, the sizes
  // were picked individually — which is the single most common finding.
  const steps = uniqueSizes.filter((s) => s >= 10);
  const ratios = steps.slice(1).map((s, i) => round(s / steps[i], 3));
  const median = ratios.length ? [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length / 2)] : null;
  const consistent = ratios.length > 1 && ratios.every((r) => Math.abs(r - median) < 0.08);

  const fonts = [...new Set((dna.fonts ?? []).map((f) => String(typeof f === 'object' ? f.value : f).split(',')[0].replace(/["']/g, '').trim()))].filter(Boolean);
  const radii = [...new Set((dna.radii ?? []).map((r) => (typeof r === 'object' ? r.value : r)))];

  return {
    title: title || dna.url || 'Design spec',
    source: dna.url ?? null,
    palette,
    greys: palette.filter((p) => hexToOklch(p.hex)[1] < 0.03).length,
    type: {
      families: fonts,
      sizes: uniqueSizes,
      ratio: median,
      consistent,
      note: consistent
        ? `Consistent ${median}× scale.`
        : ratios.length > 1
          ? `No consistent ratio — steps run ${ratios.join(', ')}. These sizes were chosen one at a time.`
          : 'Not enough sizes to infer a scale.',
    },
    radii,
    radiusNote:
      radii.length > 4
        ? `${radii.length} different corner radii. Nobody chose these; they accumulated.`
        : radii.length
          ? `${radii.length} radius value${radii.length === 1 ? '' : 's'}.`
          : 'No radii found.',
    shadows: (dna.shadows ?? []).length,
    // Anything that fails AA and is not effectively the background itself.
    // Restricting this to colours *inferred* to be text under-reports badly:
    // the stylesheet does not tell us which property a colour came from, so a
    // #cccccc that is somebody's body copy gets guessed as a border and
    // silently dropped from the findings.
    failing: palette.filter((p) => p.role !== 'background' && !p.readable),
  };
}

// A colour's likely job, inferred from how it sits against the background.
function roleOf(hex, bg, ratio) {
  const [L, C] = hexToOklch(hex);
  if (ratio < 1.15) return 'background';
  if (C < 0.03) return ratio >= AA_TEXT ? 'text' : 'border';
  if (ratio >= AA_TEXT) return 'text';
  if (ratio >= AA_LARGE) return 'large-text';
  return L > 0.5 ? 'surface' : 'accent';
}

/** The spec sheet as markdown, which is the format it actually gets pasted into. */
export function specMarkdown(spec) {
  const lines = [`# ${spec.title}`, ''];
  if (spec.source) lines.push(`Source: ${spec.source}`, '');

  lines.push('## Colour', '', '| Colour | Name | Hex | On background | Role |', '|---|---|---|---|---|');
  for (const p of spec.palette.slice(0, 16)) {
    lines.push(
      `| ${swatchCell(p.hex)} | ${p.name} | \`${p.hex}\` | ${p.onBackground}:1${p.role === 'text' && !p.readable ? ' ⚠️' : ''} | ${p.role} |`
    );
  }
  lines.push('', `${spec.palette.length} colours, ${spec.greys} of them grey.`, '');

  lines.push('## Type', '', `**Families:** ${spec.type.families.join(', ') || 'none found'}`, '');
  if (spec.type.sizes.length) lines.push(`**Sizes:** ${spec.type.sizes.join(', ')}px`, '');
  lines.push(spec.type.note, '');

  lines.push('## Shape', '', `**Radii:** ${spec.radii.join(', ') || 'none'}`, '', spec.radiusNote, '');
  lines.push(`**Shadows:** ${spec.shadows} distinct value${spec.shadows === 1 ? '' : 's'}`, '');

  if (spec.failing.length) {
    lines.push('## Will not pass', '');
    for (const f of spec.failing) {
      const fix = fixContrast(f.hex, spec.palette[0].hex);
      lines.push(`- \`${f.hex}\` (${f.name}) is ${f.onBackground}:1 — needs 4.5. ${fix.changed ? `\`${fix.to}\` clears it.` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// GitHub renders an inline SVG data URI in a table cell, which is the only way
// to get a colour swatch into markdown without hosting an image somewhere.
const swatchCell = (hex) =>
  `<img src="data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" rx="3" fill="${hex}"/></svg>`
  )}" width="16" height="16" alt="">`;

// --- the comparison -----------------------------------------------------------

/**
 * Two designs, with the differences called out.
 *
 * The point is not to declare a winner. It is to replace "theirs feels more
 * premium" with "theirs uses two typefaces and four greys; ours uses five and
 * eleven" — a sentence nobody can argue with.
 */
export function compare(a, b, { labels = ['A', 'B'] } = {}) {
  const sa = a.palette ? a : specSheet(a);
  const sb = b.palette ? b : specSheet(b);

  const rows = [
    metric('Colours', sa.palette.length, sb.palette.length, 'fewer'),
    metric('Greys', sa.greys, sb.greys, 'fewer'),
    metric('Typefaces', sa.type.families.length, sb.type.families.length, 'fewer'),
    metric('Type sizes', sa.type.sizes.length, sb.type.sizes.length, 'fewer'),
    metric('Corner radii', sa.radii.length, sb.radii.length, 'fewer'),
    metric('Shadow values', sa.shadows, sb.shadows, 'fewer'),
    metric('Unreadable pairs', sa.failing.length, sb.failing.length, 'fewer'),
  ];

  return {
    labels,
    a: sa,
    b: sb,
    rows,
    // Consistency, not taste. A design with one type scale and four greys is
    // more consistent than one with five scales and eleven — that is a fact,
    // and it is a different claim from "better".
    tidier: rows.filter((r) => r.winner === 0).length >= rows.filter((r) => r.winner === 1).length ? labels[0] : labels[1],
    scaleAgreement: { [labels[0]]: sa.type.consistent, [labels[1]]: sb.type.consistent },
  };
}

function metric(label, av, bv, better) {
  const winner = av === bv ? null : (better === 'fewer') === av < bv ? 0 : 1;
  return { label, a: av, b: bv, winner, delta: Math.abs(av - bv) };
}

export function compareMarkdown(cmp) {
  const [A, B] = cmp.labels;
  const lines = [
    `# ${A} vs ${B}`,
    '',
    `| | ${A} | ${B} | |`,
    '|---|---|---|---|',
    ...cmp.rows.map(
      (r) => `| **${r.label}** | ${r.a} | ${r.b} | ${r.winner === null ? '—' : `${cmp.labels[r.winner]} by ${r.delta}`} |`
    ),
    '',
    `**Type scale is consistent:** ${A} ${cmp.scaleAgreement[A] ? 'yes' : 'no'} · ${B} ${cmp.scaleAgreement[B] ? 'yes' : 'no'}`,
    '',
    `${cmp.tidier} is the more consistent of the two. That is a measurement, not a verdict on which looks better.`,
  ];
  return lines.join('\n');
}

// --- the accessibility one-pager ---------------------------------------------

/**
 * One page. What passes, what does not, what it costs to fix.
 *
 * Deliberately a single self-contained HTML file that prints to one sheet of
 * A4 — because the format that gets read in a review is the one somebody can
 * put on the table.
 */
export function onePager(input, { title = 'Accessibility review', bg = null } = {}) {
  // A generated system knows what each colour is *for*, so use that. Grading a
  // border as if it were body copy is how you end up reporting that a design
  // which passes its own audit has three failures — a report nobody will
  // believe twice.
  const isSystem = Boolean(input?.colour?.bg);
  const background = bg || (isSystem ? input.colour.bg : Array.isArray(input) ? input[0] : input.colours?.[0]?.value) || '#ffffff';

  let judged;
  if (isSystem) {
    const c = input.colour;
    judged = [
      ['body text', c.text, AA_TEXT],
      ['muted text', c.textMuted, AA_TEXT],
      ['brand text', c.brand, AA_TEXT],
      ['accent text', c.accent, AA_TEXT],
      ['button label', c.buttonText, AA_TEXT, c.buttonBg],
      ['focus ring', c.focus, AA_LARGE],
    ].map(([label, fg, target, over]) => ({ label, fg, target, over: over || background }));
  } else {
    const colours = Array.isArray(input) ? input : (input.colours ?? []).map((x) => (typeof x === 'string' ? x : x.value));
    judged = colours
      .filter((fg) => fg !== background)
      .map((fg) => {
        const ratio = contrast(fg, background);
        const role = roleOf(fg, background, ratio);
        return { label: nameColour(fg).name, fg, over: background, role, target: role === 'border' ? 1.4 : AA_TEXT };
      })
      // A colour that is plainly the page background is not a failing pairing.
      .filter((p) => p.role !== 'background');
  }

  const pairs = judged
    .map((p) => {
      const ratio = round(contrast(p.fg, p.over));
      const fix = fixContrast(p.fg, p.over, { target: p.target });
      return {
        ...p,
        ratio,
        grade: rate(ratio),
        pass: ratio >= p.target,
        passLarge: ratio >= AA_LARGE,
        lc: apca(p.fg, p.over),
        use: apcaAdvice(apca(p.fg, p.over)).use,
        fix: fix.changed ? fix.to : null,
        moved: fix.moved ?? 0,
        name: nameColour(p.fg).name,
      };
    })
    .sort((a, b) => a.ratio / a.target - b.ratio / b.target);

  const failing = pairs.filter((p) => !p.pass);
  const allColours = isSystem
    ? Object.values(input.colour).filter((v) => typeof v === 'string' && v.startsWith('#'))
    : pairs.map((p) => p.fg).concat(background);
  const merges = collisions([...new Set(allColours)]);

  // Effort, stated as what it actually is: how far each colour has to move.
  // A colour that needs a 0.01 nudge is a find-and-replace; one that needs 0.3
  // is a visual decision somebody has to make and sign off.
  const effort = failing.reduce(
    (acc, f) => {
      if (!f.fix) acc.blocked++;
      else if (f.moved < 0.05) acc.trivial++;
      else if (f.moved < 0.15) acc.small++;
      else acc.judgement++;
      return acc;
    },
    { trivial: 0, small: 0, judgement: 0, blocked: 0 }
  );

  return {
    title,
    background,
    pairs,
    failing,
    passing: pairs.filter((p) => p.pass),
    collisions: merges,
    effort,
    // Each pairing is graded against the bar for its own job — a focus ring
    // needs 3:1, not 4.5:1 — which is why this can disagree with a naive
    // checker that grades everything as body text.
    verdict:
      failing.length === 0
        ? `All ${pairs.length} pairings clear the bar for what they are used for.`
        : `${failing.length} of ${pairs.length} pairings fail.`,
    headline:
      failing.length === 0
        ? 'No contrast work needed.'
        : `${effort.trivial + effort.small} are a find-and-replace. ${effort.judgement} need a design decision.${effort.blocked ? ` ${effort.blocked} cannot be fixed without changing the background.` : ''}`,
  };
}

/** The one-pager as a self-contained, printable HTML page. */
export function onePagerHtml(page) {
  const row = (p) => `
    <tr class="${p.pass ? 'ok' : 'bad'}">
      <td><i style="background:${p.fg}"></i><code>${p.fg}</code></td>
      <td>${esc(p.label ?? p.name)}</td>
      <td class="n">${p.ratio}:1</td>
      <td>${p.pass ? p.grade.toUpperCase() : p.passLarge ? 'large only' : 'fail'}<br><small>needs ${p.target}</small></td>
      <td class="n">${p.lc}</td>
      <td>${p.fix ? `<i style="background:${p.fix}"></i><code>${p.fix}</code>` : '—'}</td>
    </tr>`;

  return `<!doctype html>
<meta charset="utf-8">
<title>${esc(page.title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 12px/1.5 -apple-system, system-ui, sans-serif; color: #16181d; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 22px; margin: 0 0 .2rem; }
  .sub { color: #5b6270; margin: 0 0 1.2rem; }
  .headline { background: #f4f6f8; border-left: 4px solid #16181d; padding: .8rem 1rem; margin: 0 0 1.4rem; font-size: 14px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1.4rem; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #5b6270; border-bottom: 1px solid #d6dae0; padding: .3rem .4rem; }
  td { padding: .35rem .4rem; border-bottom: 1px solid #eef0f3; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  tr.bad td { background: #fff5f5; }
  i { display: inline-block; width: 12px; height: 12px; border-radius: 2px; border: 1px solid rgba(0,0,0,.15); vertical-align: -2px; margin-right: .35rem; }
  code { font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .effort { display: flex; gap: 1.4rem; margin-bottom: 1.2rem; }
  .effort div { flex: 1; }
  .effort b { display: block; font-size: 22px; }
  .effort span { font-size: 11px; color: #5b6270; }
  footer { color: #7c828e; font-size: 10px; border-top: 1px solid #eef0f3; padding-top: .6rem; }
  @media print { body { margin: 0; max-width: none; } }
</style>
<h1>${esc(page.title)}</h1>
<p class="sub">Measured against <code>${page.background}</code>. WCAG 2.1 AA needs 4.5:1 for body text.</p>

<p class="headline"><b>${esc(page.verdict)}</b><br>${esc(page.headline)}</p>

<div class="effort">
  <div><b>${page.effort.trivial + page.effort.small}</b><span>find-and-replace — the colour barely moves</span></div>
  <div><b>${page.effort.judgement}</b><span>needs a design decision</span></div>
  <div><b>${page.effort.blocked}</b><span>needs the background changed</span></div>
</div>

<table>
  <tr><th>Colour</th><th>Name</th><th>Contrast</th><th>WCAG</th><th>APCA</th><th>Nearest passing</th></tr>
  ${page.pairs.map(row).join('')}
</table>

${page.collisions.length
  ? `<h2 style="font-size:14px;margin:0 0 .4rem">Colours that merge for some viewers</h2>
     <table><tr><th>Pair</th><th>Condition</th><th>Affects</th></tr>
     ${page.collisions
       .map(
         (c) =>
           `<tr><td><i style="background:${c.pair[0]}"></i><i style="background:${c.pair[1]}"></i><code>${c.pair[0]} + ${c.pair[1]}</code></td><td>${c.kind}</td><td>${c.prevalence}</td></tr>`
       )
       .join('')}</table>`
  : ''}

<footer>
  Every number here is computed, not estimated — WCAG 2.1 relative luminance and APCA-W3 0.1.9,
  with colour vision simulated using Vi&eacute;not/Brettel cone matrices.
  Generated by notugly. No model was involved.
</footer>`;
}

// --- what it will cost --------------------------------------------------------

// Rough weights, stated plainly so anyone can disagree with the number rather
// than with a black box.
const COST = {
  webfontKb: 90, // a typical woff2 weight
  contrastFix: 0.5, // hours, for a colour that only needs nudging
  contrastDecision: 2, // hours, when somebody has to actually choose
  fontRemoval: 3, // hours, to take a typeface out of a live product
  greyConsolidation: 1.5, // hours per redundant grey
};

/**
 * What this design costs to ship and to fix, in the two currencies a product
 * manager is actually asked about: kilobytes and hours.
 *
 * These are estimates from measured inputs, not measurements. The weights are
 * above and they are guesses — good ones, but guesses. The counts they multiply
 * are real.
 */
export function costOf(dna) {
  const spec = dna.palette ? dna : specSheet(dna);

  const webfonts = spec.type.families.filter(
    (f) => !/^(system-ui|-apple-system|sans-serif|serif|monospace|ui-|Segoe|Helvetica|Arial|Georgia|Times|Courier)/i.test(f)
  );
  const weightKb = webfonts.length * COST.webfontKb;

  const failing = spec.failing.length;
  const nudges = spec.failing.filter((f) => {
    const fix = fixContrast(f.hex, spec.palette[0].hex);
    return fix.changed && fix.moved < 0.1;
  }).length;
  const decisions = failing - nudges;

  const redundantGreys = Math.max(0, spec.greys - 5);
  const extraFonts = Math.max(0, spec.type.families.length - 2);

  const hours =
    nudges * COST.contrastFix +
    decisions * COST.contrastDecision +
    extraFonts * COST.fontRemoval +
    redundantGreys * COST.greyConsolidation;

  return {
    weight: {
      webfonts: webfonts.length,
      names: webfonts,
      kb: weightKb,
      note: weightKb
        ? `${weightKb} kB of webfont before anything renders. On a 3G connection that is roughly ${round(weightKb / 50, 1)}s of blank screen.`
        : 'No webfonts. Nothing blocks the first render.',
    },
    fixes: { failing, nudges, decisions, redundantGreys, extraFonts },
    hours: round(hours, 1),
    days: round(hours / 6, 1),
    // Say out loud which parts are estimated.
    basis: 'Counts are measured from the stylesheet. Hours are estimates using the published weights in lib/spec.mjs.',
  };
}
