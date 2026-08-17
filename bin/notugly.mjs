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
import { specSheet, specMarkdown, compare, compareMarkdown, onePager, onePagerHtml, costOf } from '../lib/spec.mjs';
import { name as nameColour, nameAll } from '../lib/names.mjs';
import { toThmx, toSlidesGuide, toSlidesJson, chartLegibility } from '../lib/slides.mjs';
import { poster, specimen, zine, printWarnings, PAPER } from '../lib/paper.mjs';
import { allEras, inEra, eraCard, ERAS } from '../lib/era.mjs';
import { team, teamSheet, teamDistinct } from '../lib/team.mjs';
import { snapshot, drift, driftText } from '../lib/drift.mjs';
import { auditTokens, toStorybook } from '../lib/ingest.mjs';
import { sticker, stickerPack, STICKER_MOTIONS } from '../lib/persona.mjs';
import { glassMaterial, glassLegibility, concentricRadius, squirclePath, swiftGlassSnippet, VARIANTS as GLASS_VARIANTS } from '../lib/liquidglass.mjs';
import { mascot, MASCOT_STATES } from '../lib/mascot.mjs';
import { gradient, KINDS as GRADIENT_KINDS } from '../lib/gradient.mjs';
import { pattern, PATTERNS } from '../lib/pattern.mjs';
import { blob, divider, DIVIDERS } from '../lib/shape.mjs';
import { paletteFromImage, paletteFromImages } from '../lib/quantise.mjs';
import { decodePng } from '../lib/raster.mjs';
import { iconPackage, ICON_SIZES } from '../lib/icon.mjs';
import { readFileSync, existsSync } from 'node:fs';

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
  ${bold('notugly glass')} [seed]              Apple's Liquid Glass, with the legibility actually checked
  ${bold('notugly mascot')} [seed]             the small man who lives on the website, as SVG
  ${bold('notugly gradient')} [seed]           a mesh gradient, as CSS or SVG — never a PNG
  ${bold('notugly pattern')} <name>            grain, dots, grid, lines… as a data URI
  ${bold('notugly shape')} <kind>              a blob or a section divider
  ${bold('notugly palette')} <img.png...>      the colours in a photograph, no browser needed
  ${bold('notugly icon')} <name>               a favicon + app-icon package, real PNG/ICO pixels

${dim('for the people who have to present it')}
  ${bold('notugly spec')} <url>                what is that design made of, as a table
  ${bold('notugly diff')} <url> <url>          two designs, with the differences called out
  ${bold('notugly onepager')} [seed|url]       one printable page: what fails and what it costs
  ${bold('notugly cost')} <url>                kilobytes and hours, from measured counts
  ${bold('notugly slides')} [seed]             a real .thmx theme for PowerPoint and Keynote

${dim('for the people who have to make it')}
  ${bold('notugly poster')} [seed]             the system as a printable A3
  ${bold('notugly specimen')} [seed]           a proper type specimen sheet
  ${bold('notugly zine')} [seed]               eight pages on one sheet, imposed for folding
  ${bold('notugly name')} <hex...>             what colour is that, in words
  ${bold('notugly stickers')} <name>           animated persona stickers for Slack
  ${bold('notugly eras')} [seed]               the same design in 1998, 2008, 2015 and now

${dim('for keeping it')}
  ${bold('notugly watch')} <url> [baseline]    what changed since last time
  ${bold('notugly check')} <url>               fail the build on a contrast regression
  ${bold('notugly tokens')} <file.json>        audit somebody else's tokens or Figma export
  ${bold('notugly storybook')} [seed]          a Storybook story for the system
  ${bold('notugly team')} <org> <who...>       one seed, a whole company

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

