#!/usr/bin/env node
// Generates the README's artwork, then the README itself.
//
// The pictures in this README are made by the thing the README is about. If
// the generator regresses, the front page shows it — which is a better test
// than any assertion.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { avatar, STYLES, MOODS } from '../lib/avatar.mjs';
import { persona, card } from '../lib/persona.mjs';
import { mascot } from '../lib/mascot.mjs';
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

// One name, every style. Twenty in a row would be 1900px wide and render at
// thumbnail size on GitHub, so it wraps.
writeFileSync(`${ROOT}assets/readme/styles.svg`, (() => {
  const size = 84;
  const gap = 12;
  const perRow = 10;
  const rows = Math.ceil(STYLES.length / perRow);
  const w = Math.min(STYLES.length, perRow) * (size + gap) - gap;
  const h = rows * (size + gap) - gap;
  const inner = STYLES.map((s, i) => {
    const svg = avatar('mo', { style: s, size, on: PAGE, label: s })
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');
    const x = (i % perRow) * (size + gap);
    const y = Math.floor(i / perRow) * (size + gap);
    return `<g transform="translate(${x} ${y}) scale(${size / 100})">${svg}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="One name in ${STYLES.length} avatar styles">${inner}</svg>`;
})());

// The same person, every mood. The claim is that it stays the same person, so
// the strip has to be one seed across the whole row.
writeFileSync(`${ROOT}assets/readme/moods.svg`, (() => {
  const size = 96;
  const gap = 14;
  const w = MOODS.length * (size + gap) - gap;
  const inner = MOODS.map((m, i) => {
    const svg = avatar('mo', { style: 'specs', size, on: PAGE, mood: m === 'neutral' ? null : m, label: m })
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');
    return `<g transform="translate(${i * (size + gap)} 0) scale(${size / 100})">${svg}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${w} ${size}" role="img" aria-label="One face in ${MOODS.length} moods">${inner}</svg>`;
})());

// The hand-drawn and creature styles, which are the ones worth showing off.
writeFileSync(`${ROOT}assets/readme/doodles.svg`, (() => {
  const picks = [
    ['pencil', 'ada'], ['pencil', 'linus'], ['specs', 'grace'], ['specs', 'radia'],
    ['line', 'mo'], ['cat', 'siyu'], ['dog', 'alan'], ['duck', 'tim'],
    ['capybara', 'barbara'], ['monster', 'margaret'], ['object', 'donald'], ['ghost', 'katherine'],
  ];
  const size = 104;
  const gap = 10;
  const perRow = 6;
  const w = perRow * (size + gap) - gap;
  const h = Math.ceil(picks.length / perRow) * (size + gap) - gap;
  const inner = picks.map(([style, name], i) => {
    const svg = avatar(name, { style, size, on: PAGE, label: `${name} as a ${style}` })
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');
    return `<g transform="translate(${(i % perRow) * (size + gap)} ${Math.floor(i / perRow) * (size + gap)}) scale(${size / 100})">${svg}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Pencil people, creatures and one-line portraits">${inner}</svg>`;
})());

// A real persona card, generated the same way anyone else's would be.
writeFileSync(`${ROOT}assets/readme/persona.svg`, card(persona('siyu'), { tagline: 'made with notugly' }));

// The mascot, in the states he actually uses.
writeFileSync(`${ROOT}assets/readme/mascot.svg`, (() => {
  const sys = system('notugly', { vibe: 'playful' });
  const states = ['idle', 'happy', 'thinking', 'shocked', 'worried', 'proud'];
  const size = 96;
  const gap = 10;
  const w = states.length * (size + gap) - gap;
  const inner = states.map((st, i) => {
    const svg = mascot(sys.colour, { size, state: st, id: `m${i}` })
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');
    return `<g transform="translate(${i * (size + gap)} 0) scale(${size / 100})">${svg}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${w} ${size}" role="img" aria-label="The notugly mascot in six moods">${inner}</svg>`;
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
