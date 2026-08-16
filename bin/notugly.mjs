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
import { persona, cast, card, identityKit, ARCHETYPES } from '../lib/persona.mjs';
import { fixContrast, inspect } from '../lib/fix.mjs';
import { roast } from '../lib/roast.mjs';
import { checkVision, simulate, VISION } from '../lib/vision.mjs';
import { printReport } from '../lib/print.mjs';
import { apcaAdvice } from '../lib/apca.mjs';
import { toFigma, toVsCode } from '../lib/targets.mjs';

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

  ${bold('notugly persona')} <name>            a whole character: face, name, voice, colours
  ${bold('notugly card')} <name>               a 1200x630 social card for that persona
  ${bold('notugly cast')} <a> <b> <c>          a team, guaranteed visually distinct
  ${bold('notugly fix')} <fg> <bg>             the nearest passing colour to the one you picked
  ${bold('notugly roast')} <hex...>            what is wrong with your palette, rudely
  ${bold('notugly vision')} [seed]             which colours collapse for colour-blind viewers
  ${bold('notugly print')} [seed]              what survives CMYK
  ${bold('notugly figma')} [seed]              a loadable Figma plugin
  ${bold('notugly vscode')} [seed]             an editor theme from the same system

${dim('options')}  --vibe ${VIBE_NAMES.join('|')}   --dark   --style ${STYLES.slice(0, 4).join('|')}…
         --out <dir>   --size <px>   --seed <seed>   --brand <#hex>
         --mood neutral|happy|thinking|surprised|sleepy|determined   --hat party|beanie|shades|scarf|halo|crown

