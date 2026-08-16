// Two more places a design system has to end up: the design tool and the
// editor. Both are just JSON, and both are the difference between "a nice
// generator" and "a thing I actually used at work".

const esc = (s) => JSON.stringify(String(s));

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
