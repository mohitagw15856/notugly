// Reading somebody else's design system in, rather than writing ours out.
//
// notugly has always been able to produce Figma variables and W3C tokens. The
// reverse — take the file a design team already has and tell them what is wrong
// with it — is the more useful direction and the one nobody offers, because it
// requires actually computing things rather than restyling them.
//
// Accepts three shapes, all of which are just JSON:
//   · a W3C design-token file ($value / $type)
//   · a Figma "export variables" JSON dump
//   · a flat { name: "#hex" } object, which is what most teams actually have

import { contrast, hexToOklch, AA_TEXT } from './color.mjs';
import { specSheet, onePager } from './spec.mjs';
import { checkVision } from './vision.mjs';
import { nameAll } from './names.mjs';
import { system } from './system.mjs';
import { toCss } from './export.mjs';
import { VIBE_NAMES } from './vibe.mjs';

const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v.trim());

const expand = (hex) => {
  const h = hex.trim().toLowerCase();
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  if (h.length === 9) return h.slice(0, 7); // drop the alpha; contrast maths needs opaque
  return h.slice(0, 7);
};

// Figma stores colours as 0–1 floats, which is the thing that catches everyone
// out in both directions.
const fromFigmaRgb = (o) => {
  if (typeof o?.r !== 'number') return null;
  const to = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${to(o.r)}${to(o.g)}${to(o.b)}`;
};

/**
 * Walk any of the accepted shapes and pull out every colour with its path.
 * The path matters — "colour/semantic/danger" tells you what a token is *for*,
 * which is the difference between a useful report and a list of hexes.
 */
export function readTokens(json, { path = [], out = [] } = {}) {
  if (!json || typeof json !== 'object') return out;

  // W3C design token
  if (isHex(json.$value)) {
    out.push({ path: path.join('.'), hex: expand(json.$value), type: json.$type ?? 'color' });
    return out;
  }
  // Figma variable
  if (json.type === 'COLOR' && json.valuesByMode) {
    for (const [mode, v] of Object.entries(json.valuesByMode)) {
      const hex = isHex(v) ? expand(v) : fromFigmaRgb(v);
      if (hex) out.push({ path: [...path, mode].join('.'), hex, type: 'color', mode });
    }
    return out;
  }
  const direct = fromFigmaRgb(json);
  if (direct) {
    out.push({ path: path.join('.'), hex: direct, type: 'color' });
    return out;
  }

  for (const [k, v] of Object.entries(json)) {
    if (k.startsWith('$') && k !== '$value') continue;
    if (isHex(v)) out.push({ path: [...path, k].join('.'), hex: expand(v), type: 'color' });
    else if (v && typeof v === 'object') readTokens(v, { path: [...path, k], out });
  }
  return out;
}

/**
 * Audit somebody else's tokens.
 *
 * The finding people care about most is the one a token file makes possible and
 * a screenshot does not: *semantic* pairs that fail. If `text.danger` cannot be
 * read on `surface.default`, that is a bug with a name and an owner, not a
 * vague note about contrast.
 */
export function auditTokens(json, { name = 'design tokens' } = {}) {
  const tokens = readTokens(json);
  if (!tokens.length) return { name, tokens: [], findings: [{ level: 'error', says: 'No colours found. Is this a token file?' }], passed: false };

  const named = nameAll(tokens.map((t) => t.hex));
  const withNames = tokens.map((t, i) => ({ ...t, name: named[i].name }));

  // Guess the page background: a token whose path says so, else the lightest.
  const bgToken =
    withNames.find((t) => /\b(bg|background|surface|canvas|base)\b/i.test(t.path)) ??
    withNames.reduce((a, b) => (hexToOklch(a.hex)[0] > hexToOklch(b.hex)[0] ? a : b));

  const textish = withNames.filter((t) => /\b(text|fg|foreground|content|label|ink|copy|heading|body)\b/i.test(t.path));
  const surfaces = withNames.filter((t) => /\b(bg|background|surface|canvas|base|fill)\b/i.test(t.path));

  const findings = [];

  // Every text token against every surface token. This is the check a token
  // file uniquely enables and it is where the real bugs are.
  const pairs = [];
  for (const t of textish.length ? textish : withNames) {
    for (const s of surfaces.length ? surfaces : [bgToken]) {
      if (t.hex === s.hex) continue;
      const ratio = +contrast(t.hex, s.hex).toFixed(2);
      pairs.push({ text: t, surface: s, ratio, pass: ratio >= AA_TEXT });
    }
  }
  const failing = pairs.filter((p) => !p.pass);
  for (const f of failing.slice(0, 12)) {
    findings.push({
      level: 'error',
      says: `${f.text.path} on ${f.surface.path} is ${f.ratio}:1 — needs 4.5.`,
      detail: { fg: f.text.hex, bg: f.surface.hex },
    });
  }

  // Duplicate values under different names: the sign of a system that grew by
  // copy-paste. Two names for one colour means two things to change later.
  const byHex = new Map();
  for (const t of withNames) {
    const list = byHex.get(t.hex) ?? [];
    list.push(t.path);
    byHex.set(t.hex, list);
  }
  for (const [hex, paths] of byHex) {
    if (paths.length > 2) {
      findings.push({
        level: 'warn',
        says: `${hex} is defined ${paths.length} times: ${paths.slice(0, 4).join(', ')}${paths.length > 4 ? '…' : ''}.`,
        detail: { hex, paths },
      });
    }
  }

  const merges = checkVision(Object.fromEntries(withNames.slice(0, 12).map((t, i) => [`t${i}`, t.hex])));
  for (const col of merges.collisions) {
    findings.push({
      level: 'warn',
      says: `Two tokens merge under ${col.kind} (${col.prevalence}): ${col.pair.join(' and ')}.`,
      detail: col,
    });
  }

  return {
    name,
    tokens: withNames,
    counted: withNames.length,
    greys: withNames.filter((t) => hexToOklch(t.hex)[1] < 0.03).length,
    pairsChecked: pairs.length,
    failing,
    findings,
    passed: failing.length === 0,
    summary:
      failing.length === 0
        ? `${withNames.length} colours, ${pairs.length} text/surface pairs, all clearing AA.`
        : `${failing.length} of ${pairs.length} text/surface pairs fail AA.`,
  };
}

// --- Storybook ----------------------------------------------------------------

/**
 * A Storybook story file for the generated system.
 *
 * Storybook is where a component library is reviewed, so a design system that
 * cannot be seen there is a design system nobody signs off. This writes plain
 * CSF3 with no framework imports, so it drops into any Storybook setup.
 */
export function toStorybook(sys) {
  const c = sys.colour;
  const swatches = [
    ['bg', c.bg], ['surface', c.surface], ['text', c.text], ['text muted', c.textMuted],
    ['brand', c.brand], ['accent', c.accent], ['button', c.buttonBg], ['border', c.border],
  ];
  const named = nameAll(swatches.map((s) => s[1]));

  const story = `// Generated by notugly — seed "${sys.seed}", ${sys.vibeLabel}.
// Plain CSF3 with no framework import, so it works in any Storybook.

import './notugly.css';

export default {
  title: 'notugly/${sys.seed}',
  parameters: {
    backgrounds: { default: 'system', values: [{ name: 'system', value: '${c.bg}' }] },
  },
};

const wrap = (inner) =>
  \`<div style="background:${c.bg};color:${c.text};font-family:${sys.type.body.replace(/"/g, "'")};padding:32px">\${inner}</div>\`;

export const Colour = {
  render: () =>
    wrap(\`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">
      ${swatches
        .map(
          ([label, hex], i) =>
            `<div style="border:1px solid ${c.border};border-radius:${sys.radius.md}px;overflow:hidden">
              <div style="background:${hex};height:56px"></div>
              <div style="padding:8px;font:12px ui-monospace,monospace">
                <b>${label}</b><br>${named[i].name}<br>${hex}
              </div>
            </div>`
        )
        .join('')}
    </div>\`),
};

export const Type = {
  render: () =>
    wrap(\`${sys.type.scale
      .slice()
      .reverse()
      .map(
        (s) =>
          `<p style="margin:0 0 8px;font-size:${s.px}px;line-height:${s.lineHeight};letter-spacing:${s.letterSpacing}em;font-family:${(s.px > 24 ? sys.type.heading : sys.type.body).replace(/"/g, "'")}">${s.name} — The quick brown fox</p>`
      )
      .join('')}\`),
};

export const Elevation = {
  render: () =>
    wrap(\`<div style="display:flex;gap:24px;flex-wrap:wrap">
      ${sys.elevationLevels
        .map(
          (lv) =>
            `<div style="width:110px;height:110px;border-radius:${sys.radius.md}px;background:${sys.elevationSurface[lv]};box-shadow:${sys.elevation[lv].layers.join(', ')};display:grid;place-items:center;font:11px ui-monospace,monospace">${lv}</div>`
        )
        .join('')}
    </div>\`),
};

export const Button = {
  render: () =>
    wrap(\`<button style="background:${c.buttonBg};color:${c.buttonText};border:0;border-radius:${sys.radius.md}px;padding:12px 22px;font-size:15px;font-weight:600;cursor:pointer">Button</button>\`),
};
`;

  return { 'notugly.stories.js': story };
}

