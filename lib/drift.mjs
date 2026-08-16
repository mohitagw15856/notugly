// Design drift.
//
// Design systems do not fail all at once. They fail one exception at a time —
// a slightly different grey for a banner, a one-off radius on a modal, a
// heading in a typeface that only appears on the pricing page. Individually
// every one of those is reasonable. Collectively, eighteen months later,
// nobody can tell you what the brand colour is.
//
// So: record what a site looked like, and say what changed. No dashboard, no
// account, no server — a JSON file you can commit next to the code, which means
// the drift shows up in a pull request diff like everything else.

import { contrast, hexToOklch } from './color.mjs';
import { perceptualDistance } from './quantise.mjs';
import { nameAll } from './names.mjs';

/**
 * A snapshot of a design, small enough to commit and stable enough to diff.
 *
 * Deliberately not the whole DNA — counts and rounded values only. A baseline
 * that changes whenever a minifier reorders a stylesheet is a baseline nobody
 * keeps.
 */
export function snapshot(dna, { at = null } = {}) {
  const colours = (dna.colours ?? []).map((c) => (typeof c === 'string' ? c : c.value));
  const fonts = [...new Set((dna.fonts ?? []).map((f) => String(typeof f === 'object' ? f.value : f).split(',')[0].replace(/["']/g, '').trim()))].filter(Boolean);
  const radii = [...new Set((dna.radii ?? []).map((r) => parseFloat(typeof r === 'object' ? r.value : r)).filter(Number.isFinite))].sort((a, b) => a - b);
  const sizes = [...new Set((dna.fontSizes ?? []).map((s) => Number(typeof s === 'object' ? s.value : s)).filter(Boolean))].sort((a, b) => a - b);

  return {
    url: dna.url ?? null,
    // Passed in rather than read from the clock, so a snapshot is reproducible
    // and a test can assert on it.
    at,
    colours: colours.sort(),
    greys: colours.filter((c) => hexToOklch(c)[1] < 0.03).length,
    fonts: fonts.sort(),
    radii,
    sizes,
    shadows: (dna.shadows ?? []).length,
  };
}

/**
 * What changed between two snapshots, and whether any of it matters.
 *
 * The distinction is the whole point. A palette that gained one colour is
 * noise. A palette that gained its fifth near-identical grey is the beginning
 * of the end, and it should be reported differently.
 */
export function drift(before, after) {
  const findings = [];

  const added = after.colours.filter((c) => !before.colours.includes(c));
  const removed = before.colours.filter((c) => !after.colours.includes(c));

  for (const hex of added) {
    // Is this actually a new colour, or a slightly different version of one
    // that already existed? The second is what kills a design system, and it
    // is invisible in a normal diff.
    // 0.02 is roughly the smallest difference anyone can see. Looser than that
    // and a legitimate card-on-page pair (#f4f4f4 on #ffffff) gets reported as
    // a duplicated token, which trains people to ignore the report.
    const twin = before.colours.find((old) => perceptualDistance(old, hex) < 0.02);
    if (twin) {
      findings.push({
        level: 'warn',
        kind: 'near-duplicate',
        says: `${hex} was added, and it is almost exactly ${twin} — ${perceptualDistance(twin, hex).toFixed(3)} apart in OKLab. Somebody could not find the existing token.`,
        detail: { added: hex, existing: twin },
      });
    } else {
      findings.push({ level: 'info', kind: 'new-colour', says: `New colour ${hex} (${nameAll([hex])[0].name}).`, detail: { added: hex } });
    }
  }

  if (after.greys > before.greys) {
    findings.push({
      level: after.greys >= 8 ? 'error' : 'warn',
      kind: 'greys',
      says: `${before.greys} greys became ${after.greys}.${after.greys >= 8 ? ' That is past the point where anyone can tell them apart.' : ''}`,
      detail: { before: before.greys, after: after.greys },
    });
  }

  const newFonts = after.fonts.filter((f) => !before.fonts.includes(f));
  if (newFonts.length) {
    findings.push({
      level: after.fonts.length > 3 ? 'error' : 'warn',
      kind: 'fonts',
      says: `New typeface${newFonts.length > 1 ? 's' : ''}: ${newFonts.join(', ')}. That makes ${after.fonts.length}.`,
      detail: { added: newFonts, total: after.fonts.length },
    });
  }

  const newRadii = after.radii.filter((r) => !before.radii.includes(r));
  if (newRadii.length) {
    findings.push({
      level: after.radii.length > 5 ? 'warn' : 'info',
      kind: 'radii',
      says: `New corner radi${newRadii.length > 1 ? 'i' : 'us'}: ${newRadii.join('px, ')}px. That makes ${after.radii.length} in total.`,
      detail: { added: newRadii, total: after.radii.length },
    });
  }

  const newSizes = after.sizes.filter((s) => !before.sizes.includes(s));
  if (newSizes.length > 2) {
    findings.push({
      level: 'warn',
      kind: 'type-sizes',
      says: `${newSizes.length} new type sizes (${newSizes.join(', ')}px). A scale with ${after.sizes.length} steps is not a scale.`,
      detail: { added: newSizes, total: after.sizes.length },
    });
  }

  if (removed.length) {
    findings.push({ level: 'info', kind: 'removed', says: `${removed.length} colour(s) no longer used: ${removed.join(', ')}.`, detail: { removed } });
  }

  const worst = findings.some((f) => f.level === 'error') ? 'error' : findings.some((f) => f.level === 'warn') ? 'warn' : findings.length ? 'info' : 'clean';

  return {
    from: before.at,
    to: after.at,
    url: after.url ?? before.url,
    findings,
    level: worst,
    drifted: findings.some((f) => f.level !== 'info'),
    summary:
      worst === 'clean'
        ? 'No drift.'
        : `${findings.length} change${findings.length === 1 ? '' : 's'}, ${findings.filter((f) => f.level !== 'info').length} worth looking at.`,
  };
}

/** The report as text, which is what a CI log and an email both want. */
export function driftText(report) {
  const mark = { error: '✗', warn: '!', info: '·' };
  const lines = [`${report.url ?? 'design'} — ${report.summary}`];
  if (report.from || report.to) lines.push(`${report.from ?? 'baseline'} → ${report.to ?? 'now'}`);
  lines.push('');
  for (const f of report.findings) lines.push(`  ${mark[f.level]} ${f.says}`);
  return lines.join('\n');
}