${dim('Everything is deterministic: the same seed always gives the same design.')}`);
  process.exit(code);
}

// --- the default: show a system ---------------------------------------------
function showSystem(seed) {
  const vibe = flag('vibe', 'editorial');
  const dark = has('dark');
  const sys = system(seed, { vibe, dark, brand: flag('brand', null) });
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
  const svg = avatar(name, { style, size, on, label: name, mood: flag('mood', null), hat: flag('hat', 'none') });
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
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const e = exportAll(sys);
  const out = flag('out', null);

  if (!out) {
    const n = Object.keys(e.sizes).length;
    console.log(`\n  ${bold(`${n} files`)}  ${dim(`${sys.vibeLabel} · seed ${sys.seed}`)}\n`);
    const width = Math.max(...Object.keys(e.sizes).map((f) => f.length)) + 2;
    for (const [f, s] of Object.entries(e.sizes)) {
      console.log(`  ${f.padEnd(width)} ${dim(s.human.padStart(9))}`);
    }
    console.log(
      `\n  ${dim('runtime cost')} ${c(32, '0 bytes')} ${dim('— static text, no dependency, nothing to install')}`
    );
    console.log(`\n  ${dim(`notugly export ${sys.seed} --out ./ui  writes them`)}\n`);
    return;
  }

  mkdirSync(out, { recursive: true });
  for (const [name, body] of Object.entries(e.files)) {
    // figma/ and vscode/ are nested, so make the folder before writing into it.
    const path = `${out}/${name}`;
    mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
    writeFileSync(path, body);
  }
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
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
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


// --- persona ----------------------------------------------------------------
function cmdPersona(args) {
  const seed = args[0];
  if (!seed) {
    console.error('Who? Try: notugly persona mo');
    process.exit(2);
  }
  const p = persona(seed, {
    archetype: flag('archetype', null),
    dark: has('dark'),
    brand: flag('brand', null),
    style: flag('style', null),
  });
  const out = flag('out', null);

  if (out) {
    mkdirSync(out, { recursive: true });
    const kit = identityKit(p);
    for (const [k, svg] of Object.entries(kit.avatars)) writeFileSync(`${out}/avatar-${k}.svg`, svg);
    writeFileSync(`${out}/favicon.svg`, kit.faviconSquare);
    writeFileSync(`${out}/card.svg`, kit.card);
    writeFileSync(`${out}/persona.css`, kit.css);
    writeFileSync(`${out}/persona.json`, JSON.stringify({ ...kit, avatars: Object.keys(kit.avatars), card: 'card.svg' }, null, 2));
    console.log(`\n  Wrote an identity kit to ${bold(out)}  ${dim('8 files, nothing to install')}\n`);
    return;
  }

  console.log(`\n  ${bold(p.name)} ${dim(p.handle)}`);
  console.log(`  ${c(35, p.archetypeLabel)}  ${dim('·')}  ${dim(p.traits.join(' · '))}\n`);
  console.log(`  ${p.bio}`);
  console.log(`  ${dim(`"${p.catchphrase}"`)}\n`);
  console.log(`  ${dim('colour'.padEnd(10))} ${COLOR ? `${swatch(p.colour)} ` : ''}${p.colour}`);
  console.log(`  ${dim('face'.padEnd(10))} ${p.style}, feeling ${p.mood}`);
  console.log(`  ${dim('energy'.padEnd(10))} ${'▮'.repeat(p.energy)}${dim('▯'.repeat(5 - p.energy))}`);
  console.log(`  ${dim('vibe'.padEnd(10))} ${p.system.vibeLabel}\n`);
  console.log(`  ${dim(`notugly persona ${seed} --out ./me   writes the avatars, favicon and social card`)}\n`);
}

function cmdCard(args) {
  const seed = args[0];
  if (!seed) {
    console.error('Whose card? Try: notugly card mo');
    process.exit(2);
  }
  const p = persona(seed, { archetype: flag('archetype', null), dark: has('dark'), brand: flag('brand', null) });
  const svg = card(p, { tagline: flag('tagline', null) });
  const out = flag('out', null);
  if (out) {
    writeFileSync(out, svg);
    console.log(`\n  Wrote ${bold(out)}  ${dim('1200×630, no fonts to load, nothing to 404')}\n`);
    return;
  }
  console.log(svg);
}

function cmdCast(args) {
  const names = args.filter((a) => !a.startsWith('--'));
  if (!names.length) {
    console.error('Who is in it? Try: notugly cast ada grace linus');
    process.exit(2);
  }
  const people = cast(names, { dark: has('dark') });
  console.log(`\n  ${bold('The cast')}  ${dim(`${people.length} people, no two alike`)}\n`);
  for (const p of people) {
    console.log(
      `  ${swatch(p.colour, 4)} ${bold(p.name.padEnd(18))} ${dim(p.handle.padEnd(16))} ${p.archetypeLabel.padEnd(20)} ${dim(p.style)}`
    );
    console.log(`  ${' '.repeat(4)} ${dim(p.bio)}\n`);
  }
  const out = flag('out', null);
  if (out) {
    mkdirSync(out, { recursive: true });
    for (const p of people) writeFileSync(`${out}/${p.seed}.svg`, p.avatar({ size: 256 }));
    console.log(`  Wrote ${bold(String(people.length))} avatars to ${bold(out)}\n`);
  }
}

// --- fix --------------------------------------------------------------------
function cmdFix(args) {
  const [fg, bg] = args;
  if (!fg || !bg) {
    console.error('Two colours, please: notugly fix "#8ab4f8" "#ffffff"');
    process.exit(2);
  }
  const i = inspect(fg, bg);
  console.log(`\n  ${swatch(fg)} ${fg}  ${dim('on')}  ${swatch(bg)} ${bg}\n`);
  console.log(`  ${bold('WCAG 2')}    ${i.wcag.ratio}:1  ${i.wcag.aa ? c(32, i.wcag.grade) : c(31, 'fail')}  ${dim('needs 4.5 for body text')}`);
  console.log(`  ${bold('APCA')}      Lc ${i.apca.lc}  ${dim(i.apca.use)}\n`);

  if (i.wcag.aa) {
    console.log(`  ${c(32, 'Nothing to fix.')} ${dim('It already passes.')}\n`);
    return;
  }
  for (const [level, target] of [['AA Large', 'aaLarge'], ['AA', 'aa'], ['AAA', 'aaa']]) {
    const f = i.fixes[target];
    if (f.impossible) {
      console.log(`  ${level.padEnd(9)} ${c(31, 'impossible')} ${dim(f.says)}`);
      continue;
    }
    console.log(`  ${level.padEnd(9)} ${swatch(f.to)} ${bold(f.to)}  ${dim(`${f.after}:1`)}  ${dim(f.changed ? `moved ${f.moved} lightness` : 'already fine')}`);
  }
  console.log(`\n  ${dim('Hue and chroma untouched — it is still your colour, just readable.')}\n`);
}

// --- roast ------------------------------------------------------------------
function cmdRoast(args) {
  const colours = args.filter((a) => a.startsWith('#'));
  if (!colours.length) {
    console.error('Give me some colours: notugly roast "#fff" "#f8f8f8" "#00ffcc"');
    process.exit(2);
  }
  const r = roast(colours);
  console.log(`\n  ${bold(r.verdict)}  ${dim(`${r.score}/100`)}\n`);
  for (const b of r.burns) {
    const mark = b.severity >= 4 ? c(31, '✗') : b.severity >= 2 ? c(33, '!') : dim('·');
    console.log(`  ${mark} ${b.says}`);
    if (b.fix) console.log(`    ${dim('→ ' + b.fix)}`);
    console.log();
  }
}

// --- vision -----------------------------------------------------------------
function cmdVision(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const v = checkVision(sys.colour);

  console.log(`\n  ${bold('Colour vision')}  ${dim(`${sys.vibeLabel} · seed ${sys.seed}`)}\n`);
  const roles = ['bg', 'surface', 'text', 'textMuted', 'brand', 'accent', 'buttonBg', 'border'];
  console.log(`  ${dim('role'.padEnd(12))}${dim('normal'.padEnd(10))}${VISION.map((k) => dim(k.slice(0, 6).padEnd(10))).join('')}`);
  for (const role of roles) {
    const hex = sys.colour[role];
    if (!hex) continue;
    console.log(
      `  ${dim(role.padEnd(12))}${swatch(hex, 4)}${' '.repeat(6)}` +
        VISION.map((k) => `${swatch(simulate(hex, k), 4)}${' '.repeat(6)}`).join('')
    );
  }
  console.log(`\n  ${v.passed ? c(32, '✓ no two colours collapse into each other') : c(33, `! ${v.collisions.length} collision(s)`)}`);
  for (const col of v.collisions) {
    console.log(`    ${col.pair[0]} + ${col.pair[1]} ${dim(`→ both ${col.becomes[0]} under ${col.kind} (${col.prevalence})`)}`);
  }
  console.log(`\n  ${dim(v.note)}\n`);
}

// --- print ------------------------------------------------------------------
function cmdPrint(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const r = printReport(sys.colour);
  console.log(`\n  ${bold('On paper')}  ${dim(`${sys.vibeLabel} · seed ${sys.seed}`)}\n`);
  for (const check of r.checks) {
    const flagged = check.notes.length;
    console.log(
      `  ${swatch(check.hex, 4)} ${check.role.padEnd(12)} ${dim(`${check.coverage}% ink`)}` +
        (check.shift.inGamut ? dim('  in gamut') : `  ${c(33, `→ ${check.shift.as}`)}`)
    );
    for (const n of check.notes) console.log(`      ${n.level === 'error' ? c(31, '✗') : n.level === 'warn' ? c(33, '!') : dim('·')} ${dim(n.says)}`);
  }
  console.log(`\n  ${r.safe ? c(32, '✓ nothing that will stop a press') : c(31, '✗ over ink limit')}`);
  console.log(`  ${dim('Naive CMYK, not an ICC profile — it catches the obvious problems, not the subtle ones.')}\n`);
}

// --- other targets ----------------------------------------------------------
function cmdTarget(args, name, make, hint) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const files = make(sys);
  const out = flag('out', null);
  if (!out) {
    console.log(`\n  ${bold(name)}  ${dim(`${sys.vibeLabel} · seed ${sys.seed}`)}\n`);
    for (const [f, body] of Object.entries(files)) {
      console.log(`  ${f.padEnd(36)} ${dim(`${(Buffer.byteLength(body) / 1024).toFixed(1)} kB`)}`);
    }
    console.log(`\n  ${dim(hint)}`);
    console.log(`  ${dim(`notugly ${name.toLowerCase().replace(/\s.*/, '')} ${sys.seed} --out ./${name.toLowerCase().split(' ')[0]}  writes them`)}\n`);
    return;
  }
  for (const [f, body] of Object.entries(files)) {
    const path = `${out}/${f}`;
    mkdirSync(path.split('/').slice(0, -1).join('/') || '.', { recursive: true });
    writeFileSync(path, body);
  }
  console.log(`\n  Wrote ${bold(String(Object.keys(files).length))} files to ${bold(out)}`);
  console.log(`  ${dim(hint)}\n`);
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
  case 'persona':
    cmdPersona(argv.slice(1));
    break;
  case 'card':
    cmdCard(argv.slice(1));
    break;
  case 'cast':
    cmdCast(argv.slice(1));
    break;
  case 'fix':
    cmdFix(argv.slice(1));
    break;
  case 'roast':
    cmdRoast(argv.slice(1));
    break;
  case 'vision':
    cmdVision(argv.slice(1));
    break;
  case 'print':
    cmdPrint(argv.slice(1));
    break;
  case 'figma':
    cmdTarget(argv.slice(1), 'Figma plugin', toFigma, 'Plugins → Development → Import plugin from manifest.');
    break;
  case 'vscode':
    cmdTarget(argv.slice(1), 'VS Code theme', toVsCode, 'Drop it in ~/.vscode/extensions and restart.');
    break;
  case undefined:
    // No arguments: make something, so the first run shows the product.
    showSystem(toSeed(Date.now()));
    break;
  default:
    if (cmd.startsWith('--')) showSystem(flag('seed', toSeed(Date.now())));
    else showSystem(cmd);
}