/**
 * A live vibe switcher for Storybook — not another static story, but a
 * toolbar control that recolours every story on the page while you're
 * looking at it. Storybook's own `globalTypes` + `decorators` mechanism
 * already does exactly this for a theme toggle; this just generates the
 * `:root` variable block for every vibe up front (there is no server here
 * to compute one on request) and swaps a single `<style>` tag between them.
 */
export function toStorybookAddon(seed = 'notugly', { dark = false } = {}) {
  // Every vibe's :root block, extracted from the same toCss() the export
  // command writes — so flipping the toolbar shows exactly what `notugly
  // export --vibe X` would have produced, not an approximation of it.
  const cssByVibe = Object.fromEntries(
    VIBE_NAMES.map((v) => {
      const css = toCss(system(seed, { vibe: v, dark }));
      const root = css.match(/:root \{[\s\S]*?\n\}/);
      return [v, root ? root[0] : css];
    })
  );

  const preview = `// Generated by notugly — a live vibe switcher for seed "${seed}".
// Merge globalTypes/decorators below into .storybook/preview.js, or drop
// this whole file in if the project doesn't have one yet.

export const globalTypes = {
  notuglyVibe: {
    name: 'notugly vibe',
    description: 'Switch the design system every story is rendered with',
    defaultValue: '${VIBE_NAMES[0]}',
    toolbar: {
      icon: 'paintbrush',
      items: ${JSON.stringify(VIBE_NAMES)},
      showName: true,
    },
  },
};

// One :root block per vibe, precomputed — there's no server here to build
// one on request, so every option the toolbar can select already exists.
const CSS_BY_VIBE = ${JSON.stringify(cssByVibe, null, 2)};

export const decorators = [
  (Story, context) => {
    const vibe = context.globals.notuglyVibe || '${VIBE_NAMES[0]}';
    let tag = document.getElementById('notugly-vibe-vars');
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'notugly-vibe-vars';
      document.head.appendChild(tag);
    }
    tag.textContent = CSS_BY_VIBE[vibe] || CSS_BY_VIBE['${VIBE_NAMES[0]}'];
    return Story();
  },
];
`;

  const readme = `# notugly Storybook addon

A toolbar control that switches every story between notugly's vibes live —
not a separate story to click into, the same components re-rendering under
a different system while you're looking at them.

## Install

Copy \`preview.js\`'s \`globalTypes\` and \`decorators\` exports into your
project's \`.storybook/preview.js\` (merge with what's already there — don't
overwrite an existing \`decorators\` array, append to it). If the project has
no \`.storybook/preview.js\` yet, this file already is one.

Regenerate with a different seed: \`notugly storybook <seed> --out .storybook\`.
`;

  return { 'preview.js': preview, 'ADDON.md': readme };
}