// --- liquid glass -------------------------------------------------------------
function cmdGlass(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: 'liquidglass', dark: has('dark'), brand: flag('brand', null) });
  const container = squirclePath(240, 140, sys.radius.lg);
  const pad = 16;
  const childRadius = concentricRadius(sys.radius.lg, pad);
  const out = flag('out', null);

  if (out) {
    mkdirSync(out, { recursive: true });
    for (const variant of GLASS_VARIANTS) {
      writeFileSync(`${out}/glass-${variant}.css`, `.glass-${variant} {\n  ${sys.liquidGlass[variant].css}\n}\n`);
      writeFileSync(`${out}/NotuglyGlass-${variant}.swift`, swiftGlassSnippet(sys, { variant }));
    }
    writeFileSync(`${out}/container.svg`, container.svg);
    writeFileSync(`${out}/legibility.json`, JSON.stringify(sys.liquidGlass.legibility, null, 2));
    console.log(`\n  Wrote ${bold(String(GLASS_VARIANTS.length * 2 + 2))} files to ${bold(out)}`);
    console.log(`  ${dim('CSS for the web, .swift for the real API, an SVG squircle, and the legibility sweep as JSON.')}\n`);
    return;
  }

  console.log(`\n  ${bold('Liquid Glass')}  ${dim(`seed ${sys.seed}${sys.dark ? ' · dark' : ''}`)}\n`);
  for (const variant of GLASS_VARIANTS) {
    const mat = sys.liquidGlass[variant];
    console.log(`  ${bold(variant)}  ${dim(`alpha ${mat.alpha} · blur ${mat.blur}px · saturate ${mat.saturate}`)}`);
    const leg = sys.liquidGlass.legibility[variant];
    console.log(`  ${leg.passed ? c(32, '✓') : c(31, '✗')} ${dim(leg.note)}`);
    console.log();
  }
  console.log(`  ${bold('Concentric radius')}  ${dim(`container ${sys.radius.lg}px, ${pad}px padding → child ${childRadius}px`)}`);
  console.log(`  ${dim('Not container radius minus a guess — the child curve is centred on the same point as the parent.')}\n`);
  console.log(`  ${dim(`notugly glass ${sys.seed} --out ./glass  writes CSS, Swift, the squircle SVG and the legibility sweep`)}\n`);
}

// --- mascot / gradient / pattern / shape ------------------------------------
function cmdMascot(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const state = flag('mood', 'idle');
  const out = flag('out', null);

  if (out) {
    mkdirSync(out, { recursive: true });
    const states = has('all') ? MASCOT_STATES : [state];
    for (const s of states) writeFileSync(`${out}/mascot-${s}.svg`, mascot(sys.colour, { state: s, size: Number(flag('size', 132)) }));
    console.log(`\n  Wrote ${bold(String(states.length))} mascot SVG(s) to ${bold(out)}\n`);
    return;
  }
  console.log(mascot(sys.colour, { state, size: Number(flag('size', 132)) }));
}

function cmdGradient(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const kind = flag('kind', null);
  const grad = gradient(seed, { kind: kind || undefined, dark: has('dark') });
  const out = flag('out', null);

  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/gradient.svg`, grad.svg);
    writeFileSync(`${out}/gradient.css`, `.gradient {\n  ${grad.css}\n}\n`);
    console.log(`\n  Wrote ${bold('2')} files to ${bold(out)}  ${dim(grad.kind)}\n`);
    return;
  }
  console.log(`\n  ${bold(grad.kind)}  ${dim(`base ${grad.base}`)}\n`);
  console.log(`  ${grad.stops.map((h) => swatch(h, 6)).join('')}`);
  console.log(`\n  ${grad.css}\n`);
  console.log(`  ${dim(`notugly gradient ${seed} --kind ${GRADIENT_KINDS.join('|')} --out ./g`)}\n`);
}

function cmdPattern(args) {
  const name = args[0] || flag('name', 'dots');
  const seed = flag('seed', 'notugly');
  const pat = pattern(name, { colour: flag('colour', '#000000'), opacity: Number(flag('opacity', 0.08)), seed });
  const out = flag('out', null);

  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/pattern.svg`, pat.svg);
    writeFileSync(`${out}/pattern.css`, `.pattern {\n  ${pat.css}\n}\n`);
    console.log(`\n  Wrote ${bold('2')} files to ${bold(out)}  ${dim(`${pat.name} · ${pat.bytes} B`)}\n`);
    return;
  }
  console.log(`\n  ${bold(pat.name)}  ${dim(`${pat.bytes} B as a data URI`)}\n`);
  console.log(`  ${pat.css}\n`);
  console.log(`  ${dim(`notugly pattern ${PATTERNS.join('|')} --out ./p`)}\n`);
}

