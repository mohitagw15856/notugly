// A legal-style accessibility statement — the document a public-sector site,
// and increasingly anyone selling into one, is expected to publish alongside
// the product: what conformance level is claimed, when it was checked, and
// what is known not to be covered.
//
// It is built from the same `audit()` result `notugly audit` prints, so the
// statement can never claim a level the numbers behind it don't support —
// and it is explicit about what this tool did NOT check, because a
// contrast-only claim of "WCAG AA" from a colour generator is exactly the
// kind of overclaim that makes accessibility statements untrustworthy.

import { audit } from './system.mjs';
import { AA_TEXT, AAA_TEXT } from './color.mjs';

const today = () => new Date().toISOString().slice(0, 10);

export function accessibilityStatement(sys, { org = null, url = null, contact = null, date = today() } = {}) {
  const a = audit(sys);
  const name = org || `${sys.vibeLabel} (seed ${sys.seed})`;

  const level = !a.passed ? 'partial' : a.weakest.ratio >= AAA_TEXT ? 'AA, exceeding AAA on colour contrast' : 'AA';

  const exceptions = a.failed.map((r) => `${r.name} is ${r.ratio}:1, below the ${r.target}:1 this level requires.`);

  const notChecked = [
    'Keyboard navigation and focus order',
    'Screen reader semantics, landmarks and alt text',
    'Captions or transcripts for audio and video',
    'Form validation messaging',
    'Anything about motion beyond the presence of `prefers-reduced-motion` in the generated CSS',
  ];

  const sections = [
    [`# Accessibility statement`, `**${name}**${url ? ` — ${url}` : ''}`, `Last checked: ${date}`],
    [
      `## Conformance status`,
      a.passed
        ? `Colour contrast in this design system conforms to **WCAG 2.1 Level ${level}** (Success Criterion 1.4.3, and 1.4.11 for non-text elements). The weakest pairing anywhere in the system — ${a.weakest.name} — measures ${a.weakest.ratio}:1 against a ${a.weakest.target}:1 requirement.`
        : `Colour contrast in this design system **does not yet conform** to WCAG 2.1 Level AA. ${a.failed.length} pairing(s) fall short:\n\n${exceptions.map((e) => `- ${e}`).join('\n')}`,
    ],
    [
      `## Scope of this statement`,
      `This statement covers **colour contrast only** — the one property a design-system generator can measure and guarantee mechanically. It says nothing about keyboard access, screen-reader semantics, captions, or any other WCAG success criterion. Specifically, this tool did not check:\n\n${notChecked.map((n) => `- ${n}`).join('\n')}`,
    ],
    [
      `## How this was measured`,
      `WCAG 2.1 relative luminance contrast, computed directly from the rendered colours — not estimated, not sampled from a screenshot. Every pairing a person is actually asked to read (body text, muted text, button labels, focus indicators, borders) was checked against the specific background it sits on.`,
    ],
    contact ? [`## Feedback`, `Report an accessibility problem: ${contact}`] : [],
  ];

  const markdown = sections
    .filter((s) => s.length)
    .map((s) => s.join('\n\n'))
    .join('\n\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Accessibility statement — ${esc(name)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Charter, Georgia, serif; max-width: 68ch; margin: 2rem auto; line-height: 1.5; color: #14161a; }
  h1 { font-size: 1.6rem; }
  h2 { font-size: 1.1rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: .25rem; }
  .status { font-weight: 600; }
  .pass { color: #0a6b3d; }
  .fail { color: #a3122c; }
  code, .mono { font-family: ui-monospace, monospace; }
  ul { padding-left: 1.25rem; }
</style>
</head>
<body>
  <h1>Accessibility statement</h1>
  <p><strong>${esc(name)}</strong>${url ? ` — ${esc(url)}` : ''}<br><span class="mono">Last checked: ${date}</span></p>

  <h2>Conformance status</h2>
  <p class="status ${a.passed ? 'pass' : 'fail'}">
    ${a.passed
      ? `Colour contrast conforms to WCAG 2.1 Level ${esc(level)}. Weakest pairing: ${esc(a.weakest.name)} at ${a.weakest.ratio}:1 (needs ${a.weakest.target}:1).`
      : `Colour contrast does not yet conform to WCAG 2.1 Level AA — ${a.failed.length} pairing(s) fall short.`}
  </p>
  ${a.passed ? '' : `<ul>${exceptions.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`}

  <h2>Scope of this statement</h2>
  <p>This statement covers <strong>colour contrast only</strong>. It says nothing about keyboard access, screen-reader semantics, captions, or any other WCAG success criterion. This tool did not check:</p>
  <ul>${notChecked.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>

  <h2>How this was measured</h2>
  <p>WCAG 2.1 relative luminance contrast, computed directly from the rendered colours. Every pairing a person is actually asked to read was checked against the specific background it sits on.</p>

  ${contact ? `<h2>Feedback</h2><p>Report an accessibility problem: ${esc(contact)}</p>` : ''}
</body>
</html>
`;

  return { level, date, passed: a.passed, weakest: a.weakest, failed: a.failed, notChecked, markdown, html };
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
