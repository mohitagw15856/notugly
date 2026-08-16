#!/usr/bin/env node
// notugly — designs that are provably not ugly.
//
//   npx notugly                      a whole system, in your terminal
//   npx notugly avatar mo            an avatar, as SVG
//   npx notugly export --out ./ui    six files you can actually use
//   npx notugly steal example.com    what palette is that site using?
//   npx notugly audit                prove the contrast, don't claim it

import { writeFileSync, mkdirSync } from 'node:fs';
import { system, audit } from '../lib/system.mjs';
import { VIBES, VIBE_NAMES } from '../lib/vibe.mjs';
import { avatar, describe, STYLES } from '../lib/avatar.mjs';
import { exportAll, TARGETS } from '../lib/export.mjs';
import { extract } from '../lib/extract.mjs';
import { staticChecks, CASES } from '../lib/chaos.mjs';
import { toSeed, hash } from '../lib/seed.mjs';
import { contrast } from '../lib/color.mjs';

const argv = process.argv.slice(2);
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (COLOR ? `[${code}m${s}[0m` : s);
const bold = (s) => c(1, s);
const dim = (s) => c(90, s);

const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

// A block of colour in the terminal, using truecolor. In a pipe there is no
// colour to show, so the caller prints the hex instead — printing both gives
// you the hex twice.
const swatch = (hex, width = 6) => {
  if (!COLOR) return '';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `[48;2;${r};${g};${b}m${' '.repeat(width)}[0m`;
};

function usage(code = 0) {
  console.log(`${bold('notugly')} — designs that are provably not ugly

  ${bold('notugly')} [seed]                    generate a whole system
  ${bold('notugly avatar')} <name>             an avatar, deterministic from the name
  ${bold('notugly export')} [seed]             CSS, Tailwind, tokens, React, Svelte, HTML
  ${bold('notugly steal')} <url>               read a real site's palette and type
  ${bold('notugly audit')} [seed]              prove every pairing clears WCAG
  ${bold('notugly chaos')}                     the content that breaks design systems
  ${bold('notugly vibes')}                     the five starting points

${dim('options')}  --vibe ${VIBE_NAMES.join('|')}   --dark   --style ${STYLES.slice(0, 4).join('|')}…
         --out <dir>   --size <px>   --seed <seed>

${dim('Everything is deterministic: the same seed always gives the same design.')}`);
  process.exit(code);
}

// --- the default: show a system ---------------------------------------------
function showSystem(seed) {
  const vibe = flag('vibe', 'editorial');
  const dark = has('dark');
  const sys = system(seed, { vibe, dark });
  const a = audit(sys);

  console.log(`\n  ${bold(sys.vibeLabel)}  ${dim(`seed ${sys.seed}${dark ? ' · dark' : ''}`)}`);
  console.log(`  ${dim(sys.blurb)}\n`);

  const rampLine = (label, arr) =>
    console.log(`  ${dim(label.padEnd(8))} ${COLOR ? arr.map((h) => swatch(h, 3)).join('') : arr.join(' ')}`);
  rampLine('primary', sys.colour.primary);
  rampLine('accent', sys.colour.accentRamp);
  rampLine('neutral', sys.colour.neutral);
  console.log();

  const row = (k, v, extra = '') => console.log(`  ${dim(k.padEnd(14))} ${v} ${extra}`.trimEnd());
  const chip = (hex) => (COLOR ? `${swatch(hex)} ${hex}` : hex);
  row('background', chip(sys.colour.bg));
  row('text', chip(sys.colour.text), dim(`${contrast(sys.colour.text, sys.colour.bg).toFixed(1)}:1`));
  row('brand', chip(sys.colour.brand));
  row('button', chip(sys.colour.buttonBg));
  row('heading font', sys.type.heading.split(',')[0]);
  row('body font', sys.type.body.split(',')[0]);
  row('scale', sys.type.scale.map((s) => s.px).join(' '));
  row('radius', `${sys.radius.md}px`);
  row('shadow', `${sys.shadow.layers.length} layers`);

  console.log(
    `\n  ${a.passed ? c(32, '✓ every text pairing clears WCAG AA') : c(31, '✗ some pairings fail')}` +
      dim(`  · weakest ${a.weakest.ratio}:1 (${a.weakest.name})\n`)
  );
  console.log(`  ${dim(`notugly export ${sys.seed} --vibe ${vibe}${dark ? ' --dark' : ''} --out ./ui`)}\n`);
}

// --- avatar -----------------------------------------------------------------
function cmdAvatar(args) {
  const name = args[0];
  if (!name) {
    console.error('Which name? Try: notugly avatar mo');
    process.exit(2);
  }
  const style = flag('style', 'face');
  const size = Number(flag('size', 200));
  const on = flag('on', null);
  const svg = avatar(name, { style, size, on, label: name });
  const out = flag('out', null);

  if (out) {
    writeFileSync(out, svg);
    const d = describe(name, { style, on });
    console.log(`\n  Wrote ${bold(out)}  ${dim(`${style} · ${d.palette.bg}`)}\n`);
    return;
  }
  console.log(svg);
}