function cmdShape(args) {
  const kind = args[0] || flag('kind', 'blob');
  const seed = flag('seed', 'notugly');
  const out = flag('out', null);

  if (kind === 'blob') {
    const b = blob(seed, { size: Number(flag('size', 200)) });
    if (out) { writeFileSync(out, b.svg); console.log(`\n  Wrote ${bold(out)}\n`); return; }
    console.log(b.svg);
    console.log(`\n  ${dim('notugly shape blob --out blob.svg')}\n`);
    return;
  }
  const d = divider(kind, { flip: has('flip'), seed });
  if (out) { writeFileSync(out, d.svg); console.log(`\n  Wrote ${bold(out)}\n`); return; }
  console.log(d.svg);
  console.log(`\n  ${dim(`notugly shape ${DIVIDERS.join('|')}|blob --out shape.svg`)}\n`);
}

// --- palette from an image ---------------------------------------------------
function cmdPalette(args) {
  const files = args.filter((a) => !a.startsWith('--'));
  if (!files.length) {
    console.error('Which image? Try: notugly palette photo.png');
    process.exit(2);
  }
  const notPng = files.find((f) => !/\.png$/i.test(f));
  if (notPng) {
    console.error(`\n  "${notPng}" isn't a .png — only PNG is supported here.`);
    console.error(`  The decoder is written from scratch to stay zero-dependency; re-export as PNG and try again.\n`);
    process.exit(2);
  }

  let images;
  try {
    images = files.map((f) => decodePng(readFileSync(f)));
  } catch (e) {
    console.error(`\n  ${e.message}\n`);
    process.exit(1);
  }

  const keep = Number(flag('keep', 5));
  const result = images.length > 1 ? paletteFromImages(images, { keep }) : paletteFromImage(images[0], { keep });

  console.log(`\n  ${bold(images.length > 1 ? `${files.length} images` : files[0])}  ${dim(`${result.colours.length} colours, deterministic k-means in OKLab`)}\n`);
  for (const col of result.colours) {
    console.log(`  ${swatch(col.hex)} ${col.hex.padEnd(9)} ${dim(`${(col.share * 100).toFixed(1)}%`)}`);
  }
  console.log(`\n  ${dim('dominant')} ${swatch(result.dominant)} ${result.dominant}   ${dim('ground')} ${swatch(result.ground)} ${result.ground}`);
  if (result.monochrome) console.log(`  ${dim('This image is close to monochrome — that is what came out of it, not an error.')}`);

  const out = flag('out', null);
  if (out) {
    writeFileSync(out, JSON.stringify(result, null, 2));
    console.log(`\n  Wrote ${bold(out)}\n`);
    return;
  }
  console.log(`\n  ${dim(`notugly --brand ${result.dominant}  builds a system pinned to it`)}\n`);
}

