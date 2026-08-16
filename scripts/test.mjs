#!/usr/bin/env node
// Tests. The claim this project makes is checkable, so it is checked.

import { hexToRgb, rgbToHex, hexToOklch, oklchToHex, contrast, ramp, accessibleOn, luminance, rate } from '../lib/color.mjs';
import { rng, chance, toSeed, hash } from '../lib/seed.mjs';
import { avatar, describe, STYLES, paletteFor } from '../lib/avatar.mjs';
import { system, audit } from '../lib/system.mjs';
import { VIBE_NAMES } from '../lib/vibe.mjs';
import { exportAll, toCss, toTailwind, toJson } from '../lib/export.mjs';
import { extractFromCss, summarise } from '../lib/extract.mjs';
import { staticChecks, CASES } from '../lib/chaos.mjs';
import { gradient } from '../lib/gradient.mjs';
import { shadow, LEVELS } from '../lib/shadow.mjs';
import { pattern, PATTERNS } from '../lib/pattern.mjs';
import { blob, divider, DIVIDERS } from '../lib/shape.mjs';
import { scale, typeSystem, PAIRINGS } from '../lib/type.mjs';
import { motion, PRESETS } from '../lib/motion.mjs';

let pass = 0;
const fails = [];
const t = (name, fn) => {
  try {
    fn();
    pass++;
  } catch (e) {
    fails.push(`${name}\n    ${e.message}`);
  }
};
const eq = (a, b, msg = '') => {
  const [x, y] = [JSON.stringify(a), JSON.stringify(b)];
  if (x !== y) throw new Error(`${msg}expected ${y}, got ${x}`);
};
const ok = (cond, msg) => {
  if (!cond) throw new Error(msg || 'expected true');
};
const throws = (fn, re) => {
  try {
    fn();
  } catch (e) {
    if (re && !re.test(e.message)) throw new Error(`wrong error: ${e.message}`);
    return;
  }
  throw new Error('expected it to throw');
};

// --- colour ----------------------------------------------------------------
t('hex round-trips exactly', () => {
  for (const h of ['#000000', '#ffffff', '#4f46e5', '#c026d3', '#0f766e']) eq(rgbToHex(hexToRgb(h)), h);
});
t('short hex expands', () => eq(hexToRgb('#f0a'), [255, 0, 170]));
t('rejects nonsense', () => throws(() => hexToRgb('#zzz'), /not a hex/));

t('OKLCH round-trips within a rounding step', () => {
  for (const h of ['#4f46e5', '#0f766e', '#c026d3', '#888888']) {
    const back = oklchToHex(hexToOklch(h));
    const [r1, g1, b1] = hexToRgb(h);
    const [r2, g2, b2] = hexToRgb(back);
    ok(Math.abs(r1 - r2) <= 2 && Math.abs(g1 - g2) <= 2 && Math.abs(b1 - b2) <= 2, `${h} → ${back}`);
  }
});

t('contrast matches the WCAG reference values', () => {
  // Black on white is exactly 21:1 by definition.
  eq(+contrast('#000000', '#ffffff').toFixed(2), 21);
  eq(+contrast('#ffffff', '#ffffff').toFixed(2), 1);
  // #767676 is the canonical grey that just clears AA on white, and #777777 is
  // the one that just misses. Landing either side of that boundary is a much
  // stronger check than any single ratio.
  ok(contrast('#767676', '#ffffff') >= 4.5, 'canonical AA grey should pass');
  ok(contrast('#777777', '#ffffff') < 4.5, 'one step lighter must fail');
});
t('contrast is symmetric', () => {
  eq(+contrast('#123456', '#abcdef').toFixed(4), +contrast('#abcdef', '#123456').toFixed(4));
});
t('luminance is ordered', () => ok(luminance('#000000') < luminance('#808080') && luminance('#808080') < luminance('#ffffff')));
t('rate names the bands', () => {
  eq(rate(21), 'AAA');
  eq(rate(5), 'AA');
  eq(rate(3.2), 'AA Large');
  eq(rate(1.2), 'fail');
});