// --- export -----------------------------------------------------------------
function cmdExport(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark') });
  const e = exportAll(sys);
  const out = flag('out', null);

  if (!out) {
    console.log(`\n  ${bold('Six files')}  ${dim(`${sys.vibeLabel} · seed ${sys.seed}`)}\n`);
    for (const [f, s] of Object.entries(e.sizes)) {
      console.log(`  ${f.padEnd(22)} ${dim(s.human.padStart(9))}`);
    }
    console.log(
      `\n  ${dim('runtime cost')} ${c(32, '0 bytes')} ${dim('— static text, no dependency, nothing to install')}`
    );
    console.log(`\n  ${dim(`notugly export ${sys.seed} --out ./ui  writes them`)}\n`);
    return;
  }

  mkdirSync(out, { recursive: true });
  for (const [name, body] of Object.entries(e.files)) writeFileSync(`${out}/${name}`, body);
  console.log(`\n  Wrote ${bold(String(Object.keys(e.files).length))} files to ${bold(out)}`);
  console.log(`  ${e.accessible ? c(32, '✓ WCAG AA throughout') : c(31, '✗ check the audit')}\n`);
}

// --- steal ------------------------------------------------------------------
async function cmdSteal(args) {
  const url = args[0];
  if (!url) {
    console.error('Which site? Try: notugly steal stripe.com');
    process.exit(2);
  }
  const full = /^https?:\/\//.test(url) ? url : `https://${url}`;
  process.stdout.write(dim(`  reading ${full} … `));

  let dna;
  try {
    dna = await extract(full);
  } catch (e) {
    console.log(c(31, 'failed'));
    console.error(`\n  ${e.message}\n`);
    process.exit(1);
  }
  console.log(dim(`${dna.stylesheets.length} stylesheet(s), ${Math.round(dna.cssBytes / 1024)} kB of CSS\n`));

  console.log(`  ${bold('Colours')}  ${dim('most used first')}`);
  for (const { value, count } of dna.colours.slice(0, 10)) {
    console.log(`  ${COLOR ? swatch(value) + ' ' : ''}${value}  ${dim(`×${count}`)}`);
  }
  if (dna.fonts.length) {
    console.log(`\n  ${bold('Type')}`);
    for (const f of dna.fonts.slice(0, 3)) console.log(`  ${dim('·')} ${f.value.slice(0, 64)}`);
  }
  if (dna.fontSizes.length) console.log(`\n  ${bold('Sizes')}   ${dna.fontSizes.map((s) => s.value).join(' ')}`);
  if (dna.radii.length) console.log(`  ${bold('Radius')}  ${dna.radii.map((r) => r.value).join('  ')}`);

  const s = dna.summary;
  if (s) {
    console.log(`\n  ${bold('The short version')}`);
    console.log(
      `  background ${COLOR ? swatch(s.background) + ' ' : ''}${s.background}` +
        `   brand ${COLOR ? swatch(s.brand) + ' ' : ''}${s.brand}`
    );
    console.log(
      `\n  ${dim('This is a heuristic — it reads the CSS it can see, and misses anything')}\n` +
        `  ${dim('a framework computes at runtime.')}\n`
    );
  }
}

// --- audit ------------------------------------------------------------------
function cmdAudit(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark') });
  const a = audit(sys);
  const s = staticChecks(sys);

  console.log(`\n  ${bold('Contrast')}  ${dim(`${sys.vibeLabel} · seed ${sys.seed}`)}\n`);
  for (const r of a.results) {
    const ok = r.pass ? c(32, '✓') : c(31, '✗');
    console.log(
      `  ${ok} ${r.name.padEnd(30)} ${String(r.ratio).padStart(6)}:1  ${dim(`needs ${r.target}`)}  ${r.grade}`
    );
  }
  console.log(`\n  ${bold('Everything else')}\n`);
  for (const ch of s.checks) {
    console.log(`  ${ch.pass ? c(32, '✓') : c(31, '✗')} ${ch.label}`);
    if (!ch.pass) console.log(`      ${dim(ch.why)}`);
  }
  const pass = a.passed && s.passed;
  console.log(`\n  ${pass ? c(32, 'Provably not ugly.') : c(31, 'Not yet.')}\n`);
  if (!pass) process.exit(1);
}

// --- odds and ends ----------------------------------------------------------
function cmdVibes() {
  console.log();
  for (const [key, v] of Object.entries(VIBES)) {
    const sys = system('preview', { vibe: key });
    console.log(
      `  ${bold(v.label.padEnd(11))} ${COLOR ? sys.colour.primary.slice(2, 10).map((h) => swatch(h, 2)).join('') : sys.colour.primary[6]}`
    );
    console.log(`  ${dim(v.blurb)}\n`);
  }
  console.log(`  ${dim('notugly --vibe brutalist')}\n`);
}

function cmdChaos() {
  console.log(`\n  ${bold('The content that breaks design systems')}\n`);
  for (const t of CASES) {
    console.log(`  ${bold(t.label)}`);
    console.log(`  ${dim(t.why)}`);
    if (t.text) console.log(`  ${dim('→')} ${t.text.slice(0, 72)}${t.text.length > 72 ? '…' : ''}`);
    console.log();
  }
  console.log(`  ${dim('See them applied: https://mohitagw15856.github.io/notugly/#chaos')}\n`);
}

// ---------------------------------------------------------------------------
const cmd = argv[0];
if (argv.includes('--help') || argv.includes('-h')) usage(0);

switch (cmd) {
  case 'avatar':
    cmdAvatar(argv.slice(1));
    break;
  case 'export':
    cmdExport(argv.slice(1));
    break;
  case 'steal':
    await cmdSteal(argv.slice(1));
    break;
  case 'audit':
    cmdAudit(argv.slice(1));
    break;
  case 'vibes':
    cmdVibes();
    break;
  case 'chaos':
    cmdChaos();
    break;
  case undefined:
    // No arguments: make something, so the first run shows the product.
    showSystem(toSeed(Date.now()));
    break;
  default:
    if (cmd.startsWith('--')) showSystem(flag('seed', toSeed(Date.now())));
    else showSystem(cmd);
}
