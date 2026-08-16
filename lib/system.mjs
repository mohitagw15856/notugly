// The whole design system, assembled from one seed and one vibe.
//
// This is the object everything else consumes: the site renders it, the
// exporters serialise it, and the accessibility report grades it. Building it
// in one place is what stops the CSS export and the React export disagreeing.

import { chance } from './seed.mjs';
import { ramp, accessibleOn, contrast, rate, oklchToHex, toDisplayable, hexToOklch, isLight, AA_TEXT } from './color.mjs';
import { vibe as getVibe } from './vibe.mjs';
import { typeSystem } from './type.mjs';
import { shadow } from './shadow.mjs';
import { motion } from './motion.mjs';
import { pattern } from './pattern.mjs';
import { gradient } from './gradient.mjs';

// Hue starting points that are pleasant and distinct. Fully random hues land on
// mustard and mauve more often than anyone wants.
const SEED_HUES = [258, 212, 168, 142, 22, 348, 292, 42];

export function system(seed = 'notugly', { vibe = 'editorial', dark = false } = {}) {
  const v = getVibe(vibe);
  const c = chance(`sys:${seed}:${vibe}`);

  const hue = c.pick(SEED_HUES) + c.float(-14, 14);
  const accentHue = (hue + c.pick([150, 180, 210, -40])) % 360;

  const chroma = 0.15 * v.chroma;
  const primaryBase = oklchToHex(toDisplayable([0.55, chroma, hue]));
  const accentBase = oklchToHex(toDisplayable([0.62, chroma * 0.95, accentHue]));

  const primary = ramp(primaryBase, { hueShift: 12 });
  const accent = ramp(accentBase, { hueShift: -8 });
  // Neutrals carry a trace of the primary hue. Pure grey next to a coloured
  // brand always looks slightly dead.
  const neutral = ramp(oklchToHex(toDisplayable([0.5, 0.012 + v.surfaceTint * 0.1, hue])), { hueShift: 4 });

  // Surfaces, then text picked to clear WCAG against them. Not the other way
  // round — that is how you end up with a palette that needs an exception.
  const bg = dark ? neutral[11] : '#ffffff';
  const surface = dark ? neutral[10] : neutral[0];
  const surfaceAlt = dark ? neutral[9] : neutral[1];

  const text = accessibleOn(bg, dark ? [neutral[0], '#ffffff'] : [neutral[11], '#000000'], AA_TEXT);
  const textMuted = accessibleOn(bg, dark ? [neutral[3]] : [neutral[8]], 4.5);
  const brand = accessibleOn(bg, dark ? [primary[3], primary[2]] : [primary[8], primary[9]], AA_TEXT);
  const accentText = accessibleOn(bg, dark ? [accent[3]] : [accent[8]], AA_TEXT);

  // A filled button: pick the surface first, then the label that survives on it.
  const buttonBg = dark ? primary[4] : primary[7];
  const buttonText = accessibleOn(buttonBg, ['#ffffff', '#000000', neutral[0], neutral[11]], AA_TEXT);

  const border = dark ? neutral[8] : neutral[2];
  const focus = accessibleOn(bg, [accent[dark ? 3 : 7], primary[dark ? 3 : 7]], 3);

  const type = typeSystem({ ratio: v.ratio, pairing: v.pairing });
  const sh = shadow(v.shadow, { hue, dark });
  const mo = motion(v.motion);
  const pat = pattern(v.pattern, { colour: text, opacity: dark ? 0.05 : 0.045, seed });
  const grad = gradient(seed, { base: primaryBase, dark });

  const radius = {
    none: 0,
    sm: Math.round(v.radius * 0.4),
    md: v.radius,
    lg: Math.round(v.radius * 1.6),
    full: 999,
  };

  // A 4px-based spacing scale. Everything lands on the same grid, which is
  // most of what "tidy" means in a layout.
  const space = Object.fromEntries([0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((n) => [n, `${n * 4}px`]));

  return {
    seed: String(seed),
    vibe,
    vibeLabel: v.label,
    blurb: v.blurb,
    dark,
    hue: Math.round(hue),
    colour: {
      bg,
      surface,
      surfaceAlt,
      text,
      textMuted,
      brand,
      accent: accentText,
      buttonBg,
      buttonText,
      border,
      focus,
      primary,
      accentRamp: accent,
      neutral,
    },
    type,
    radius,
    space,
    shadow: sh,
    motion: mo,
    pattern: pat,
    gradient: grad,
    glass: Boolean(v.glass),
    borderWeight: v.borderWeight,
  };
}

// Every pairing this system actually asks a person to read, graded. This is
// what makes "provably not ugly" a claim rather than a slogan.
export function audit(sys) {
  const c = sys.colour;
  const pairs = [
    ['body text on background', c.text, c.bg, AA_TEXT],
    ['muted text on background', c.textMuted, c.bg, AA_TEXT],
    ['body text on surface', c.text, c.surface, AA_TEXT],
    ['brand text on background', c.brand, c.bg, AA_TEXT],
    ['accent text on background', c.accent, c.bg, AA_TEXT],
    ['button label on button', c.buttonText, c.buttonBg, AA_TEXT],
    ['focus ring on background', c.focus, c.bg, 3],
    ['border on background', c.border, c.bg, 1.4],
  ];

  const results = pairs.map(([name, fg, bg, target]) => {
    const ratio = +contrast(fg, bg).toFixed(2);
    // Grade against what this pairing is actually for. A 1.8 border passes its
    // own bar; calling it "fail" because it is not readable body text is the
    // kind of misleading report that teaches people to ignore reports.
    const grade = target >= AA_TEXT ? rate(ratio) : ratio >= target ? 'pass' : 'fail';
    return { name, fg, bg, ratio, target, grade, pass: ratio >= target };
  });

  const failed = results.filter((r) => !r.pass);
  return {
    results,
    passed: failed.length === 0,
    failed,
    // The headline number: the weakest thing a reader is actually asked to
    // *read*, so decorative pairings do not drag the score down.
    weakest: results.filter((r) => r.target >= AA_TEXT).reduce((a, b) => (a.ratio < b.ratio ? a : b)),
    // How much headroom the whole system has over its own requirements.
    margin: +Math.min(...results.map((r) => r.ratio / r.target)).toFixed(2),
  };
}