t('a ramp is perceptually even, not just numerically', () => {
  const r = ramp('#4f46e5');
  const Ls = r.map((h) => hexToOklch(h)[0]);
  const steps = Ls.slice(1).map((l, i) => Ls[i] - l);
  // Every step within a third of the mean is far tighter than HSL manages.
  const mean = steps.reduce((a, b) => a + b) / steps.length;
  for (const s of steps) ok(Math.abs(s - mean) < mean * 0.35, `uneven step ${s.toFixed(3)} vs mean ${mean.toFixed(3)}`);
});
t('a ramp runs light to dark and stays in gamut', () => {
  const r = ramp('#c026d3');
  ok(luminance(r[0]) > luminance(r[11]), 'should darken');
  for (const h of r) ok(/^#[0-9a-f]{6}$/.test(h), `not a hex: ${h}`);
});

t('accessibleOn always returns something that clears the bar', () => {
  // Including for backgrounds where the obvious candidates all fail.
  for (const bg of ['#ffffff', '#000000', '#808080', '#4f46e5', '#ffe600', '#7f7f7f']) {
    const fg = accessibleOn(bg, ['#888888']);
    ok(contrast(bg, fg) >= 4.5, `${bg} → ${fg} is only ${contrast(bg, fg).toFixed(2)}`);
  }
});

// --- seed ------------------------------------------------------------------
t('the same seed gives the same sequence', () => {
  const a = Array.from({ length: 5 }, rng('x'));
  const b = Array.from({ length: 5 }, rng('x'));
  eq(a, b);
});
t('different seeds diverge', () => {
  const a = rng('x')();
  const b = rng('y')();
  ok(a !== b);
});
t('rng stays in range over many draws', () => {
  const r = rng('range');
  for (let i = 0; i < 5000; i++) {
    const v = r();
    ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});
t('a zero seed does not collapse', () => {
  const r = rng(0);
  const vals = new Set(Array.from({ length: 20 }, r));
  ok(vals.size > 15, 'seed 0 produced repeats');
});
t('seeds are short and URL-safe', () => {
  const s = toSeed(12345);
  eq(s.length, 5);
  ok(/^[a-z0-9]+$/.test(s), s);
});
t('helpers behave', () => {
  const c = chance('h');
  ok(c.int(1, 6) >= 1 && c.int(1, 6) <= 6);
  eq(c.shuffle([1, 2, 3]).sort(), [1, 2, 3]);
  ok(['a', 'b'].includes(c.weighted([['a', 1], ['b', 1]])));
});

// --- the central promise ---------------------------------------------------
t('EVERY vibe, mode and seed passes its own audit', () => {
  for (const v of VIBE_NAMES) {
    for (const dark of [false, true]) {
      for (let i = 0; i < 60; i++) {
        const s = system(`t${i}`, { vibe: v, dark });
        const a = audit(s);
        ok(a.passed, `${v}/${dark ? 'dark' : 'light'}/t${i}: ${a.failed.map((f) => `${f.name} ${f.ratio}`).join(', ')}`);
      }
    }
  }
});
t('the same seed always builds the same system', () => {
  eq(system('stable', { vibe: 'glassy' }).colour, system('stable', { vibe: 'glassy' }).colour);
});
t('dark mode is actually dark', () => {
  const light = system('x');
  const dark = system('x', { dark: true });
  ok(luminance(dark.colour.bg) < luminance(light.colour.bg));
});
t('a system carries everything the exporters need', () => {
  const s = system('complete');
  for (const k of ['colour', 'type', 'radius', 'space', 'shadow', 'motion', 'pattern', 'gradient']) {
    ok(s[k] !== undefined, `missing ${k}`);
  }
});

// --- avatars ---------------------------------------------------------------
t('every style renders self-contained SVG', () => {
  for (const style of STYLES) {
    const svg = avatar('mo', { style });
    ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${style}: malformed`);
    ok(!/<script|href=|xlink:|<image/.test(svg), `${style}: has an external reference`);
  }
});
t('an avatar is stable for a name', () => eq(avatar('mo'), avatar('mo')));
t('different names look different', () => ok(avatar('mo') !== avatar('siyu')));
t('a name cannot inject markup', () => {
  const svg = avatar('x', { label: '"><script>alert(1)</script>' });
  ok(!svg.includes('<script>'), 'injected');
});
t('an unknown style falls back rather than throwing', () => ok(avatar('mo', { style: 'nope' }).startsWith('<svg')));
t('avatars get a ring when they would vanish into the page', () => {
  // Pick the page colour to match the avatar's own background exactly.
  const p = paletteFor('ringtest');
  const svg = avatar('ringtest', { on: p.bg });
  ok(svg.includes('stroke-width="3"'), 'no separating ring was added');
});
t('initials handles one word, two words and nothing', () => {
  ok(avatar('mo', { style: 'initials', label: 'Mo Agarwal' }).includes('MA'));
  ok(avatar('x', { style: 'initials', label: 'Cher' }).includes('C'));
  ok(avatar('y', { style: 'initials', label: '' }).startsWith('<svg'));
});

// --- generators ------------------------------------------------------------
t('gradients export CSS and SVG, no image', () => {
  const g = gradient('a');
  ok(g.css.includes('radial-gradient'));
  ok(g.svg.startsWith('<svg'));
  ok(!/data:image\/(png|jpe?g)/.test(g.css + g.svg), 'a raster snuck in');
});
t('shadows stack, and deeper means more layers', () => {
  ok(shadow('floating').layers.length > shadow('flat').layers.length);
  for (const l of LEVELS) ok(shadow(l).css.startsWith('box-shadow'));
});
t('patterns are inline data URIs with no request', () => {
  for (const p of PATTERNS) {
    const pat = pattern(p);
    ok(pat.dataUri.startsWith("url('data:image/svg+xml,"), `${p} is not inline`);
    ok(pat.bytes < 4000, `${p} is ${pat.bytes} bytes`);
  }
});
t('a pattern survives being dropped into an HTML style attribute', () => {
  // This is how everybody actually uses it, and a double-quoted url() ends the
  // attribute early — which silently blanked every texture swatch on the site.
  for (const p of PATTERNS) {
    const pat = pattern(p);
    ok(!pat.dataUri.includes('"'), `${p} has a double quote and will break style="..."`);
    ok(!pat.css.includes('"'), `${p}.css has a double quote`);
  }
});
t('blobs close their path', () => ok(blob('x').d.trim().endsWith('Z')));
t('every divider produces a path', () => {
  for (const d of DIVIDERS) ok(divider(d).d.length > 10, d);
});
t('type scale grows by the ratio and tightens as it grows', () => {
  const s = scale({ base: 16, ratio: 1.25, steps: 6 });
  ok(Math.abs(s[3].px / s[2].px - 1.25) < 0.01, 'ratio wrong');
  ok(s[5].lineHeight < s[0].lineHeight, 'leading should tighten as size grows');
  ok(s[5].letterSpacing < s[0].letterSpacing, 'tracking should tighten as size grows');
});
t('every pairing names real stacks', () => {
  for (const p of PAIRINGS) {
    const ts = typeSystem({ pairing: p.name });
    ok(ts.heading.length > 3 && ts.body.length > 3, p.name);
    ok(!/https?:/.test(ts.heading + ts.body), `${p.name} needs a download`);
  }
});
t('every motion preset ships its own off switch', () => {
  for (const name of Object.keys(PRESETS)) {
    ok(motion(name).css.includes('@media (prefers-reduced-motion: reduce)'), name);
  }
});

// --- exports ---------------------------------------------------------------
t('all six exports are produced and non-trivial', () => {
  const e = exportAll(system('exp'));
  eq(Object.keys(e.files).length, 6);
  for (const [name, body] of Object.entries(e.files)) ok(body.length > 200, `${name} is suspiciously short`);
});
t('exports report their size and claim no runtime', () => {
  const e = exportAll(system('exp'));
  eq(e.runtimeBytes, 0);
  for (const s of Object.values(e.sizes)) ok(s.bytes > 0 && s.human.length > 0);
});
t('the JSON export parses and is token-shaped', () => {
  const j = JSON.parse(toJson(system('exp')));
  ok(j.color.bg.$value, 'missing $value');
  eq(j.color.bg.$type, 'color');
});
t('the Tailwind export is valid JavaScript', () => {
  const src = toTailwind(system('exp'));
  ok(src.includes('export default'));
  // Slice from the export, not from the first brace — the JSDoc type annotation
  // above it contains braces of its own.
  const body = src.slice(src.indexOf('export default') + 'export default'.length);
  JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1));
});
t('the CSS export declares every colour the audit checks', () => {
  const css = toCss(system('exp'));
  for (const v of ['--bg', '--text', '--brand', '--button-bg', '--focus', '--border']) {
    ok(css.includes(v), `missing ${v}`);
  }
});
t('exports carry the accessibility claim with them', () => {
  const e = exportAll(system('exp'));
  eq(e.accessible, true);
  ok(e.weakestRatio >= 4.5);
});

// --- extract ---------------------------------------------------------------
t('extract finds hex and rgb colours', () => {
  const d = extractFromCss('a{color:#4f46e5}b{color:rgb(15, 118, 110)}c{color:#FFF}');
  const found = d.colours.map((x) => x.value);
  ok(found.includes('#4f46e5') && found.includes('#0f766e') && found.includes('#ffffff'), found.join(' '));
});
t('extract picks the brand over the background', () => {
  const s = summarise(extractFromCss('body{background:#ffffff;color:#ffffff}a{color:#c026d3}body{background:#ffffff}'));
  eq(s.background, '#ffffff');
  eq(s.brand, '#c026d3');
});
t('extract survives css with nothing in it', () => eq(summarise(extractFromCss('')), null));

// --- chaos -----------------------------------------------------------------
t('the chaos suite covers the real failure modes', () => {
  const ids = CASES.map((c) => c.id);
  for (const id of ['long-word', 'rtl', 'empty', 'broken-image', 'zoom']) ok(ids.includes(id), `missing ${id}`);
});
t('every generated system passes the static checks', () => {
  for (const v of VIBE_NAMES) ok(staticChecks(system('c', { vibe: v })).passed, v);
});

// ---------------------------------------------------------------------------
if (fails.length) {
  console.error(`\n✗ ${fails.length} failing, ${pass} passing\n`);
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`✓ ${pass} tests passing`);
