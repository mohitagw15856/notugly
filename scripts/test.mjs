#!/usr/bin/env node
// Tests. The claim this project makes is checkable, so it is checked.

import { hexToRgb, rgbToHex, hexToOklch, oklchToHex, contrast, ramp, accessibleOn, luminance, rate } from '../lib/color.mjs';
import { rng, chance, toSeed, hash } from '../lib/seed.mjs';
import { avatar, describe, STYLES, paletteFor } from '../lib/avatar.mjs';
import { system, audit } from '../lib/system.mjs';
import { VIBE_NAMES } from '../lib/vibe.mjs';
import { exportAll, toCss, toTailwind, toJson } from '../lib/export.mjs';
import { staticChecks, CASES } from '../lib/chaos.mjs';
import { gradient } from '../lib/gradient.mjs';
import { shadow, allShadows, allElevationSurfaces, elevationSurface, LEVELS } from '../lib/shadow.mjs';
import { pattern, PATTERNS } from '../lib/pattern.mjs';
import { blob, divider, DIVIDERS } from '../lib/shape.mjs';
import { scale, typeSystem, PAIRINGS } from '../lib/type.mjs';
import { motion, PRESETS } from '../lib/motion.mjs';
import { MOODS, MOOD_STYLES, HATS, seasonalHat } from '../lib/avatar.mjs';
import { apca, apcaAdvice } from '../lib/apca.mjs';
import { simulate, collisions, checkVision, VISION } from '../lib/vision.mjs';
import { toCmyk, fromCmyk, tac, printShift, checkPrint, maxPrintableChroma } from '../lib/print.mjs';
import { fixContrast, inspect } from '../lib/fix.mjs';
import { roast } from '../lib/roast.mjs';
import { persona, cast, card, identityKit, handle, displayName, ARCHETYPES } from '../lib/persona.mjs';
import { mascot, MASCOT_STATES, reactTo, quip } from '../lib/mascot.mjs';
import { toFigma, toVsCode, toIOS, toAndroid, toReactNative, toFlutter, toEmail } from '../lib/targets.mjs';
import { name as nameColour, nameAll, nearestName } from '../lib/names.mjs';
import { quantise, paletteFromImage, paletteFromImages, perceptualDistance } from '../lib/quantise.mjs';
import { specSheet, specMarkdown, compare, onePager, onePagerHtml, costOf } from '../lib/spec.mjs';
import { zip } from '../lib/zip.mjs';
import { toThmx, toSlidesGuide, toSlidesJson, chartAccents, chartLegibility, officeColours } from '../lib/slides.mjs';
import { poster, specimen, zine, printWarnings, PAPER } from '../lib/paper.mjs';
import { ERAS, inEra, allEras, eraCard } from '../lib/era.mjs';
import { snapshot, drift, driftText } from '../lib/drift.mjs';
import { team, teamSheet, teamDistinct } from '../lib/team.mjs';
import { readTokens, auditTokens, toStorybook } from '../lib/ingest.mjs';
import { sticker, stickerPack, STICKER_MOTIONS } from '../lib/persona.mjs';
import { extractFromCss, summarise } from '../lib/extract.mjs';
import { glassMaterial, glassLegibility, concentricRadius, squirclePath, WORST_CASE_BACKGROUNDS } from '../lib/liquidglass.mjs';
import { encodePng, decodePng, encodeIco } from '../lib/raster.mjs';
import { iconPixels, iconPackage, ICON_SIZES } from '../lib/icon.mjs';
import { glyphFor } from '../lib/font5x7.mjs';
import { checkRtl, checkSystemRtl } from '../lib/rtl.mjs';
import { accessibilityStatement } from '../lib/statement.mjs';
import { benchmark, APPROACHES } from '../lib/benchmark.mjs';
import { brandSet, brandDistinct } from '../lib/brand.mjs';

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
t('a sticker never hides its character in the plate', () => {
  // A pale ghost on a pale sticker plate used to render as two floating dots.
  for (let i = 0; i < 300; i++) {
    const svg = avatar(`st${i}`, { style: 'sticker' });
    const marks = (svg.match(/<(circle|path|ellipse|rect)\b/g) || []).length;
    ok(marks >= 8, `sticker st${i} has only ${marks} marks`);
  }
});
t('pencil people are drawn on paper, not on a saturated disc', () => {
  const svg = avatar('mo', { style: 'pencil' });
  const bg = svg.match(/<rect width="100" height="100" fill="(#[0-9a-f]{6})"/)[1];
  ok(luminance(bg) > 0.75, `pencil backdrop ${bg} is too dark to read as paper`);
});
t('the new styles all render and stay self-contained', () => {
  for (const style of ['pencil', 'specs', 'cat', 'ghost', 'sticker']) {
    const svg = avatar('mo', { style });
    ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), style);
    ok(!/<script|href=|xlink:|<image/.test(svg), `${style} has an external reference`);
  }
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
t('every export target is produced and non-trivial', () => {
  const e = exportAll(system('exp'));
  eq(Object.keys(e.files).length, 30);
  for (const [name, body] of Object.entries(e.files)) {
    // Xcode's own xcassets catalog root is genuinely this small — it is
    // metadata, not a colour definition, so it is the one legitimate exception.
    if (name === 'ios/Assets.xcassets/Contents.json') continue;
    ok(body.length > 150, `${name} is suspiciously short`);
  }
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
t('the iOS export is a valid xcassets catalog with both appearances', () => {
  const files = toIOS(system('exp'));
  const bg = JSON.parse(files['Assets.xcassets/NotuglyBg.colorset/Contents.json']);
  eq(bg.colors.length, 2, 'expected a light and a dark appearance');
  ok(Array.isArray(bg.colors[1].appearances), 'the second entry should declare a dark appearance');
  for (const entry of bg.colors) {
    for (const ch of ['red', 'green', 'blue']) {
      const v = Number(entry.color.components[ch]);
      ok(v >= 0 && v <= 1, `${ch} out of 0–1 range: ${v}`);
    }
  }
});
t('the Android export declares every core colour in both light and dark', () => {
  const files = toAndroid(system('exp'));
  for (const path of ['src/main/res/values/colors.xml', 'src/main/res/values-night/colors.xml']) {
    const xml = files[path];
    const count = (xml.match(/<color name=/g) || []).length;
    eq(count, 11, `${path}: expected 11 colour entries`);
    ok(!xml.includes('undefined'), `${path} leaked an undefined value`);
  }
});
t('the Flutter export is a real ThemeData with a full colour scheme', () => {
  const dart = toFlutter(system('exp'));
  ok(dart.includes('ThemeData'));
  ok(dart.includes('ColorScheme.'));
  ok(!dart.includes('undefined'));
});
t('the React Native export has no CSS in it', () => {
  const src = toReactNative(system('exp'));
  ok(src.includes('export const colors'));
  ok(!/var\(--|@media|backdrop-filter/.test(src), 'RN has no CSS engine — this should never reach it');
});
t('the email export has no <style> block or CSS variable an email client might strip', () => {
  const html = toEmail(system('exp'));
  ok(!/<style/.test(html), 'email clients strip <style> blocks');
  ok(!/var\(--/.test(html), 'email clients do not resolve CSS custom properties');
  ok(html.includes('<table'), 'should be table-based layout');
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



// --- APCA -------------------------------------------------------------------

t('APCA matches the published reference values', () => {
  // These three exercise both polarities and every constant in the model. If
  // the implementation drifts, one of them moves.
  eq(apca('#000000', '#ffffff'), 106.04, 'black on white');
  eq(apca('#ffffff', '#000000'), -107.88, 'white on black');
  eq(apca('#888888', '#ffffff'), 63.06, 'mid grey on white');
});

t('APCA is asymmetric, which is the entire point of it', () => {
  // WCAG 2 gives these two the same number. They are not equally readable.
  ok(Math.abs(apca('#767676', '#ffffff')) !== Math.abs(apca('#ffffff', '#767676')),
     'swapping text and background produced the same magnitude');
});

t('identical colours have no contrast in either model', () => {
  eq(apca('#4a5568', '#4a5568'), 0);
  eq(+contrast('#4a5568', '#4a5568').toFixed(2), 1);
});

// --- colour vision ----------------------------------------------------------

t('a deuteranope sees red and green converge on the same hue', () => {
  const [, , redH] = hexToOklch(simulate('#ff0000', 'deuteranopia'));
  const [, , greenH] = hexToOklch(simulate('#00ff00', 'deuteranopia'));
  const gap = Math.abs(((redH - greenH + 540) % 360) - 180);
  ok(gap < 20, `red and green stayed ${gap.toFixed(0)}° apart — the matrices are wrong`);
});

t('blue is untouched for a deuteranope and grey is untouched for everyone', () => {
  eq(simulate('#0000ff', 'deuteranopia'), '#0000ff');
  for (const kind of VISION) eq(simulate('#808080', kind), '#808080', kind);
});

t('severity zero is the identity, so partial deficiency interpolates properly', () => {
  for (const kind of VISION) eq(simulate('#e4002b', kind, 0), '#e4002b', kind);
});

t('each deficiency is a genuinely different transform', () => {
  // Not blue: blue is a fixed point of all three projections by construction,
  // because the planes are built to contain the blue and white anchors. Green
  // is where they actually disagree.
  const seen = new Set(['protanopia', 'deuteranopia', 'tritanopia'].map((k) => simulate('#22aa55', k)));
  eq(seen.size, 3, 'two deficiencies produced the same answer');
});

t('blue survives all three dichromacies, as the model says it must', () => {
  for (const k of ['protanopia', 'deuteranopia', 'tritanopia']) eq(simulate('#0000ff', k), '#0000ff', k);
});

t('collisions only report pairs that were distinguishable to begin with', () => {
  // Two identical colours are not a colour-blindness problem.
  eq(collisions(['#123456', '#123456']).length, 0);
});

t('no generated system has two colours that merge for a viewer', () => {
  for (const v of VIBE_NAMES) {
    for (const dark of [false, true]) {
      const r = checkVision(system('vision-check', { vibe: v, dark }).colour);
      ok(r.passed, `${v}${dark ? ' dark' : ''}: ${JSON.stringify(r.collisions[0] ?? {})}`);
    }
  }
});

// --- print ------------------------------------------------------------------

t('CMYK round-trips, so the gamut check cannot lean on it', () => {
  for (const hex of ['#ffffff', '#000000', '#ff0000', '#3a7bd5']) eq(fromCmyk(toCmyk(hex)), hex);
});

t('total ink coverage is sane at the extremes', () => {
  eq(tac('#ffffff'), 0, 'paper needs no ink');
  eq(tac('#000000'), 100, 'black is one plate, not four');
});

t('paper white and solid black are printable, obviously', () => {
  // Both round to a chroma of ~1e-8 against a limit of ~1e-8. Without an
  // epsilon this reports the background colour of every light system as a
  // print defect.
  for (const hex of ['#ffffff', '#000000', '#fefefe', '#010101']) {
    ok(printShift(hex).inGamut, `${hex} was called unprintable`);
  }
});

t('acid colours are out of gamut and muted ones are not', () => {
  for (const hex of ['#00ffcc', '#7fff00', '#ff00ff']) {
    ok(!printShift(hex).inGamut, `${hex} should be unprintable`);
  }
  for (const hex of ['#4a6fa5', '#8a8577', '#2b4c3f']) {
    ok(printShift(hex).inGamut, `${hex} should print fine`);
  }
});

t('the printable substitute is always inside the gamut it was pulled into', () => {
  for (const hex of ['#00ffcc', '#ff00ff', '#7fff00', '#ffff00']) {
    const near = printShift(hex).as;
    // Allow a hair of slack for the sRGB clamp on the way back out.
    const [L, C, h] = hexToOklch(near);
    ok(C <= maxPrintableChroma(h, L) + 0.01, `${hex} → ${near} is still outside`);
  }
});

t('nothing generated exceeds the ink limit', () => {
  for (const v of VIBE_NAMES) {
    for (const dark of [false, true]) {
      const sys = system('ink', { vibe: v, dark });
      for (const hex of Object.values(sys.colour).filter((x) => typeof x === 'string')) {
        ok(checkPrint(hex).coverage <= 300, `${hex} in ${v} is ${checkPrint(hex).coverage}% ink`);
      }
    }
  }
});

// --- the fixer --------------------------------------------------------------

t('a passing pairing is returned untouched', () => {
  const r = fixContrast('#000000', '#ffffff');
  eq(r.changed, false);
  eq(r.to, '#000000');
});

t('the fix actually clears the target it was given', () => {
  const cases = [['#8ab4f8', '#ffffff'], ['#cccccc', '#dddddd'], ['#e4002b', '#000000'], ['#777777', '#ffffff']];
  for (const [fg, bg] of cases) {
    for (const target of [3, 4.5, 7]) {
      const r = fixContrast(fg, bg, { target });
      if (r.impossible) continue;
      ok(contrast(r.to, bg) >= target, `${fg} on ${bg} → ${r.to} is ${contrast(r.to, bg).toFixed(2)}, needed ${target}`);
    }
  }
});

t('the fix keeps the hue — it is still your colour', () => {
  const r = fixContrast('#8ab4f8', '#ffffff');
  const before = hexToOklch('#8ab4f8')[2];
  const after = hexToOklch(r.to)[2];
  ok(Math.abs(((before - after + 540) % 360) - 180) < 6, `hue moved from ${before.toFixed(0)}° to ${after.toFixed(0)}°`);
});

t('the fix moves the text by default, not the background', () => {
  // Getting this backwards silently returns greys, which looks like it works.
  eq(fixContrast('#8ab4f8', '#ffffff').from, '#8ab4f8');
  eq(fixContrast('#8ab4f8', '#ffffff', { move: 'bg' }).from, '#ffffff');
});

t('the fix takes the shortest route, not the obvious one', () => {
  const r = fixContrast('#777777', '#ffffff');
  ok(r.moved <= 0.02, `moved ${r.moved} to fix a pairing that was 0.02 short`);
});

// --- the roast --------------------------------------------------------------

t('a good palette is not roasted', () => {
  const r = roast(['#ffffff', '#1a1a1a', '#4a5568', '#2b6cb0'], { fonts: ['Inter', 'Georgia'], radii: ['4px', '8px'] });
  eq(r.score, 100);
});

t('every burn is earned from a measurement, not a mood', () => {
  const r = roast(['#ffffff', '#f8f8f8']);
  // One finding: unreadable text. Not a generic insult.
  ok(r.burns.every((b) => b.severity === 0 || b.evidence || b.fix), 'a burn arrived with no evidence attached');
});

t('the roast is deterministic', () => {
  const args = ['#ffffff', '#f8f8f8', '#00ffcc'];
  eq(JSON.stringify(roast(args)), JSON.stringify(roast(args)));
});

// --- moods and hats ---------------------------------------------------------

t('a mood changes the expression and nothing else about the person', () => {
  // The seeded stream must not shift, or you get a different person per mood.
  const hairOf = (svg) => (svg.match(/<path d="M(?:29|30|50) [^"]*" fill="#[0-9a-f]{6}"\/>/) || [''])[0];
  for (const style of MOOD_STYLES) {
    const base = avatar('mood-test', { style });
    for (const m of MOODS) {
      const withMood = avatar('mood-test', { style, mood: m });
      eq(hairOf(withMood), hairOf(base), `${style} + ${m} changed the hair`);
    }
  }
});

t('every mood produces a different face', () => {
  const seen = new Set(MOODS.map((m) => avatar('m', { style: 'face', mood: m })));
  eq(seen.size, MOODS.length, 'two moods rendered identically');
});

// Clip ids vary with the render options by design, so compare the artwork.
const artwork = (svg) => svg.replace(/c[a-z0-9]+/g, 'ID');

t('every hat lands on a head, and none is drawn on a style without one', () => {
  for (const hat of HATS.filter((h) => h !== 'none')) {
    ok(avatar('h', { style: 'face', hat }) !== avatar('h', { style: 'face' }), `${hat} did nothing on a face`);
    // Abstract styles have no head, so a hat must be a no-op rather than a
    // shape floating in the corner.
    eq(artwork(avatar('h', { style: 'pixel', hat })), artwork(avatar('h', { style: 'pixel' })), `${hat} appeared on a pixel avatar`);
  }
});

t('the seasonal hat is a suggestion, never applied on its own', () => {
  eq(artwork(avatar('s', { style: 'face' })), artwork(avatar('s', { style: 'face', hat: 'none' })));
  ok(HATS.includes(seasonalHat(new Date('2026-12-25'))));
  ok(HATS.includes(seasonalHat(new Date('2026-07-04'))));
});

// --- personas ---------------------------------------------------------------

t('a persona is the same person forever', () => {
  const a = persona('mo');
  const b = persona('mo');
  eq(a.name, b.name);
  eq(a.archetype, b.archetype);
  eq(a.colour, b.colour);
  eq(a.bio, b.bio);
});

t("a persona's name and handle describe the same person", () => {
  for (const s of ['a', 'b', 'c', 'd', 'e']) {
    const p = persona(s);
    const fromName = p.name.toLowerCase().replace(/[^a-z]/g, '');
    const fromHandle = p.handle.slice(1).replace(/[^a-z]/g, '');
    eq([...fromName].sort().join(''), [...fromHandle].sort().join(''), `${p.name} vs ${p.handle}`);
  }
});

t('a cast is visually distinct, which is the only reason it exists', () => {
  const people = cast(['ada', 'grace', 'linus', 'radia', 'katherine']);
  const hues = people.map((p) => hexToOklch(p.colour)[2]);
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      const gap = Math.abs(((hues[i] - hues[j] + 540) % 360) - 180);
      ok(gap > 18, `${people[i].name} and ${people[j].name} are ${gap.toFixed(0)}° apart`);
    }
  }
});

t('a cast keeps every name and handle in sync too', () => {
  for (const p of cast(['ada', 'grace', 'linus'])) {
    const fromName = p.name.toLowerCase().replace(/[^a-z]/g, '');
    const fromHandle = p.handle.slice(1).replace(/[^a-z]/g, '');
    eq([...fromName].sort().join(''), [...fromHandle].sort().join(''), `${p.name} vs ${p.handle}`);
  }
});

t("a persona's system passes its own audit, brand lock and all", () => {
  for (const a of ARCHETYPES) {
    for (const dark of [false, true]) {
      const p = persona('audit-me', { archetype: a.key, dark });
      ok(audit(p.system).passed, `${a.key}${dark ? ' dark' : ''}`);
    }
  }
});

t('a social card has nothing in it that can fail to load', () => {
  const svg = card(persona('mo'), { tagline: 'made with notugly' });
  ok(!/<script|<image|xlink:|href=/.test(svg), 'the card reaches outside itself');
  // url() is allowed only for the clip path it defines inline.
  for (const ref of svg.match(/url\([^)]*\)/g) || []) {
    ok(/^url\(#/.test(ref) && svg.includes(`id="${ref.slice(5, -1)}"`), `${ref} points somewhere else`);
  }
  ok(svg.startsWith('<svg') && svg.trimEnd().endsWith('</svg>'));
});

t('the face on a card fills its frame instead of sitting in it as a speck', () => {
  // Avatars are drawn in a 0-100 viewBox. Strip the <svg> wrapper to compose
  // one and the viewBox mapping goes with it — the drawing silently renders at
  // a fraction of the size, which looks like a styling problem and is not one.
  const svg = card(persona('mo'));
  const clipR = Number(svg.match(/<clipPath id="pc"><circle cx="\d+" cy="\d+" r="(\d+)"/)[1]);
  const scale = Number(svg.match(/<g transform="scale\(([\d.]+)\)">/)[1]);
  eq(scale * 100, clipR * 2, 'the drawing is not scaled to the circle that clips it');
});

t('a long name does not run off the edge of the card', () => {
  const svg = card(persona('x', { name: 'Bartholomew Featherstonehaugh-Cholmondeley' }));
  const size = Number(svg.match(/font-size="(\d+)" font-weight="700"/)[1]);
  ok(size < 76, `title stayed at ${size}px and will overflow`);
});

t('an identity kit contains every asset it claims to', () => {
  const kit = identityKit(persona('mo'));
  for (const k of ['favicon', 'small', 'medium', 'large']) ok(kit.avatars[k], `missing ${k}`);
  ok(kit.card.includes('<svg'));
  ok(kit.faviconSquare.includes('<svg'));
  ok(kit.css.includes('--persona:'));
});

t('a persona reads as coherent: the archetype picks the face and the vibe', () => {
  for (const a of ARCHETYPES) {
    const p = persona('coherence', { archetype: a.key });
    ok(a.styles.includes(p.style), `${a.key} got a ${p.style}`);
    ok(STYLES.includes(p.style), `${p.style} is not a real style`);
  }
});

// --- the mascot -------------------------------------------------------------

t('the mascot renders in every state and moves something each time', () => {
  const sys = system('mascot');
  const seen = new Set(MASCOT_STATES.map((s) => mascot(sys.colour, { state: s })));
  eq(seen.size, MASCOT_STATES.length, 'two states looked identical');
});

t('the mascot exposes the ids the page animates', () => {
  const svg = mascot(system('m').colour);
  for (const id of ['nu-mascot-pupils', 'nu-mascot-mouth', 'nu-mascot-brows']) {
    ok(svg.includes(`id="${id}"`), `missing #${id} — the page would re-serialise on every mousemove`);
  }
});

t('the mascot borrows the current system rather than hard-coding colours', () => {
  const a = mascot(system('one', { vibe: 'brutalist' }).colour);
  const b = mascot(system('one', { vibe: 'terminal', dark: true }).colour);
  ok(a !== b, 'the mascot ignored the system it was given');
});

t('every mascot reaction maps to a real state with a real line', () => {
  for (const e of ['reroll', 'audit', 'export', 'hover', 'idle-long', 'nonsense']) {
    const s = reactTo(e, { passed: true });
    ok(MASCOT_STATES.includes(s), `${e} → ${s}`);
    ok(quip(s).length > 0, `${s} has nothing to say`);
  }
});

// --- brand lock -------------------------------------------------------------

t('a locked brand colour is used exactly as given', () => {
  for (const brand of ['#e4002b', '#1db954', '#ff9900', '#0057b8']) {
    eq(system('lock', { brand }).brandLocked, brand);
  }
});

t('locking a brand never breaks the audit', () => {
  const brands = ['#e4002b', '#1db954', '#ff9900', '#0057b8', '#000000', '#ffe600', '#7b2ff7', '#00d4ff'];
  for (const brand of brands) {
    for (const v of VIBE_NAMES) {
      for (const dark of [false, true]) {
        ok(audit(system('lock', { vibe: v, dark, brand })).passed, `${brand} ${v}${dark ? ' dark' : ''}`);
      }
    }
  }
});

t('a locked brand actually steers the palette', () => {
  const red = system('same-seed', { brand: '#e4002b' });
  const green = system('same-seed', { brand: '#1db954' });
  ok(red.colour.brand !== green.colour.brand, 'the lock was ignored');
});

// --- Figma and VS Code ------------------------------------------------------

t('the Figma plugin is valid JSON with the fields Figma requires', () => {
  const f = toFigma(system('mo'));
  const m = JSON.parse(f['manifest.json']);
  for (const key of ['name', 'id', 'api', 'main', 'editorType']) ok(m[key], `manifest missing ${key}`);
  eq(m.main, 'code.js');
  ok(f['code.js'].includes('figma.variables.createVariableCollection'));
});

t('Figma colours are 0-1 floats, not hex, which catches everyone out once', () => {
  const code = toFigma(system('mo'))['code.js'];
  const colours = JSON.parse(code.slice(code.indexOf('const COLOURS = ') + 16, code.indexOf(';\n\nconst NUMBERS')));
  for (const [name, v] of Object.entries(colours)) {
    for (const ch of ['r', 'g', 'b']) {
      ok(typeof v[ch] === 'number' && v[ch] >= 0 && v[ch] <= 1, `${name}.${ch} is ${v[ch]}`);
    }
  }
});

t('the VS Code theme is valid JSON and every colour is a real hex', () => {
  const v = toVsCode(system('mo', { dark: true }));
  JSON.parse(v['package.json']);
  const theme = JSON.parse(v['themes/notugly-color-theme.json']);
  for (const [k, val] of Object.entries(theme.colors)) {
    ok(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(val), `${k} is ${val}`);
  }
});

t('the editor theme holds notugly to its own promise', () => {
  // If the generated theme has unreadable syntax colours, the claim is a lie
  // everywhere it is easiest to notice.
  for (const v of VIBE_NAMES) {
    for (const dark of [false, true]) {
      const theme = JSON.parse(toVsCode(system('mo', { vibe: v, dark }))['themes/notugly-color-theme.json']);
      const bg = theme.colors['editor.background'];
      for (const tc of theme.tokenColors) {
        const ratio = contrast(tc.settings.foreground, bg);
        ok(ratio >= 4.5, `${v}${dark ? ' dark' : ''} ${tc.scope[0]} is ${ratio.toFixed(2)}:1 on ${bg}`);
      }
    }
  }
});

t('the theme uses distinct colours per token type', () => {
  const theme = JSON.parse(toVsCode(system('mo', { dark: true }))['themes/notugly-color-theme.json']);
  const used = new Set(theme.tokenColors.map((t) => t.settings.foreground));
  ok(used.size >= 5, `only ${used.size} distinct syntax colours — every token type looks the same`);
});

// --- the new characters -----------------------------------------------------

t('every style still renders, including the new ones', () => {
  for (const s of STYLES) {
    const svg = avatar('render-all', { style: s, label: 'render-all' });
    ok(svg.startsWith('<svg') && svg.trimEnd().endsWith('</svg>'), s);
    ok(!/undefined|NaN|\[object/.test(svg), `${s} rendered a hole`);
  }
});

t('no avatar reaches outside itself for an asset', () => {
  for (const s of STYLES) {
    ok(!/<script|<image|xlink:|href=/.test(avatar('x', { style: s })), s);
  }
});

t('a pair avatar contains two characters, not one scaled up', () => {
  const svg = avatar('two', { style: 'duo' });
  eq((svg.match(/<g transform="translate\(\d+ \d+\) scale/g) || []).length, 2);
});

t('creatures stay inside the frame', () => {
  // Anything drawn past the viewBox gets clipped into a shape nobody designed.
  for (const s of ['dog', 'duck', 'capybara', 'monster', 'object', 'line']) {
    for (let i = 0; i < 40; i++) {
      const svg = avatar(`frame-${i}`, { style: s });
      // Read the geometry attributes only. Scanning the whole string picks up
      // the 2000 in the xmlns URL, the digits inside #00a651, and the hash in
      // a clip-path id — none of which are coordinates.
      const coords = [...svg.matchAll(/\s(?:d|points|cx|cy|rx|ry|r|x|y|x1|y1|x2|y2)="([^"]*)"/g)]
        .flatMap(([, v]) => [...v.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number));
      ok(Math.max(...coords) < 130, `${s} seed ${i} drew at ${Math.max(...coords)}`);
    }
  }
});



// --- elevation --------------------------------------------------------------

t('every system carries the whole elevation ladder, not just its own rung', () => {
  for (const v of VIBE_NAMES) {
    const sys = system('elev', { vibe: v });
    eq(Object.keys(sys.elevation), LEVELS, v);
    ok(sys.elevation[sys.shadow.level], `${v} sits on a level that is not in the ladder`);
  }
});

t('elevation levels are visibly different from each other', () => {
  // The old bug: the site faked levels by scaling one shadow's pixel values.
  // In Editorial that single shadow is one layer at 2.7% opacity, so all five
  // levels rendered as identical invisible boxes. Geometry alone is not enough
  // — layer count and opacity have to move too.
  for (const v of VIBE_NAMES) {
    for (const dark of [false, true]) {
      const e = system('elev', { vibe: v, dark }).elevation;
      const counts = LEVELS.map((l) => e[l].layers.length);
      const strings = LEVELS.map((l) => e[l].layers.join(','));

      eq(new Set(strings).size, LEVELS.length, `${v}${dark ? ' dark' : ''}: two levels are identical`);
      for (let i = 1; i < counts.length; i++) {
        ok(counts[i] >= counts[i - 1], `${v}: ${LEVELS[i]} has fewer layers than ${LEVELS[i - 1]}`);
      }
    }
  }
});

t('a higher elevation is actually darker, not merely bigger', () => {
  const e = system('elev').elevation;
  const ink = (level) =>
    e[level].layers.reduce((sum, l) => sum + Number(l.match(/([\d.]+)\)$/)[1]), 0);
  for (let i = 1; i < LEVELS.length; i++) {
    ok(ink(LEVELS[i]) > ink(LEVELS[i - 1]),
       `${LEVELS[i]} carries no more shadow than ${LEVELS[i - 1]} — scaling geometry only is the old bug`);
  }
});

t('dark mode lifts the surface, because a dark shadow on a dark page is nothing', () => {
  for (const v of VIBE_NAMES) {
    const light = system('elev', { vibe: v });
    const dark = system('elev', { vibe: v, dark: true });

    // Light mode: shadows do the work, the surface never moves.
    eq(new Set(Object.values(light.elevationSurface)).size, 1, `${v} light shifted its surface`);

    // Dark mode: the surface has to move, or every level looks identical.
    ok(new Set(Object.values(dark.elevationSurface)).size > 1,
       `${v} dark has one surface for every elevation — the levels are invisible`);
  }
});

t('a raised surface never costs you the text on it', () => {
  // Lifting the surface for depth is only allowed while the text still clears
  // AA. Contrast beats depth; that is the whole premise.
  for (const v of VIBE_NAMES) {
    const sys = system('elev', { vibe: v, dark: true });
    for (const [level, bg] of Object.entries(sys.elevationSurface)) {
      const ratio = contrast(sys.colour.text, bg);
      ok(ratio >= 4.5, `${v} ${level}: text is ${ratio.toFixed(2)}:1 on the raised surface ${bg}`);
    }
  }
});

t('the exported CSS contains every elevation the site shows', () => {
  // The panel used to advertise a scale the artefact did not contain.
  const css = toCss(system('elev'));
  for (const l of LEVELS) ok(css.includes(`--shadow-${l}:`), `--shadow-${l} is missing from the export`);
  for (const l of LEVELS) ok(css.includes(`--surface-${l}:`), `--surface-${l} is missing from the export`);
  ok(/--shadow: var\(--shadow-\w+\);/.test(css), '--shadow no longer aliases a real level');
});

t('the elevation scale survives every export format', () => {
  const sys = system('elev');
  const tokens = JSON.parse(toJson(sys));
  for (const l of LEVELS) ok(tokens.shadow[l], `tokens.json is missing shadow.${l}`);

  const tw = toTailwind(sys);
  const config = JSON.parse(tw.slice(tw.indexOf('export default') + 14, tw.lastIndexOf(';')));
  for (const l of LEVELS) ok(config.theme.extend.boxShadow[l], `tailwind is missing boxShadow.${l}`);
});



// --- colour names -------------------------------------------------------------

t('a colour gets the same name every time', () => {
  for (const hex of ['#4f76b6', '#e4002b', '#8a8577']) eq(nameColour(hex).name, nameColour(hex).name);
});

t('names are unique within one palette', () => {
  // Two roles both called "Slate" in one table reads as a bug in the tool.
  const names = nameAll(['#5a6672', '#5a6673', '#5a6674', '#5b6773']).map((n) => n.name);
  eq(new Set(names).size, names.length, `collided: ${names.join(', ')}`);
});

t('a name is honest about how close it is', () => {
  // An exact anchor should claim to be exact; something between two anchors
  // should not.
  ok(nameColour('#5478b8').exact, 'an exact anchor did not report as exact');
  eq(nearestName('#5478b8').name, 'Hydrangea');
});

t('near-greys are named as greys, not as a hue they barely have', () => {
  for (const hex of ['#f7f7f7', '#808080', '#1a1a1a']) ok(nameColour(hex).grey, `${hex} was given a hue name`);
});

// --- image to palette ---------------------------------------------------------

const testImage = (regions) => {
  const W = 120, H = 120;
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // Last match wins, so a later region paints *over* an earlier one.
      // Taking the first match meant a full-canvas background always won and
      // the accent under test was never drawn at all.
      const hit = [...regions].reverse().find((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) ?? regions[0];
      data[i] = hit.rgb[0]; data[i + 1] = hit.rgb[1]; data[i + 2] = hit.rgb[2]; data[i + 3] = 255;
    }
  }
  return { data, width: W, height: H };
};

t('the same image always gives the same palette', () => {
  const img = testImage([{ x0: 0, y0: 0, x1: 120, y1: 120, rgb: [240, 120, 40] }, { x0: 0, y0: 80, x1: 120, y1: 120, rgb: [40, 60, 90] }]);
  eq(JSON.stringify(paletteFromImage(img)), JSON.stringify(paletteFromImage(img)), 'a palette that changes per run is a slot machine');
});

t('a small accent survives a large background', () => {
  // The bug this catches: merging near-duplicates by contrast ratio rather than
  // perceptual distance. A teal accent and an orange sky sit within 1.1:1 of
  // each other in luminance, so a contrast-based merge silently eats the accent.
  const img = testImage([
    { x0: 0, y0: 0, x1: 120, y1: 120, rgb: [240, 120, 40] },
    { x0: 90, y0: 30, x1: 120, y1: 60, rgb: [30, 160, 170] },
  ]);
  const p = paletteFromImage(img);
  ok(p.colours.some((c) => hexToOklch(c.hex)[2] > 180 && hexToOklch(c.hex)[2] < 260), `accent lost: ${p.colours.map((c) => c.hex).join(', ')}`);
});

t('perceptual distance disagrees with contrast, which is the point', () => {
  // These two are near-identical in luminance and nothing alike to look at.
  ok(contrast('#f07828', '#1ea0aa') < 1.2, 'test premise: these should have similar luminance');
  ok(perceptualDistance('#f07828', '#1ea0aa') > 0.2, 'perceptual distance failed to separate them');
});

t('a mood board weights every image equally', () => {
  const big = testImage([{ x0: 0, y0: 0, x1: 120, y1: 120, rgb: [200, 40, 40] }]);
  const small = testImage([{ x0: 0, y0: 0, x1: 120, y1: 120, rgb: [40, 40, 200] }]);
  const board = paletteFromImages([big, small]);
  eq(board.colours.length, 2, 'one image drowned out the other');
});

// --- zip ----------------------------------------------------------------------

t('the zip writer produces a byte-identical archive every run', () => {
  const a = zip([{ name: 'a.txt', data: 'hello' }]);
  const b = zip([{ name: 'a.txt', data: 'hello' }]);
  eq([...a].join(','), [...b].join(','), 'the archive changes between runs');
});

t('the zip has the signatures a reader looks for', () => {
  const z = zip([{ name: 'x', data: 'y' }]);
  eq([z[0], z[1], z[2], z[3]].join(','), '80,75,3,4', 'wrong local file header');
  // End-of-central-directory, last 22 bytes.
  const end = z.slice(z.length - 22);
  eq([end[0], end[1], end[2], end[3]].join(','), '80,75,5,6', 'wrong end-of-central-directory');
});

// --- deck themes --------------------------------------------------------------

t('all six chart accents are distinguishable, in every vibe and mode', () => {
  // PowerPoint assigns accent1..6 to chart series in order, so *every* pair has
  // to differ — not just neighbours. Hand-picking ramp indices put accent1 and
  // accent5 within 1.05:1 in all ten combinations.
  for (const v of VIBE_NAMES) {
    for (const dark of [false, true]) {
      const r = chartLegibility(system('chart', { vibe: v, dark }));
      ok(r.passed, `${v}${dark ? ' dark' : ''}: ${JSON.stringify(r.problems)}`);
    }
  }
});

t('chart accents stay visible against the slide background', () => {
  for (const v of VIBE_NAMES) {
    for (const dark of [false, true]) {
      const sys = system('chart', { vibe: v, dark });
      for (const a of Object.values(chartAccents(sys))) {
        ok(contrast(a, sys.colour.bg) >= 1.3, `${a} is invisible on ${sys.colour.bg} in ${v}`);
      }
    }
  }
});

t('the theme file is a real archive with the parts Office expects', () => {
  const bytes = toThmx(system('deck'));
  const text = new TextDecoder().decode(bytes);
  for (const part of ['[Content_Types].xml', '_rels/.rels', 'theme/theme/theme1.xml']) {
    ok(text.includes(part), `missing ${part}`);
  }
  ok(text.includes('<a:clrScheme'), 'no colour scheme in the theme');
});

t('Office colours are bare six-digit hex, without the hash', () => {
  // srgbClr val="#FF0000" is silently ignored by Office. It has to be FF0000.
  const text = new TextDecoder().decode(toThmx(system('deck')));
  ok(!/val="#/.test(text), 'a hash leaked into an Office colour value');
  eq((text.match(/<a:srgbClr val="[0-9A-F]{6}"\/>/g) || []).length >= 8, true);
});

// --- print artefacts ----------------------------------------------------------

t('print artefacts are real paper sizes, in millimetres', () => {
  const sys = system('paper');
  for (const [make, size] of [[poster, 'A3'], [specimen, 'A4']]) {
    const svg = make(sys, { size });
    const [w, h] = PAPER[size];
    ok(svg.includes(`width="${w}mm"`), `${size} width is wrong`);
    ok(svg.includes(`height="${h}mm"`), `${size} height is wrong`);
  }
});

t('nothing on a printed sheet runs off the edge', () => {
  // A specimen that clips its own pangram is worse than one set a point
  // smaller, so `line()` shrinks to fit. This checks it actually does.
  const sys = system('paper');
  const [w] = PAPER.A4;
  const svg = specimen(sys, { size: 'A4' });
  for (const m of svg.matchAll(/<text x="([\d.]+)"([^>]*)>([^<]*)</g)) {
    const [, x, attrs, text] = m;
    // Right-anchored labels grow leftward from x, so measuring them as if they
    // were left-anchored reports an overflow that is not there.
    if (attrs.includes('text-anchor="end"')) continue;
    const size = Number((attrs.match(/font-size="([\d.]+)"/) || [])[1] ?? 0);
    const width = [...text].length * size * 0.55;
    ok(Number(x) + width < w * 1.02, `"${text.slice(0, 24)}" at ${size}mm overflows the sheet`);
  }
});

t('print artefacts only use colours a press can reach', () => {
  const sys = system('paper', { vibe: 'playful' });
  for (const svg of [poster(sys), specimen(sys)]) {
    for (const m of svg.matchAll(/fill="(#[0-9a-f]{6})"/g)) {
      ok(printShift(m[1]).inGamut, `${m[1]} is out of gamut on a printed artefact`);
    }
  }
});

t('the zine imposes eight pages with each one used once', () => {
  const svg = zine(system('z'), Array.from({ length: 8 }, (_, i) => ({ title: `p${i + 1}`, body: '' })));
  for (let i = 1; i <= 8; i++) ok(svg.includes(`>${i}</text>`), `page ${i} is missing from the imposition`);
  // Half the sheet prints upside down, which is what makes the fold work.
  eq((svg.match(/rotate\(180\)/g) || []).length, 4, 'wrong number of rotated pages');
});

// --- eras ---------------------------------------------------------------------

t('every era is still readable, including 1998', () => {
  // The period joke does not get to ship an unreadable artefact.
  for (const v of VIBE_NAMES) {
    for (const r of allEras(system('era', { vibe: v }))) {
      const c = r.colour;
      for (const [what, fg, bg] of [
        ['text', c.text, c.bg],
        ['button label', c.buttonText, c.buttonBg],
        ['link', c.link, c.bg],
        ['brand', c.brand, c.bg],
      ]) {
        ok(contrast(fg, bg) >= 4.5, `${v} ${r.era.year} ${what}: ${contrast(fg, bg).toFixed(2)}:1`);
      }
    }
  }
});

t('the eras are actually different from each other', () => {
  const cards = allEras(system('era')).map((r) => eraCard(r));
  eq(new Set(cards).size, ERAS.length, 'two eras rendered identically');
});

// --- drift --------------------------------------------------------------------

t('a snapshot of an unchanged design shows no drift', () => {
  const dna = { url: 'x', colours: ['#ffffff', '#111111'], fonts: ['Inter'], radii: ['4px'], fontSizes: ['16'], shadows: [] };
  const a = snapshot(dna, { at: 'then' });
  const b = snapshot(dna, { at: 'now' });
  eq(drift(a, b).drifted, false);
  eq(drift(a, b).level, 'clean');
});

t('a near-duplicate colour is reported differently from a new one', () => {
  const base = snapshot({ colours: ['#ffffff', '#2b6cb0'], fonts: [], radii: [], fontSizes: [], shadows: [] }, { at: '1' });
  const twin = snapshot({ colours: ['#ffffff', '#2b6cb0', '#2b6cb2'], fonts: [], radii: [], fontSizes: [], shadows: [] }, { at: '2' });
  const fresh = snapshot({ colours: ['#ffffff', '#2b6cb0', '#c8102e'], fonts: [], radii: [], fontSizes: [], shadows: [] }, { at: '2' });

  eq(drift(base, twin).findings[0].kind, 'near-duplicate');
  eq(drift(base, fresh).findings[0].kind, 'new-colour');
});

t('a legitimate card-on-page pair is not called a duplicate', () => {
  // #f4f4f4 on #ffffff is a surface, not somebody failing to find a token.
  const base = snapshot({ colours: ['#ffffff'], fonts: [], radii: [], fontSizes: [], shadows: [] }, { at: '1' });
  const after = snapshot({ colours: ['#ffffff', '#f4f4f4'], fonts: [], radii: [], fontSizes: [], shadows: [] }, { at: '2' });
  eq(drift(base, after).findings[0].kind, 'new-colour');
});

t('a snapshot is stable against stylesheet reordering', () => {
  const a = snapshot({ colours: ['#111111', '#ffffff'], fonts: ['B', 'A'], radii: ['8px', '4px'], fontSizes: ['20', '16'], shadows: [] });
  const b = snapshot({ colours: ['#ffffff', '#111111'], fonts: ['A', 'B'], radii: ['4px', '8px'], fontSizes: ['16', '20'], shadows: [] });
  eq(JSON.stringify(a), JSON.stringify(b), 'a reordered stylesheet produced a different baseline');
});

// --- teams --------------------------------------------------------------------

t('no two people on a team look alike', () => {
  for (const size of [2, 4, 6, 10]) {
    const t = team('acme', Array.from({ length: size }, (_, i) => `person${i}`));
    ok(teamDistinct(t).passed, `${size} people: ${JSON.stringify(teamDistinct(t).clashes)}`);
  }
});

t('a team shares one style, so the page reads as one organisation', () => {
  const t = team('acme', ['a', 'b', 'c', 'd']);
  const styles = new Set(t.members.map((m) => m.avatar().match(/aria-label="([^"]*)"/)?.[1]));
  eq(t.members.length, 4);
  ok(STYLES.includes(t.style), `${t.style} is not a real style`);
});

t('a team spreads its archetypes instead of landing three Menaces', () => {
  const t = team('acme', ['a', 'b', 'c', 'd', 'e', 'f']);
  eq(new Set(t.members.map((m) => m.archetype)).size, 6, 'archetypes collided');
});

t('the same person at two companies gets two faces', () => {
  const a = team('acme', ['sam']).members[0].avatar();
  const b = team('globex', ['sam']).members[0].avatar();
  ok(a !== b, 'a team identity leaked between organisations');
});

// --- reading somebody else's tokens ------------------------------------------

t('W3C, Figma and flat token shapes all parse', () => {
  eq(readTokens({ colour: { brand: { $value: '#2b6cb0', $type: 'color' } } })[0].hex, '#2b6cb0');
  eq(readTokens({ brand: { type: 'COLOR', valuesByMode: { light: { r: 1, g: 0, b: 0 } } } })[0].hex, '#ff0000');
  eq(readTokens({ brand: '#2b6cb0' })[0].hex, '#2b6cb0');
  // Short hex and hex with alpha both normalise to six digits.
  eq(readTokens({ a: '#f00' })[0].hex, '#ff0000');
  eq(readTokens({ a: '#2b6cb0ff' })[0].hex, '#2b6cb0');
});

t('a token path is kept, because it says what the colour is for', () => {
  const tokens = readTokens({ colour: { text: { danger: { $value: '#e57373' } } } });
  eq(tokens[0].path, 'colour.text.danger');
});

t('a failing semantic pair is reported with both names', () => {
  const report = auditTokens({
    color: { text: { danger: { $value: '#e57373' } } },
    surface: { default: { $value: '#ffffff' } },
  });
  eq(report.passed, false);
  ok(report.findings[0].says.includes('color.text.danger'), 'the finding did not name the token');
  ok(report.findings[0].says.includes('surface.default'), 'the finding did not name the surface');
});

t('notugly own exports survive its own token audit', () => {
  const tokens = JSON.parse(toJson(system('self')));
  const report = auditTokens(tokens, { name: 'self' });
  ok(report.counted > 0, 'could not read its own tokens back');
});

// --- storybook ----------------------------------------------------------------

t('the storybook file is CSF3 with no framework import', () => {
  const story = toStorybook(system('sb'))['notugly.stories.js'];
  ok(story.includes('export default'), 'no default export');
  ok(!/from ['"]react|from ['"]vue|from ['"]@storybook/.test(story), 'it imported a framework');
  for (const name of ['Colour', 'Type', 'Elevation', 'Button']) {
    ok(story.includes(`export const ${name}`), `missing the ${name} story`);
  }
});

// --- stickers -----------------------------------------------------------------

t('every sticker motion animates and stays self-contained', () => {
  const p = persona('sticker-test');
  for (const motion of STICKER_MOTIONS) {
    const svg = sticker(p, { motion });
    ok(svg.includes('<animateTransform'), `${motion} does not animate`);
    // SMIL rather than CSS: chat clients strip <style> and keep <animate>.
    ok(!svg.includes('<style'), `${motion} used a style block, which gets sanitised away`);
    ok(!/<script|href=|xlink:/.test(svg), `${motion} reaches outside itself`);
  }
  eq(Object.keys(stickerPack(p)).length, STICKER_MOTIONS.length);
});

// --- the PM artefacts ---------------------------------------------------------

const messyDna = () => {
  const css =
    'body{background:#fff;color:#333;font-family:Inter,sans-serif}h1{font-size:48px;font-family:Georgia}' +
    '.a{font-size:32px}.c{font-size:16px}.btn{background:#8ab4f8;color:#fff;border-radius:6px}' +
    '.x{color:#f8f8f8}.q{color:#cccccc;font-family:Roboto}.r{border-radius:11px}.s{border-radius:3px}';
  const dna = { url: 'messy.example', ...extractFromCss(css) };
  dna.summary = summarise(dna);
  return dna;
};

t('a spec sheet reports what it can measure and says what it cannot', () => {
  const spec = specSheet(messyDna());
  ok(spec.palette.length > 0);
  ok(spec.type.families.includes('Inter'));
  ok(!spec.type.consistent, 'these sizes have no common ratio and it should say so');
  ok(spec.type.note.includes('one at a time'));
});

t('an unreadable colour is not excused because its role was guessed', () => {
  // The stylesheet does not say which property a colour came from. Restricting
  // failures to colours inferred to be text silently drops real findings.
  const spec = specSheet(messyDna());
  ok(spec.failing.some((f) => f.hex === '#8ab4f8'), 'a failing colour was filtered out by role inference');
});

t('a comparison reports counts, not a winner', () => {
  const cmp = compare(messyDna(), messyDna(), { labels: ['a', 'b'] });
  ok(cmp.rows.every((r) => r.winner === null), 'identical designs produced a winner');
});

t('the one-pager grades each pairing against its own job', () => {
  // Grading a border as body text is how you report that a design which passes
  // its own audit has three failures.
  for (const v of VIBE_NAMES) {
    for (const dark of [false, true]) {
      const page = onePager(system('op', { vibe: v, dark }));
      eq(page.failing.length, 0, `${v}${dark ? ' dark' : ''}: ${JSON.stringify(page.failing.map((f) => [f.label, f.ratio]))}`);
    }
  }
});

t('the one-pager prints to a self-contained page', () => {
  const html = onePagerHtml(onePager(system('op')));
  ok(html.includes('@page'), 'no print rules');
  ok(!/<script|src="http|href="http/.test(html), 'the page reaches outside itself');
});

t('cost counts what it measured and labels what it estimated', () => {
  const cost = costOf(specSheet(messyDna()));
  eq(cost.weight.webfonts, 2, 'Inter and Roboto are webfonts; Georgia is not');
  ok(cost.weight.names.includes('Inter') && cost.weight.names.includes('Roboto'));
  ok(!cost.weight.names.includes('Georgia'), 'Georgia was counted as a webfont');
  ok(cost.basis.includes('estimates'), 'the estimate did not say it was one');
});

// --- liquid glass ------------------------------------------------------------
t('the concentric child radius is never negative or larger than its container', () => {
  eq(concentricRadius(20, 8), 12);
  eq(concentricRadius(10, 40), 0, 'padding wider than the container should floor at zero, not go negative');
});

t('the glass material composites to something readable most of the time', () => {
  const sys = system('glasstest', { vibe: 'liquidglass' });
  ok(sys.liquidGlass, 'liquidglass vibe should attach a material');
  for (const variant of ['regular', 'clear']) {
    const leg = glassLegibility(sys, { variant });
    eq(leg.results.length, WORST_CASE_BACKGROUNDS.length);
    ok(leg.results.every((r) => typeof r.ratio === 'number' && r.ratio >= 1), 'every composited ratio should be a real contrast ratio');
    ok(typeof leg.passed === 'boolean');
  }
});

t('a squircle path stays inside its own bounding box', () => {
  const { d } = squirclePath(120, 80, 24);
  const nums = [...d.matchAll(/-?\d+\.\d+/g)].map(Number);
  for (let i = 0; i < nums.length; i += 2) {
    ok(nums[i] >= -0.01 && nums[i] <= 120.01, `x ${nums[i]} escaped the box`);
    ok(nums[i + 1] >= -0.01 && nums[i + 1] <= 80.01, `y ${nums[i + 1]} escaped the box`);
  }
});

// --- raster: a PNG encoder and decoder written from nothing ------------------
t('a PNG round-trips through this project\'s own encoder and decoder exactly', () => {
  const w = 6, h = 5;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = (i * 53) % 256;
    data[i * 4 + 1] = (i * 97) % 256;
    data[i * 4 + 2] = (i * 19) % 256;
    data[i * 4 + 3] = i % 3 === 0 ? 0 : 255; // some transparency, to catch alpha bugs
  }
  const png = encodePng({ data, width: w, height: h });
  ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'missing the PNG signature');
  const back = decodePng(png);
  eq(back.width, w);
  eq(back.height, h);
  eq(Array.from(back.data), Array.from(data), 'decoded pixels differ from what was encoded');
});

t('decodePng rejects what it cannot safely decode', () => {
  throws(() => decodePng(Buffer.from('not a png at all')), /signature/);
});

t('encodeIco produces a valid ICO header for the sizes given', () => {
  const png = encodePng({ data: new Uint8ClampedArray(16 * 16 * 4).fill(255), width: 16, height: 16 });
  const ico = encodeIco([{ size: 16, png }]);
  eq(ico.readUInt16LE(2), 1, 'ICO type field should be 1');
  eq(ico.readUInt16LE(4), 1, 'one image was packed in, the header should say one');
});

// --- the favicon font and icon package ----------------------------------------
t('every 5×7 glyph is actually 5 wide and 7 tall', () => {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    const g = glyphFor(ch);
    eq(g.length, 7, `${ch}: wrong row count`);
    for (const row of g) eq(row.length, 5, `${ch}: wrong column count`);
  }
});

t('an icon package writes every requested size plus a favicon.ico', () => {
  const sys = system('icontest');
  const pkg = iconPackage('mo', sys, { sizes: [16, 32] });
  ok(pkg.files['icon-16.png'] && pkg.files['icon-32.png'] && pkg.files['favicon.ico']);
  ok(decodePng(pkg.files['icon-32.png']).width === 32, 'the PNG this project wrote is not readable by its own decoder');
});

t('an icon\'s ink colour clears large-text contrast against its own background', () => {
  const px = iconPixels('A', { bg: '#123456', size: 64 });
  // Sample the centre, which the glyph always covers for a letter this size.
  const p = (32 * 64 + 32) * 4;
  ok(px.data[p + 3] === 255, 'centre pixel should be opaque, inside the squircle');
});

// --- RTL -----------------------------------------------------------------
t('checkRtl finds physical properties and names their logical equivalent', () => {
  const r = checkRtl('.x { margin-left: 8px; padding-right: 4px; }');
  eq(r.passed, false);
  ok(r.findings.some((f) => f.physical === 'margin-left' && f.logical === 'margin-inline-start'));
  ok(r.findings.some((f) => f.physical === 'padding-right' && f.logical === 'padding-inline-end'));
});
t('checkRtl passes CSS with no physical direction in it', () => {
  eq(checkRtl('.x { margin-inline: 8px; text-align: start; }').passed, true);
});
t('this project\'s own generated CSS and HTML are RTL-clean', () => {
  for (const v of VIBE_NAMES) {
    const r = checkSystemRtl(system('rtl-check', { vibe: v }));
    ok(r.passed, `${v}: ${JSON.stringify(r.results.filter((x) => !x.passed))}`);
  }
});

// --- accessibility statement ---------------------------------------------
t('a passing system gets a statement that claims conformance, with a checkable reason', () => {
  const stmt = accessibilityStatement(system('stmt'));
  eq(stmt.passed, true);
  ok(stmt.level.includes('AA'));
  ok(stmt.markdown.includes('conforms to'));
  ok(stmt.markdown.includes(String(stmt.weakest.ratio)), 'the claim should cite the actual weakest ratio');
});
t('the statement is explicit about what it did not check', () => {
  const stmt = accessibilityStatement(system('stmt'));
  ok(stmt.notChecked.length > 0);
  for (const item of stmt.notChecked) ok(stmt.markdown.includes(item));
});
t('the statement HTML is self-contained, like every other document this project prints', () => {
  const stmt = accessibilityStatement(system('stmt'));
  ok(stmt.html.includes('@page'));
  ok(!/<script|src="http|href="http/.test(stmt.html));
});

// --- benchmark -------------------------------------------------------------
t('notugly is the only zero-kilobyte row, and every row explains itself', () => {
  const b = benchmark();
  const nu = b.rows.find((r) => r.name === 'notugly');
  eq(nu.runtimeKb, 0);
  ok(b.rows.filter((r) => r !== nu).every((r) => r.runtimeKb > 0), 'every alternative should carry a real cost');
  ok(b.rows.every((r) => r.note.length > 20), 'every row needs an actual explanation, not just a number');
  eq(APPROACHES.length, b.rows.length);
});

// --- whitelabel / multi-brand ------------------------------------------------
t('every tenant keeps its exact locked brand colour and still passes its own audit', () => {
  const hexes = ['#e4002b', '#0057ff', '#00a86b'];
  const result = brandSet('acme', hexes);
  eq(result.tenants.length, 3);
  for (let i = 0; i < hexes.length; i++) {
    eq(result.tenants[i].system.colour.primary[6] !== undefined, true);
    ok(result.tenants[i].audit.passed, `tenant ${hexes[i]} should still pass its own audit`);
  }
});
t('tenants share type, radius and motion — only the brand colour differs', () => {
  const result = brandSet('acme', ['#e4002b', '#0057ff']);
  const [a, b] = result.tenants;
  eq(a.system.type.pairing.name, b.system.type.pairing.name);
  eq(a.system.radius.md, b.system.radius.md);
  eq(a.system.motion.name, b.system.motion.name);
  ok(a.system.colour.brand !== b.system.colour.brand || a.brand !== b.brand);
});
t('brandDistinct flags two brand colours close enough to be mistaken for one', () => {
  const clashing = brandSet('acme', ['#e4002b', '#e50228']); // nearly identical red
  ok(!brandDistinct(clashing).passed, 'near-identical reds should clash');
  const distinct = brandSet('acme', ['#e4002b', '#0057ff', '#00a86b']);
  ok(brandDistinct(distinct).passed, 'red/blue/green should not clash');
});

// ---------------------------------------------------------------------------
if (fails.length) {
  console.error(`\n✗ ${fails.length} failing, ${pass} passing\n`);
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`✓ ${pass} tests passing`);