// --- favicon / app icon -------------------------------------------------------
function cmdIcon(args) {
  const name = args[0];
  if (!name) {
    console.error('Whose icon? Try: notugly icon mo');
    process.exit(2);
  }
  const sys = system(name, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const sizes = flag('sizes', null) ? flag('sizes').split(',').map(Number) : ICON_SIZES;
  const pkg = iconPackage(name, sys, { sizes });
  const out = flag('out', null);

  if (!out) {
    console.log(`\n  ${bold('Icon')}  ${dim(`letter ${pkg.letter} · ${swatch(pkg.bg)} ${pkg.bg} · ${sizes.join(', ')}px`)}\n`);
    for (const [f, body] of Object.entries(pkg.files)) {
      console.log(`  ${f.padEnd(16)} ${dim(`${(body.length / 1024).toFixed(1)} kB`)}`);
    }
    console.log(`\n  ${dim('Real pixels, encoded from scratch — no sharp, no canvas, no dependency.')}`);
    console.log(`  ${dim(`notugly icon ${name} --out ./icons  writes them`)}\n`);
    return;
  }
  mkdirSync(out, { recursive: true });
  for (const [f, body] of Object.entries(pkg.files)) writeFileSync(`${out}/${f}`, body);
  console.log(`\n  Wrote ${bold(String(Object.keys(pkg.files).length))} files to ${bold(out)}\n`);
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


// --- documents for other people ---------------------------------------------

const readDna = async (target) => {
  if (/^https?:|\./.test(target) && !existsSync(target)) return extract(target.startsWith('http') ? target : `https://${target}`);
  const json = JSON.parse(readFileSync(target, 'utf8'));
  return json.colours ? json : { colours: (json.palette ?? []).map((v) => ({ value: v })), fonts: [], radii: [], fontSizes: [], shadows: [] };
};

async function cmdSpec(args) {
  const target = args[0];
  if (!target) { console.error('What am I looking at? Try: notugly spec stripe.com'); process.exit(2); }
  const dna = await readDna(target);
  const spec = specSheet(dna);
  const out = flag('out', null);
  if (out) { writeFileSync(out, specMarkdown(spec)); console.log(`\n  Wrote ${bold(out)}\n`); return; }

  console.log(`\n  ${bold(spec.title)}  ${dim(`${spec.palette.length} colours · ${spec.greys} grey`)}\n`);
  for (const p of spec.palette.slice(0, 14)) {
    console.log(
      `  ${swatch(p.hex, 4)} ${p.hex.padEnd(9)} ${p.name.padEnd(20)} ${dim(String(p.onBackground).padStart(6) + ':1')}  ${dim(p.role)}`
    );
  }
  console.log(`\n  ${dim('type'.padEnd(8))} ${spec.type.families.join(', ') || 'none found'}`);
  console.log(`  ${dim('scale'.padEnd(8))} ${spec.type.note}`);
  console.log(`  ${dim('radii'.padEnd(8))} ${spec.radiusNote}`);
  if (spec.failing.length) {
    console.log(`\n  ${c(31, `${spec.failing.length} will not pass as text:`)}`);
    for (const f of spec.failing) console.log(`    ${f.hex} ${dim(`${f.onBackground}:1`)}`);
  }
  console.log(`\n  ${dim('notugly spec ' + target + ' --out spec.md  writes it as markdown')}\n`);
}

async function cmdDiff(args) {
  const [a, b] = args.filter((x) => !x.startsWith('--'));
  if (!a || !b) { console.error('Two things to compare: notugly diff stripe.com linear.app'); process.exit(2); }
  const cmp = compare(await readDna(a), await readDna(b), { labels: [a, b] });
  const out = flag('out', null);
  if (out) { writeFileSync(out, compareMarkdown(cmp)); console.log(`\n  Wrote ${bold(out)}\n`); return; }

  const w = Math.max(a.length, b.length, 16);
  console.log(`\n  ${bold('')}${''.padEnd(18)}${dim(a.padEnd(w))}  ${dim(b)}\n`);
  for (const r of cmp.rows) {
    const mark = r.winner === null ? dim(' —') : c(32, ` ${cmp.labels[r.winner]} by ${r.delta}`);
    console.log(`  ${r.label.padEnd(18)}${String(r.a).padEnd(w)}  ${String(r.b).padEnd(w)}${mark}`);
  }
  console.log(`\n  ${dim(`Type scale consistent: ${a} ${cmp.scaleAgreement[a] ? 'yes' : 'no'} · ${b} ${cmp.scaleAgreement[b] ? 'yes' : 'no'}`)}`);
  console.log(`  ${bold(cmp.tidier)} is the more consistent. ${dim('That is a measurement, not a verdict on which looks better.')}\n`);
}

async function cmdOnePager(args) {
  const target = args[0];
  const input = target && /[.\/]/.test(target)
    ? await readDna(target)
    : system(target || flag('seed', 'notugly'), { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const page = onePager(input, { title: flag('title', target ? `${target} — accessibility review` : 'Accessibility review') });
  const out = flag('out', null);
  if (out) {
    writeFileSync(out, onePagerHtml(page));
    console.log(`\n  Wrote ${bold(out)}  ${dim('open it and print to PDF — it fits one sheet')}\n`);
    return;
  }
  console.log(`\n  ${bold(page.title)}\n`);
  for (const p of page.pairs) {
    console.log(
      `  ${p.pass ? c(32, '✓') : c(31, '✗')} ${(p.label ?? p.name).padEnd(16)} ${swatch(p.fg, 4)} ${String(p.ratio).padStart(6)}:1  ${dim(`needs ${p.target}`)}` +
        (p.fix ? dim(`   → ${p.fix}`) : '')
    );
  }
  console.log(`\n  ${bold(page.verdict)}`);
  console.log(`  ${page.headline}\n`);
  console.log(`  ${dim('notugly onepager --out review.html  writes the printable version')}\n`);
}

async function cmdCost(args) {
  const target = args[0];
  if (!target) { console.error('Point me at something: notugly cost stripe.com'); process.exit(2); }
  const cost = costOf(await readDna(target));
  console.log(`\n  ${bold(target)}\n`);
  console.log(`  ${dim('weight'.padEnd(12))} ${cost.weight.kb} kB of webfont${cost.weight.names.length ? dim(`  (${cost.weight.names.join(', ')})`) : ''}`);
  console.log(`  ${' '.repeat(12)} ${dim(cost.weight.note)}\n`);
  console.log(`  ${dim('to fix'.padEnd(12))} ${cost.fixes.failing} failing pairing(s), ${cost.fixes.nudges} of them a nudge`);
  console.log(`  ${' '.repeat(12)} ${cost.fixes.redundantGreys} redundant grey(s), ${cost.fixes.extraFonts} typeface(s) to remove\n`);
  console.log(`  ${bold(`${cost.hours} hours`)} ${dim(`(~${cost.days} days)`)}`);
  console.log(`  ${dim(cost.basis)}\n`);
}

function cmdSlides(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const chart = chartLegibility(sys);
  const out = flag('out', null);
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/notugly-${seed}.thmx`, Buffer.from(toThmx(sys)));
    writeFileSync(`${out}/google-slides.txt`, toSlidesGuide(sys));
    writeFileSync(`${out}/theme.json`, toSlidesJson(sys));
    console.log(`\n  Wrote a .thmx, a Google Slides guide and the raw JSON to ${bold(out)}`);
    console.log(`  ${dim('Double-click the .thmx in PowerPoint, or Keynote > Change Theme.')}\n`);
    return;
  }
  console.log(toSlidesGuide(sys));
  console.log(`  ${chart.passed ? c(32, '✓ all six chart accents are distinguishable') : c(31, '✗ chart accents clash')}`);
  console.log(`  ${dim(`notugly slides ${seed} --out ./deck  writes the theme file`)}\n`);
}

// --- things you print --------------------------------------------------------

function cmdPaper(args, kind) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const size = flag('size', kind === 'poster' ? 'A3' : 'A4');
  const gamut = !has('no-gamut');
  const make = {
    poster: () => poster(sys, { size, gamut, title: flag('title', null) }),
    specimen: () => specimen(sys, { size, gamut }),
    zine: () =>
      zine(
        sys,
        Array.from({ length: 8 }, (_, i) => ({
          title: i === 0 ? String(seed) : `${i + 1}`,
          body: i === 0 ? 'A design system, folded.' : 'Replace this page via the library API.',
        })),
        { size, gamut }
      ),
  }[kind];

  const svg = make();
  const out = flag('out', null);
  if (out) {
    writeFileSync(out, svg);
    const warn = printWarnings(sys);
    console.log(`\n  Wrote ${bold(out)}  ${dim(`${size}, true size`)}`);
    if (!warn.safe) for (const w of warn.warnings) console.log(`  ${c(33, '!')} ${dim(w.says)}`);
    else console.log(`  ${c(32, '✓')} ${dim('every colour is inside the CMYK gamut')}`);
    console.log();
    return;
  }
  console.log(svg);
}

function cmdName(args) {
  const hexes = args.filter((a) => a.startsWith('#'));
  if (!hexes.length) { console.error('Some colours, please: notugly name "#4f76b6"'); process.exit(2); }
  console.log();
  for (const n of nameAll(hexes)) {
    console.log(`  ${swatch(n.hex)} ${n.hex.padEnd(9)} ${bold(n.name.padEnd(22))} ${dim(n.exact ? 'close match' : 'nearest')}`);
  }
  console.log();
}

function cmdStickers(args) {
  const seed = args[0];
  if (!seed) { console.error('Whose stickers? Try: notugly stickers mo'); process.exit(2); }
  const p = persona(seed, { dark: has('dark'), archetype: flag('archetype', null) });
  const out = flag('out', null);
  if (out) {
    mkdirSync(out, { recursive: true });
    const pack = stickerPack(p, { size: Number(flag('size', 160)) });
    for (const [file, svg] of Object.entries(pack)) writeFileSync(`${out}/${file}`, svg);
    console.log(`\n  Wrote ${bold(String(Object.keys(pack).length))} animated stickers to ${bold(out)}`);
    console.log(`  ${dim('SMIL, not CSS — chat clients strip <style> and keep <animate>.')}\n`);
    return;
  }
  console.log(sticker(p, { motion: flag('motion', 'bob'), size: Number(flag('size', 160)) }));
}

function cmdEras(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const out = flag('out', null);
  if (out) {
    mkdirSync(out, { recursive: true });
    for (const r of allEras(sys)) writeFileSync(`${out}/${r.era.year}.svg`, eraCard(r, { width: 420, height: 280 }));
    console.log(`\n  Wrote ${bold(String(ERAS.length))} era cards to ${bold(out)}\n`);
    return;
  }
  console.log(`\n  ${bold('The same design, four decades')}  ${dim(`seed ${sys.seed}`)}\n`);
  for (const r of allEras(sys)) {
    console.log(`  ${bold(String(r.era.year))}  ${r.era.label}`);
    console.log(`        ${dim(r.era.blurb)}`);
    console.log(
      `        ${dim('radius')} ${String(r.radius).padEnd(4)} ${dim('type')} ${r.type.heading.split(',')[0].replace(/"/g, '')}`
    );
    console.log();
  }
  console.log(`  ${dim('Every one of these was, at the time, what modern looked like.')}\n`);
}

// --- keeping it --------------------------------------------------------------

async function cmdWatch(args) {
  const url = args[0];
  if (!url) { console.error('Which site? Try: notugly watch example.com'); process.exit(2); }
  const file = args[1] || flag('baseline', 'notugly-baseline.json');
  const dna = await extract(url.startsWith('http') ? url : `https://${url}`);
  const now = snapshot(dna, { at: flag('at', new Date().toISOString().slice(0, 10)) });

  if (!existsSync(file)) {
    writeFileSync(file, JSON.stringify(now, null, 2));
    console.log(`\n  No baseline yet — wrote one to ${bold(file)}.`);
    console.log(`  ${dim('Commit it. Next run will tell you what changed.')}\n`);
    return;
  }

  const before = JSON.parse(readFileSync(file, 'utf8'));
  const report = drift(before, now);
  console.log('\n' + driftText(report) + '\n');
  if (has('update')) {
    writeFileSync(file, JSON.stringify(now, null, 2));
    console.log(`  ${dim(`Baseline updated: ${file}`)}\n`);
  } else if (report.drifted) {
    console.log(`  ${dim(`notugly watch ${url} --update  accepts this as the new baseline`)}\n`);
  }
  if (report.level === 'error' && has('strict')) process.exit(1);
}

async function cmdCheck(args) {
  const target = args[0];
  if (!target) { console.error('Check what? Try: notugly check example.com'); process.exit(2); }
  const dna = await readDna(target);
  const page = onePager(dna, { title: target });
  const spec = specSheet(dna);

  console.log(`\n  ${bold('notugly check')}  ${dim(target)}\n`);
  for (const p of page.failing) {
    console.log(`  ${c(31, '✗')} ${p.fg} on ${p.over} is ${p.ratio}:1 ${dim(`(needs ${p.target})`)}${p.fix ? dim(` → ${p.fix}`) : ''}`);
  }
  const maxGreys = Number(flag('max-greys', 8));
  const maxFonts = Number(flag('max-fonts', 3));
  const problems = [...page.failing];
  if (spec.greys > maxGreys) {
    console.log(`  ${c(31, '✗')} ${spec.greys} greys (limit ${maxGreys})`);
    problems.push('greys');
  }
  if (spec.type.families.length > maxFonts) {
    console.log(`  ${c(31, '✗')} ${spec.type.families.length} typefaces (limit ${maxFonts})`);
    problems.push('fonts');
  }

  if (!problems.length) {
    console.log(`  ${c(32, '✓ nothing to report')}\n`);
    return;
  }
  console.log(`\n  ${c(31, `${problems.length} problem(s).`)} ${dim('Exit code 1 — this is the bit that fails a build.')}\n`);
  process.exit(1);
}

function cmdTokens(args) {
  const file = args[0];
  if (!file) { console.error('Which file? Try: notugly tokens tokens.json'); process.exit(2); }
  const report = auditTokens(JSON.parse(readFileSync(file, 'utf8')), { name: file });
  console.log(`\n  ${bold(file)}  ${dim(`${report.counted} colours, ${report.greys} grey`)}\n`);
  for (const f of report.findings.slice(0, 20)) {
    console.log(`  ${f.level === 'error' ? c(31, '✗') : c(33, '!')} ${f.says}`);
  }
  if (!report.findings.length) console.log(`  ${c(32, '✓ nothing to report')}`);
  console.log(`\n  ${report.passed ? c(32, report.summary) : c(31, report.summary)}\n`);
  if (!report.passed && has('strict')) process.exit(1);
}

function cmdStorybook(args) {
  const seed = args[0] || flag('seed', 'notugly');
  const sys = system(seed, { vibe: flag('vibe', 'editorial'), dark: has('dark'), brand: flag('brand', null) });
  const files = { ...toStorybook(sys), 'notugly.css': exportAll(sys).files['notugly.css'] };
  const out = flag('out', null);
  if (!out) { console.log(Object.values(files)[0]); return; }
  mkdirSync(out, { recursive: true });
  for (const [f, body] of Object.entries(files)) writeFileSync(`${out}/${f}`, body);
  console.log(`\n  Wrote ${bold(String(Object.keys(files).length))} files to ${bold(out)}`);
  console.log(`  ${dim('Plain CSF3 — no framework import, so it works in any Storybook.')}\n`);
}

function cmdTeam(args) {
  const [org, ...people] = args.filter((a) => !a.startsWith('--'));
  if (!org || !people.length) { console.error('Try: notugly team acme ada grace linus'); process.exit(2); }
  const t = team(org, people, { dark: has('dark'), brand: flag('brand', null), style: flag('style', null) });
  const check = teamDistinct(t);

  console.log(`\n  ${bold(org)}  ${dim(`${people.length} people, all in ${t.style}`)}\n`);
  for (const m of t.members) {
    console.log(`  ${swatch(m.colour, 4)} ${bold(m.id.padEnd(14))} ${dim(m.handle.padEnd(16))} ${dim(m.archetype)}`);
  }
  console.log(`\n  ${check.passed ? c(32, '✓ no two members look alike') : c(33, `! ${check.clashes.length} pair(s) are close in hue`)}`);
  const out = flag('out', null);
  if (out) {
    mkdirSync(out, { recursive: true });
    for (const m of t.members) writeFileSync(`${out}/${m.id}.svg`, m.avatar({ size: 256 }));
    writeFileSync(`${out}/team.svg`, teamSheet(t));
    console.log(`  Wrote ${bold(String(t.members.length + 1))} files to ${bold(out)}`);
  }
  console.log();
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
  case 'spec':
    await cmdSpec(argv.slice(1));
    break;
  case 'diff':
    await cmdDiff(argv.slice(1));
    break;
  case 'onepager':
    await cmdOnePager(argv.slice(1));
    break;
  case 'cost':
    await cmdCost(argv.slice(1));
    break;
  case 'slides':
    cmdSlides(argv.slice(1));
    break;
  case 'poster':
  case 'specimen':
  case 'zine':
    cmdPaper(argv.slice(1), cmd);
    break;
  case 'name':
    cmdName(argv.slice(1));
    break;
  case 'stickers':
    cmdStickers(argv.slice(1));
    break;
  case 'eras':
    cmdEras(argv.slice(1));
    break;
  case 'watch':
    await cmdWatch(argv.slice(1));
    break;
  case 'check':
    await cmdCheck(argv.slice(1));
    break;
  case 'tokens':
    cmdTokens(argv.slice(1));
    break;
  case 'storybook':
    cmdStorybook(argv.slice(1));
    break;
  case 'team':
    cmdTeam(argv.slice(1));
    break;
  case 'glass':
    cmdGlass(argv.slice(1));
    break;
  case 'mascot':
    cmdMascot(argv.slice(1));
    break;
  case 'gradient':
    cmdGradient(argv.slice(1));
    break;
  case 'pattern':
    cmdPattern(argv.slice(1));
    break;
  case 'shape':
    cmdShape(argv.slice(1));
    break;
  case 'palette':
    cmdPalette(argv.slice(1));
    break;
  case 'icon':
    cmdIcon(argv.slice(1));
    break;
  case undefined:
    // No arguments: make something, so the first run shows the product.
    showSystem(toSeed(Date.now()));
    break;
  default:
    if (cmd.startsWith('--')) showSystem(flag('seed', toSeed(Date.now())));
    else showSystem(cmd);
}
