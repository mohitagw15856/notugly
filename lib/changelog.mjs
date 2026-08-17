// A changelog for one seed, across two versions of this library.
//
// `drift.mjs` answers "what changed on this website since last time" from a
// scraped, approximate snapshot. This answers the adjacent question a
// maintainer of notugly itself actually has: "I just changed something in
// lib/ — does seed 'acme' still render the same design?" Both sides here are
// exact `system()` objects, not an approximation reconstructed from CSS, so
// the diff can be precise down to a single ramp step.

/**
 * Reduce a full `system()` object to the fields that define what a seed
 * *looks like* — every colour, plus the structural decisions (radius,
 * motion, type pairing) that come from the same seed and vibe. Kept as an
 * explicit shape rather than diffing the whole object so an unrelated field
 * (like the live-computed `liquidGlass.legibility` sweep, which depends on a
 * fixed constant list that isn't itself part of the design) doesn't produce
 * noise in a report about whether the design changed.
 */
function fingerprint(sys) {
  const c = sys.colour;
  return {
    colour: {
      bg: c.bg,
      surface: c.surface,
      surfaceAlt: c.surfaceAlt,
      text: c.text,
      textMuted: c.textMuted,
      brand: c.brand,
      accent: c.accent,
      buttonBg: c.buttonBg,
      buttonText: c.buttonText,
      border: c.border,
      focus: c.focus,
      primary: c.primary,
      accentRamp: c.accentRamp,
      neutral: c.neutral,
    },
    type: { pairing: sys.type.pairing.name, ratio: sys.type.ratio, scalePx: sys.type.scale.map((s) => s.px) },
    radius: sys.radius,
    motion: sys.motion.name,
    shadowLevel: sys.shadow.level,
    patternName: sys.pattern.name,
  };
}

function walk(before, after, path, out) {
  if (Array.isArray(before)) {
    const len = Math.max(before.length, after?.length ?? 0);
    for (let i = 0; i < len; i++) walk(before[i], after?.[i], `${path}[${i}]`, out);
    return;
  }
  if (before && typeof before === 'object') {
    for (const k of Object.keys(before)) walk(before[k], after?.[k], path ? `${path}.${k}` : k, out);
    return;
  }
  if (before !== after) out.push({ path, before, after });
}

/** Diff two `system()` results for the same seed — typically one loaded
 * from a different git ref, one from the working tree. */
export function seedChangelog(before, after) {
  const changes = [];
  walk(fingerprint(before), fingerprint(after), '', changes);
  return {
    changed: changes.length > 0,
    changes,
    summary:
      changes.length === 0
        ? 'Identical output. This seed renders exactly the same design.'
        : `${changes.length} field${changes.length === 1 ? '' : 's'} changed.`,
  };
}
