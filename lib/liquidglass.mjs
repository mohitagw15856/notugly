// Apple's Liquid Glass (WWDC 2025): a material that is translucent, refracts
// whatever sits behind it, and adapts its tint at runtime to that content.
// Handsome — and exactly the property this whole project doesn't trust,
// because it's the one place "readable" stops being a fact you can check at
// build time and becomes a fact about whatever the user happens to have
// scrolled underneath. So this treats it for what it physically is — alpha
// blending against a background you do not control — and grades the pairing
// against the worst plausible thing it could be sitting on, not the one
// thing it was demoed over.
//
// Two materials ship in Apple's system: Regular (more opaque, for
// content-dense chrome like tab bars) and Clear (more transparent, meant to
// sit over media). Both are modelled here as an alpha over a tint, because
// that is what `backdrop-filter` and `UIVisualEffectView` both actually do.

import { hexToOklch, oklchToHex, toDisplayable, contrast, hexToRgb, rgbToHex, AA_TEXT } from './color.mjs';

export const VARIANTS = ['regular', 'clear'];

// Alpha/blur figures approximate Apple's published Regular/Clear materials —
// Regular reads as glass over an interface, Clear reads as glass over a photo.
const VARIANT_SPEC = {
  regular: { alpha: 0.72, blur: 20, saturate: 1.6, elevation: 0.09 },
  clear: { alpha: 0.42, blur: 34, saturate: 1.9, elevation: 0.14 },
};

// What a compositor actually does, frame by frame, as content scrolls under
// a translucent layer: linear blend of the material colour over whatever's
// behind it, weighted by the material's alpha.
function compositeOver(materialHex, alpha, bgHex) {
  const [mr, mg, mb] = hexToRgb(materialHex);
  const [br, bg, bb] = hexToRgb(bgHex);
  return rgbToHex([mr * alpha + br * (1 - alpha), mg * alpha + bg * (1 - alpha), mb * alpha + bb * (1 - alpha)]);
}

/**
 * The material itself: a CSS recipe standing in for the real-time renderer.
 * `sys` is a built design system (needs `.colour` and `.dark`).
 */
export function glassMaterial(sys, { variant = 'regular' } = {}) {
  const spec = VARIANT_SPEC[variant] || VARIANT_SPEC.regular;
  const c = sys.colour;

  // Adaptive tint: a whisper of the surface colour, not the surface itself —
  // "adaptive" means barely-there. Too much tint and it stops reading as
  // glass and starts reading as a card with low opacity.
  const [, C, h] = hexToOklch(c.surface);
  const tint = oklchToHex(toDisplayable([sys.dark ? 0.22 : 0.94, C * 0.6, h]));

  // A static stand-in for the specular pass Apple computes from device tilt
  // every frame: a soft diagonal sheen, brighter at the top edge.
  const specular = `linear-gradient(135deg, rgba(255,255,255,${sys.dark ? 0.14 : 0.5}) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 68%, rgba(255,255,255,${sys.dark ? 0.06 : 0.22}) 100%)`;

  const css = [
    `background-color: ${tint};`,
    `background-image: ${specular};`,
    `backdrop-filter: blur(${spec.blur}px) saturate(${spec.saturate});`,
    `-webkit-backdrop-filter: blur(${spec.blur}px) saturate(${spec.saturate});`,
    `border: 1px solid rgba(255,255,255,${sys.dark ? 0.14 : 0.55});`,
    `box-shadow: inset 0 1px 1px rgba(255,255,255,${sys.dark ? 0.2 : 0.6}), 0 ${(spec.elevation * 100).toFixed(0)}px ${(spec.elevation * 180).toFixed(0)}px rgba(0,0,0,${spec.elevation});`,
  ].join('\n  ');

  return { variant, tint, alpha: spec.alpha, blur: spec.blur, saturate: spec.saturate, css };
}

// A spread of plausible things a piece of glass chrome could be floating
// over: extremes, and the saturated system colours Apple's own apps use for
// alerts and controls — the exact colours a photo, video, or another app's
// UI is likely to put directly under a tab bar.
export const WORST_CASE_BACKGROUNDS = ['#ffffff', '#000000', '#ff3b30', '#34c759', '#0a84ff', '#ffd60a', '#8e8e93'];

