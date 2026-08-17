// RTL readiness: a static scan for CSS that assumes left-to-right.
//
// The usual RTL bug is not a missing translation. It's a `margin-left` that
// nobody thought to make logical, so the layout that works perfectly in
// Arabic still has its icon glued to the wrong side. That is a thing you can
// grep for — no browser, no locale switch, no visual regression tool
// required — so this checks the CSS this project itself generates, the same
// way `audit()` checks its own contrast rather than trusting the palette
// looked fine.

import { toCss, toHtml } from './export.mjs';

// Physical properties with a direction baked in, and the flow-relative
// property that survives a language switch instead of needing a mirrored
// stylesheet.
const PHYSICAL_TO_LOGICAL = {
  'margin-left': 'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start',
  'padding-right': 'padding-inline-end',
  'border-left': 'border-inline-start',
  'border-right': 'border-inline-end',
  'border-top-left-radius': 'border-start-start-radius',
  'border-top-right-radius': 'border-start-end-radius',
  'text-align: left': 'text-align: start',
  'text-align:left': 'text-align:start',
  'text-align: right': 'text-align: end',
  'text-align:right': 'text-align:end',
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Scan one piece of CSS text for physical left/right properties. */
export function checkRtl(css, { label = 'stylesheet' } = {}) {
  const findings = [];
  for (const [physical, logical] of Object.entries(PHYSICAL_TO_LOGICAL)) {
    const matches = css.match(new RegExp(escapeRe(physical), 'g'));
    if (matches) {
      findings.push({
        physical,
        logical,
        count: matches.length,
        says: `${matches.length}× "${physical}" — becomes "${logical}" under RTL, not mirrored automatically.`,
      });
    }
  }
  return { label, findings, passed: findings.length === 0 };
}

/** Run the scan across every stylesheet this system actually produces. */
export function checkSystemRtl(sys) {
  const targets = { 'notugly.css': toCss(sys), 'index.html': toHtml(sys) };
  const results = Object.entries(targets).map(([label, css]) => checkRtl(css, { label }));
  return { results, passed: results.every((r) => r.passed) };
}
