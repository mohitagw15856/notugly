#!/usr/bin/env node
// Generates the README's artwork, then the README itself.
//
// The pictures in this README are made by the thing the README is about. If
// the generator regresses, the front page shows it — which is a better test
// than any assertion.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { avatar, STYLES } from '../lib/avatar.mjs';
import { system, audit } from '../lib/system.mjs';
import { VIBES, VIBE_NAMES } from '../lib/vibe.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(`${ROOT}assets/readme`, { recursive: true });

const PAGE = '#ffffff'; // GitHub light; the avatars are checked against it

// --- a row of faces, which is the banner -------------------------------------
const CAST = ['mo', 'siyu', 'ada', 'grace', 'linus', 'radia', 'katherine', 'alan'];

const strip = (names, style, { size = 100, gap = 14 } = {}) => {
  const w = names.length * (size + gap) - gap;
  const inner = names
    .map((n, i) => {
      const svg = avatar(n, { style, size, on: PAGE, label: n })
        .replace(/^<svg[^>]*>/, '')
        .replace(/<\/svg>$/, '');
      return `<g transform="translate(${i * (size + gap)} 0) scale(${size / 100})">${svg}</g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${w} ${size}" role="img" aria-label="A row of generated avatars">${inner}</svg>`;
};

writeFileSync(`${ROOT}assets/readme/cast.svg`, strip(CAST, 'face'));

// One name, every style — the "eight styles" claim, shown rather than stated.
writeFileSync(`${ROOT}assets/readme/styles.svg`, (() => {
  const size = 84;
  const gap = 12;
  const w = STYLES.length * (size + gap) - gap;
  const inner = STYLES.map((s, i) => {
    const svg = avatar('mo', { style: s, size, on: PAGE, label: s })
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');
    return `<g transform="translate(${i * (size + gap)} 0) scale(${size / 100})">${svg}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${w} ${size}" role="img" aria-label="One name in eight avatar styles">${inner}</svg>`;
})());

// --- a card per vibe ---------------------------------------------------------
for (const v of VIBE_NAMES) {
  const s = system('notugly', { vibe: v });
  const W = 320;
  const H = 190;
  const swatches = s.colour.primary
    .slice(2, 10)
    .map((hex, i) => `<rect x="${16 + i * 36}" y="120" width="30" height="30" rx="${Math.min(8, s.radius.sm)}" fill="${hex}"/>`)
    .join('');
  writeFileSync(
    `${ROOT}assets/readme/vibe-${v}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${VIBES[v].label} vibe">
      <rect width="${W}" height="${H}" rx="${Math.min(18, s.radius.lg)}" fill="${s.colour.bg}" stroke="${s.colour.border}"/>
      <text x="16" y="42" font-family="${s.type.heading.split(',')[0]}, serif" font-size="26" font-weight="bold" fill="${s.colour.text}">${VIBES[v].label}</text>
      <rect x="16" y="60" width="120" height="34" rx="${Math.min(12, s.radius.md)}" fill="${s.colour.buttonBg}"/>
      <text x="76" y="82" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="${s.colour.buttonText}">Button</text>
      <text x="150" y="82" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${s.colour.textMuted}">muted text</text>
      ${swatches}
      <text x="16" y="175" font-family="ui-monospace, monospace" font-size="10" fill="${s.colour.textMuted}">${audit(s).weakest.ratio}:1 weakest · WCAG AA</text>
    </svg>`
  );
}

// --- the numbers the README quotes ------------------------------------------
let combos = 0;
let passing = 0;
for (const v of VIBE_NAMES) {
  for (const dark of [false, true]) {
    for (let i = 0; i < 200; i++) {
      const s = system(`sample-${i}`, { vibe: v, dark });
      combos++;
      if (audit(s).passed) passing++;
    }
  }
}

const stats = { combos, passing, styles: STYLES.length, vibes: VIBE_NAMES.length };
writeFileSync(`${ROOT}assets/readme/stats.json`, JSON.stringify(stats, null, 2) + '\n');

console.log(
  `✓ readme art — ${CAST.length} faces, ${STYLES.length} styles, ${VIBE_NAMES.length} vibes · ` +
    `${passing}/${combos} sampled systems pass WCAG AA`
);

if (passing !== combos) {
  console.error(`✗ ${combos - passing} generated systems failed their own audit`);
  process.exit(1);
}
