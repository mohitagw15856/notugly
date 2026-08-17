// A receipts table for the "0 bytes runtime" claim.
//
// Every export in this project says "no dependency, nothing to install" and
// leaves it there. This puts a number next to the alternative, so the claim
// is something you can check rather than a thing you're asked to take on
// faith — the same reason the README doesn't just say "provably not ugly"
// without an `audit` command behind it.
//
// The comparison figures are approximate: gzipped, minified size for a
// *typical* use of each approach, not a live fetch from a package registry.
// A network figure here would go stale silently and quietly become a lie;
// a labelled estimate goes stale visibly, which is the honest failure mode.
// This table is the one place to update them.

export const AS_OF = '2026';

export const APPROACHES = [
  {
    name: 'notugly',
    kind: 'static export',
    runtimeKb: 0,
    dependencies: 0,
    note: 'CSS custom properties and plain components. Nothing to npm install, no provider to mount, no version to keep patched.',
  },
  {
    name: 'Tailwind Play CDN',
    kind: 'CDN script',
    runtimeKb: 350,
    dependencies: 0,
    note: "Compiles utility classes in the browser on every page load — Tailwind's own docs say not to use this in production.",
  },
  {
    name: 'Bootstrap 5 (CSS + JS bundle)',
    kind: 'npm package',
    runtimeKb: 60,
    dependencies: 1,
    note: 'One shared stylesheet ships whether a page uses ten classes or all of them.',
  },
  {
    name: 'MUI (Material UI) core',
    kind: 'npm package + runtime',
    runtimeKb: 90,
    dependencies: 3,
    note: 'A component runtime with its own theme provider and re-render cost — this figure is core plus one component, not the whole library.',
  },
  {
    name: 'Chakra UI',
    kind: 'npm package + runtime',
    runtimeKb: 100,
    dependencies: 4,
    note: 'Emotion-based CSS-in-JS: styles are computed in the browser at runtime rather than shipped as static CSS.',
  },
  {
    name: 'A downloaded Google Font, average weight',
    kind: 'webfont',
    runtimeKb: 180,
    dependencies: 0,
    note: 'Blocks first paint until it arrives. This project ships only system font stacks for exactly this reason.',
  },
];

export function benchmark() {
  const rows = APPROACHES.map((a) => ({ ...a }));
  const notugly = rows.find((r) => r.name === 'notugly');
  const others = rows.filter((r) => r !== notugly);
  const cheapest = others.reduce((a, b) => (a.runtimeKb < b.runtimeKb ? a : b));

  return {
    asOf: AS_OF,
    rows,
    savingsKb: cheapest.runtimeKb,
    note: `Figures are approximate, typical-use gzip/minified estimates as of ${AS_OF} — not a live registry fetch. They will drift as those projects release new majors; this repo has no dependencies to drift.`,
  };
}