/**
 * The actual risk in translucent UI: text on it is contrast-checked against
 * one background during design, then ships somewhere that composites over
 * everything the user has open. This checks all of them and reports the
 * worst, which is the only honest number for a material that moves.
 */
export function glassLegibility(sys, { variant = 'regular', target = AA_TEXT } = {}) {
  const mat = glassMaterial(sys, { variant });
  const fg = sys.colour.text;

  const results = WORST_CASE_BACKGROUNDS.map((bg) => {
    const composited = compositeOver(mat.tint, mat.alpha, bg);
    const ratio = +contrast(fg, composited).toFixed(2);
    return { behind: bg, composited, ratio, pass: ratio >= target };
  });

  const worst = results.reduce((a, b) => (a.ratio < b.ratio ? a : b));
  const failing = results.filter((r) => !r.pass);

  return {
    variant,
    target,
    results,
    worst,
    passed: failing.length === 0,
    note: failing.length === 0
      ? `Text stays above ${target}:1 against every background tested, from white to black to saturated system colours.`
      : `Fails against ${failing.length} of ${results.length} plausible backgrounds — worst is ${worst.ratio}:1 behind ${worst.behind}. This is the risk translucent chrome always carries: tested once, shipped over everything.`,
  };
}

/**
 * Nested glass containers are meant to share a centre — the corner curve of
 * a button inside a toolbar should match the toolbar's own curve minus the
 * padding between them. A fixed radius nested inside another fixed radius is
 * the single most common thing that makes a glass UI look assembled rather
 * than machined: the corners visibly don't line up.
 */
export function concentricRadius(containerRadius, padding) {
  return Math.max(0, containerRadius - padding);
}

/**
 * A continuous "squircle" corner — iOS app icons and, now, Liquid Glass
 * containers use a superellipse rather than a circular arc, which reads as
 * noticeably softer at the same nominal radius. Built the same way `blob()`
 * builds an organic shape: as a dense polyline around the true curve rather
 * than an approximating cubic, so what you get is the actual geometry.
 */
export function squirclePath(width, height, radius, { n = 5, corner = 20 } = {}) {
  const rx = Math.min(radius, width / 2);
  const ry = Math.min(radius, height / 2);

  // One quarter-superellipse, sampled `corner` times, oriented for a given
  // corner of the rect via the sx/sy sign flips.
  const arc = (cx, cy, sx, sy) =>
    Array.from({ length: corner + 1 }, (_, i) => {
      const t = (i / corner) * (Math.PI / 2);
      const x = cx + sx * rx * Math.cos(t) ** (2 / n);
      const y = cy + sy * ry * Math.sin(t) ** (2 / n);
      return [x, y];
    });

  const tl = arc(rx, ry, -1, -1).reverse();
  const tr = arc(width - rx, ry, 1, -1);
  const br = arc(width - rx, height - ry, 1, 1).reverse();
  const bl = arc(rx, height - ry, -1, 1);

  const points = [...tl, ...tr, ...br, ...bl];
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z';

  return {
    d,
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${d}" fill="currentColor"/></svg>`,
    clipPath: `clip-path: path('${d}');`,
  };
}

/**
 * A SwiftUI snippet using the real API — `.glassEffect()` — with this
 * system's colours dropped in, so the CSS recipe above and what actually
 * ships on-device are visibly the same material.
 */
export function swiftGlassSnippet(sys, { variant = 'regular' } = {}) {
  const mat = glassMaterial(sys, { variant });
  const hexToSwift = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)})`;
  };

  return `// notugly — ${sys.seed} · ${variant === 'clear' ? 'Clear' : 'Regular'} glass
// The tint below is what the material adapts *from* — Apple's renderer takes
// it from there, this only fixes the starting point.
import SwiftUI

struct NotuglyGlassCard<Content: View>: View {
  @ViewBuilder var content: Content

  var body: some View {
    content
      .padding()
      .glassEffect(
        .${variant}.tint(${hexToSwift(mat.tint)}),
        in: .rect(cornerRadius: ${sys.radius.lg})
      )
  }
}
`;
}
