// The places a design system has to end up besides the web: the design tool,
// the editor, and — because most teams building a design system today are
// also building a mobile app — the two mobile platforms and their two
// cross-platform escape hatches.

import { system } from './system.mjs';

const esc = (s) => JSON.stringify(String(s));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

// The token set every non-web export shares — the same eleven roles
// `toCss` puts in `:root`, so a colour never drifts between platforms.
const CORE_KEYS = ['bg', 'surface', 'surfaceAlt', 'text', 'textMuted', 'brand', 'accent', 'buttonBg', 'buttonText', 'border', 'focus'];

// --- Figma --------------------------------------------------------------------

// Figma's plugin API wants RGB in 0–1 floats, not hex, which catches everyone
// out exactly once.
const figRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: +(((n >> 16) & 255) / 255).toFixed(4), g: +(((n >> 8) & 255) / 255).toFixed(4), b: +((n & 255) / 255).toFixed(4) };
};

/**
 * A complete Figma plugin. Not a token file you then have to find an importer
 * for — the actual manifest and code, ready to load as a development plugin.
 */
export function toFigma(sys) {
  const c = sys.colour;
  const flat = [
    ['bg', c.bg], ['surface', c.surface], ['surface-alt', c.surfaceAlt],
    ['text', c.text], ['text-muted', c.textMuted], ['brand', c.brand],
    ['accent', c.accent], ['button-bg', c.buttonBg], ['button-text', c.buttonText],
    ['border', c.border], ['focus', c.focus],
    ...c.primary.map((h, i) => [`primary-${i * 100 || 50}`, h]),
    ...c.neutral.map((h, i) => [`neutral-${i * 100 || 50}`, h]),
  ];

  const manifest = JSON.stringify(
    {
      name: `notugly — ${sys.seed}`,
      id: `notugly-${sys.seed}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
      api: '1.0.0',
      main: 'code.js',
      editorType: ['figma'],
      documentAccess: 'dynamic-page',
    },
    null,
    2
  );

  const code = `// notugly — ${sys.seed} / ${sys.vibe}
// Load as a development plugin: Plugins → Development → Import plugin from manifest.
// Running it creates one variable collection with every colour, plus the type
// and radius scales as text and number variables.

const COLOURS = ${JSON.stringify(Object.fromEntries(flat.map(([k, v]) => [k, figRgb(v)])), null, 2)};

const NUMBERS = ${JSON.stringify(
    { ...Object.fromEntries(Object.entries(sys.radius).map(([k, v]) => [`radius-${k}`, v])), ...Object.fromEntries(Object.entries(sys.space).map(([k, v]) => [`space-${k}`, parseInt(v, 10)])) },
    null,
    2
  )};

const STRINGS = ${JSON.stringify(
    { 'font-sans': sys.type.sans, 'font-serif': sys.type.serif ?? sys.type.sans, 'font-mono': sys.type.mono },
    null,
    2
  )};

async function run() {
  const collection = figma.variables.createVariableCollection(${esc(`notugly ${sys.seed}`)});
  const modeId = collection.modes[0].modeId;

  const make = (name, type, value) => {
    const v = figma.variables.createVariable(name, collection, type);
    v.setValueForMode(modeId, value);
    return v;
  };

  for (const [name, value] of Object.entries(COLOURS)) make('colour/' + name, 'COLOR', value);
  for (const [name, value] of Object.entries(NUMBERS)) make(name.replace('-', '/'), 'FLOAT', value);
  for (const [name, value] of Object.entries(STRINGS)) make(name.replace('-', '/'), 'STRING', value);

  figma.notify(${esc(`notugly: ${flat.length} colours imported`)});
  figma.closePlugin();
}

run();
`;

  return { 'manifest.json': manifest, 'code.js': code };
}

// --- VS Code ------------------------------------------------------------------

/**
 * An editor theme from the same system. The point is not that you need another
 * VS Code theme — it is that seeing your palette applied to something as dense
 * as a code editor exposes weaknesses a landing page never will.
 */
export function toVsCode(sys) {
  const c = sys.colour;
  const n = c.neutral;
  const dark = sys.dark;
  const p = c.primary;
  const a = c.accentRamp;

  // Syntax colours have to differ from each other, not just from the
  // background — otherwise every token type looks the same and the theme is
  // useless. Spread them across the ramps deliberately.
  const syntax = {
    comment: dark ? n[5] : n[7],
    string: dark ? a[3] : a[8],
    keyword: dark ? p[3] : p[8],
    function: dark ? a[2] : a[9],
    number: dark ? p[2] : p[9],
    variable: c.text,
    type: dark ? a[4] : a[7],
  };

  const theme = {
    name: `notugly ${sys.seed}`,
    type: dark ? 'dark' : 'light',
    colors: {
      'editor.background': c.bg,
      'editor.foreground': c.text,
      'editorLineNumber.foreground': dark ? n[6] : n[5],
      'editorLineNumber.activeForeground': c.text,
      'editor.selectionBackground': dark ? p[8] : p[2],
      'editorCursor.foreground': c.focus,
      'editor.lineHighlightBackground': c.surface,
      'sideBar.background': c.surface,
      'sideBar.foreground': c.text,
      'sideBarSectionHeader.background': c.surfaceAlt,
      'activityBar.background': c.surfaceAlt,
      'activityBar.foreground': c.text,
      'activityBarBadge.background': c.buttonBg,
      'activityBarBadge.foreground': c.buttonText,
      'statusBar.background': c.buttonBg,
      'statusBar.foreground': c.buttonText,
      'titleBar.activeBackground': c.surface,
      'titleBar.activeForeground': c.text,
      'tab.activeBackground': c.bg,
      'tab.activeForeground': c.text,
      'tab.inactiveBackground': c.surfaceAlt,
      'tab.inactiveForeground': c.textMuted,
      'tab.activeBorderTop': c.brand,
      'panel.background': c.surface,
      'terminal.background': c.bg,
      'terminal.foreground': c.text,
      'focusBorder': c.focus,
      'input.background': c.surface,
      'input.foreground': c.text,
      'dropdown.background': c.surface,
      'list.activeSelectionBackground': c.buttonBg,
      'list.activeSelectionForeground': c.buttonText,
      'list.hoverBackground': c.surfaceAlt,
      'button.background': c.buttonBg,
      'button.foreground': c.buttonText,
      'badge.background': c.buttonBg,
      'badge.foreground': c.buttonText,
      'scrollbarSlider.background': `${c.border}88`,
      'widget.border': c.border,
      'editorWidget.background': c.surface,
    },
    tokenColors: [
      { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: syntax.comment, fontStyle: 'italic' } },
      { scope: ['string', 'string.quoted', 'constant.character'], settings: { foreground: syntax.string } },
      { scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.control'], settings: { foreground: syntax.keyword } },
      { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: syntax.function } },
      { scope: ['constant.numeric', 'constant.language'], settings: { foreground: syntax.number } },
      { scope: ['variable', 'variable.other', 'meta.definition.variable'], settings: { foreground: syntax.variable } },
      { scope: ['entity.name.type', 'support.type', 'support.class', 'entity.name.class'], settings: { foreground: syntax.type } },
      { scope: ['entity.name.tag'], settings: { foreground: syntax.keyword } },
      { scope: ['entity.other.attribute-name'], settings: { foreground: syntax.type, fontStyle: 'italic' } },
      { scope: ['invalid'], settings: { foreground: dark ? '#ff9c9c' : '#a30000' } },
    ],
  };

  const pkg = {
    name: `notugly-${String(sys.seed).replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`,
    displayName: `notugly ${sys.seed}`,
    description: `Generated by notugly. Seed "${sys.seed}", ${sys.vibe}.`,
    version: '1.0.0',
    engines: { vscode: '^1.70.0' },
    categories: ['Themes'],
    contributes: {
      themes: [{ label: `notugly ${sys.seed}`, uiTheme: dark ? 'vs-dark' : 'vs', path: './themes/notugly-color-theme.json' }],
    },
  };

  return {
    'package.json': JSON.stringify(pkg, null, 2),
    'themes/notugly-color-theme.json': JSON.stringify(theme, null, 2),
  };
}

// --- iOS ------------------------------------------------------------------

const srgbComponents = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return {
    red: (((n >> 16) & 255) / 255).toFixed(3),
    green: (((n >> 8) & 255) / 255).toFixed(3),
    blue: ((n & 255) / 255).toFixed(3),
    alpha: '1.000',
  };
};

const uiColorInit = (hex) => {
  const { red, green, blue } = srgbComponents(hex);
  return `UIColor(red: ${red}, green: ${green}, blue: ${blue}, alpha: 1)`;
};

/**
 * iOS: an Assets.xcassets colour set per token — light and dark appearance in
 * the exact shape Xcode writes when you do this by hand — plus a plain Swift
 * file with the same colours as dynamic `UIColor`/`Color` values, for anyone
 * who would rather not manage an asset catalog just to get a palette into a
 * build. `sys` only carries one appearance; the other is rebuilt from the
 * same seed and vibe, the way the site's own dark-mode toggle would.
 */
export function toIOS(sys) {
  const other = system(sys.seed, { vibe: sys.vibe, dark: !sys.dark, brand: sys.brandLocked });
  const light = sys.dark ? other.colour : sys.colour;
  const dark = sys.dark ? sys.colour : other.colour;

  const files = {};
  for (const key of CORE_KEYS) {
    const contents = {
      colors: [
        { idiom: 'universal', color: { 'color-space': 'srgb', components: srgbComponents(light[key]) } },
        {
          idiom: 'universal',
          appearances: [{ appearance: 'luminosity', value: 'dark' }],
          color: { 'color-space': 'srgb', components: srgbComponents(dark[key]) },
        },
      ],
      info: { author: 'notugly', version: 1 },
    };
    files[`Assets.xcassets/Notugly${cap(key)}.colorset/Contents.json`] = JSON.stringify(contents, null, 2);
  }
  files['Assets.xcassets/Contents.json'] = JSON.stringify({ info: { author: 'notugly', version: 1 } }, null, 2);

  files['NotuglyColors.swift'] = `// ${sys.vibeLabel} · seed ${sys.seed}
// Generated by notugly. Every text pairing clears WCAG AA in both appearances.
import SwiftUI

extension UIColor {
${CORE_KEYS.map((key) => `  static let notugly${cap(key)} = UIColor { $0.userInterfaceStyle == .dark ? ${uiColorInit(dark[key])} : ${uiColorInit(light[key])} }`).join('\n')}
}

extension Color {
${CORE_KEYS.map((key) => `  static let notugly${cap(key)} = Color(uiColor: .notugly${cap(key)})`).join('\n')}
}
`;
  return files;
}

// --- Android ----------------------------------------------------------------

/**
 * Android: `colors.xml` in both a default and a `values-night` variant — the
 * mechanism Android has used for light/dark since API 29 — plus a Material 3
 * theme wiring them to the roles Material actually asks for, and a Compose
 * `ColorScheme` for anyone past XML views.
 */
export function toAndroid(sys) {
  const other = system(sys.seed, { vibe: sys.vibe, dark: !sys.dark, brand: sys.brandLocked });
  const light = sys.dark ? other.colour : sys.colour;
  const dark = sys.dark ? sys.colour : other.colour;

  const colorsXml = (c) =>
    `<?xml version="1.0" encoding="utf-8"?>\n<!-- ${sys.vibeLabel} · seed ${sys.seed} · generated by notugly -->\n<resources>\n${CORE_KEYS.map((k) => `    <color name="${snake(k)}">${c[k]}</color>`).join('\n')}\n</resources>\n`;

  const theme = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="Theme.Notugly" parent="Theme.Material3.DayNight.NoActionBar">
    <item name="colorPrimary">@color/brand</item>
    <item name="colorOnPrimary">@color/button_text</item>
    <item name="colorSecondary">@color/accent</item>
    <item name="colorSurface">@color/surface</item>
    <item name="colorOnSurface">@color/text</item>
    <item name="colorSurfaceVariant">@color/surface_alt</item>
    <item name="colorOutline">@color/border</item>
    <item name="android:colorBackground">@color/bg</item>
  </style>
</resources>
`;

  const kt = (name, c) =>
    `${name}Scheme = ${sys.dark && name === 'dark' ? 'darkColorScheme' : 'lightColorScheme'}(\n    primary = Color(0xFF${c.brand.slice(1)}),\n    onPrimary = Color(0xFF${c.buttonText.slice(1)}),\n    secondary = Color(0xFF${c.accent.slice(1)}),\n    background = Color(0xFF${c.bg.slice(1)}),\n    surface = Color(0xFF${c.surface.slice(1)}),\n    onSurface = Color(0xFF${c.text.slice(1)}),\n    outline = Color(0xFF${c.border.slice(1)}),\n  )`;

  const compose = `// ${sys.vibeLabel} · seed ${sys.seed}
package notugly.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

val Notugly${kt('light', light)}

val Notugly${kt('dark', dark)}
`;

  return {
    'src/main/res/values/colors.xml': colorsXml(light),
    'src/main/res/values-night/colors.xml': colorsXml(dark),
    'src/main/res/values/themes.xml': theme,
    'src/main/java/notugly/theme/NotuglyTheme.kt': compose,
  };
}

// --- React Native + Flutter ---------------------------------------------------

/** React Native: no CSS custom properties on that platform, so the same
 * roles land in a plain TypeScript object a `StyleSheet` can spread from. */
export function toReactNative(sys) {
  const c = sys.colour;
  return `// ${sys.vibeLabel} · seed ${sys.seed}${sys.dark ? ' · dark' : ''}
// Generated by notugly. Plain objects — no ThemeProvider, nothing to install.

export const colors = {
${CORE_KEYS.map((k) => `  ${k}: ${esc(c[k])},`).join('\n')}
} as const;

export const radius = {
${Object.entries(sys.radius).map(([k, v]) => `  ${k}: ${v},`).join('\n')}
} as const;

export const spacing = {
${Object.entries(sys.space).map(([k, v]) => `  s${k}: ${parseInt(v, 10)},`).join('\n')}
} as const;

export const typography = {
${sys.type.scale.map((s) => `  ${s.name}: { fontSize: ${s.px}, lineHeight: ${Math.round(s.px * s.lineHeight)}, letterSpacing: ${s.letterSpacing * s.px} },`).join('\n')}
} as const;
`;
}

/** Flutter: a `ThemeData` with a full `ColorScheme`, so `Theme.of(context)`
 * resolves to these colours everywhere Material widgets read from it. */
export function toFlutter(sys) {
  const c = sys.colour;
  const dartColor = (hex) => `Color(0xFF${hex.slice(1).toUpperCase()})`;

  return `// ${sys.vibeLabel} · seed ${sys.seed}${sys.dark ? ' · dark' : ''}
// Generated by notugly.
import 'package:flutter/material.dart';

class NotuglyTheme {
  static ThemeData get theme => ThemeData(
    brightness: Brightness.${sys.dark ? 'dark' : 'light'},
    scaffoldBackgroundColor: ${dartColor(c.bg)},
    colorScheme: ColorScheme.${sys.dark ? 'dark' : 'light'}(
      primary: ${dartColor(c.brand)},
      onPrimary: ${dartColor(c.buttonText)},
      secondary: ${dartColor(c.accent)},
      surface: ${dartColor(c.surface)},
      onSurface: ${dartColor(c.text)},
      outline: ${dartColor(c.border)},
      background: ${dartColor(c.bg)},
      onBackground: ${dartColor(c.text)},
    ),
    textTheme: TextTheme(
${sys.type.scale.map((s) => `      ${s.name === 'base' ? 'bodyMedium' : s.name}: TextStyle(fontSize: ${s.px}, height: ${s.lineHeight}, letterSpacing: ${(s.letterSpacing * s.px).toFixed(2)}),`).join('\n')}
    ),
  );
}
`;
}

// --- email --------------------------------------------------------------------

/**
 * Email HTML: tables, inline styles, no `<style>` block a client might strip,
 * no `backdrop-filter` or CSS variables an email renderer has never heard of.
 * Everything else this project exports assumes a browser; this assumes
 * Outlook, which is the more hostile and more common environment.
 */
export function toEmail(sys) {
  const c = sys.colour;
  const font = sys.type.body.split(',')[0].replace(/["']/g, '');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${sys.vibeLabel} — notugly seed ${sys.seed}</title>
</head>
<body style="margin:0; padding:0; background:${c.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
        <tr><td style="background:${c.surface}; border:1px solid ${c.border}; border-radius:${Math.min(sys.radius.lg, 12)}px; padding:32px; font-family:${font}, Arial, sans-serif;">
          <h1 style="margin:0 0 12px; color:${c.text}; font-size:${sys.type.scale.find((s) => s.name === '2xl')?.px ?? 24}px; line-height:1.25;">${sys.vibeLabel}</h1>
          <p style="margin:0 0 20px; color:${c.textMuted}; font-size:${sys.type.scale.find((s) => s.name === 'base')?.px ?? 16}px; line-height:1.5;">
            Seed <code>${sys.seed}</code>. Every pairing on this email clears WCAG AA — checked against the actual rendered colours, not the ones a client might substitute.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td bgcolor="${c.buttonBg}" style="border-radius:${Math.min(sys.radius.md, 8)}px;">
              <a href="#" style="display:inline-block; padding:12px 24px; color:${c.buttonText}; font-family:${font}, Arial, sans-serif; font-size:15px; font-weight:600; text-decoration:none;">A button</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}
