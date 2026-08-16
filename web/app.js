// The site runs the same generators the CLI does — imported, not reimplemented.
// That is the whole reason to keep the library free of Node built-ins: the
// browser and the terminal cannot disagree if there is only one implementation.

import { system, audit } from './lib/system.mjs';
import { VIBES, VIBE_NAMES } from './lib/vibe.mjs';
import { avatar, STYLES } from './lib/avatar.mjs';
import { exportAll } from './lib/export.mjs';
import { CASES, staticChecks } from './lib/chaos.mjs';
import { pattern, PATTERNS } from './lib/pattern.mjs';
import { blob, divider, DIVIDERS } from './lib/shape.mjs';
import { toSeed } from './lib/seed.mjs';
import { contrast } from './lib/color.mjs';
import { MOODS, MOOD_STYLES, HATS } from './lib/avatar.mjs';
import { persona, cast, card, identityKit, ARCHETYPES } from './lib/persona.mjs';
import { mascot, reactTo, quip } from './lib/mascot.mjs';
import { inspect } from './lib/fix.mjs';
import { roast } from './lib/roast.mjs';
import { checkVision, simulate, VISION, PREVALENCE } from './lib/vision.mjs';
import { printReport } from './lib/print.mjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = {
  seed: 'notugly',
  vibe: 'editorial',
  dark: false,
  avatarStyle: 'face',
  avatarMood: 'neutral',
  avatarHat: 'none',
  personaSeed: 'mo',
  archetype: null,
  battle: null,
  mascotState: 'idle',
  demo: 'dashboard',
  exportFile: 'notugly.css',
  sys: null,
};

// --- applying the system to this very page ----------------------------------

function apply(sys) {
  const r = document.documentElement.style;
  const c = sys.colour;
  r.setProperty('--bg', c.bg);
  r.setProperty('--surface', c.surface);
  r.setProperty('--surface-alt', c.surfaceAlt);
  r.setProperty('--text', c.text);
  r.setProperty('--text-muted', c.textMuted);
  r.setProperty('--brand', c.brand);
  r.setProperty('--accent', c.accent);
  r.setProperty('--button-bg', c.buttonBg);
  r.setProperty('--button-text', c.buttonText);
  r.setProperty('--border', c.border);
  r.setProperty('--focus', c.focus);
  r.setProperty('--radius', `${sys.radius.md}px`);
  r.setProperty('--radius-lg', `${sys.radius.lg}px`);
  r.setProperty('--shadow', sys.shadow.layers.join(', '));
  r.setProperty('--font-heading', sys.type.heading);
  r.setProperty('--font-body', sys.type.body);
  r.setProperty('--font-mono', sys.type.mono);
  r.setProperty('--grain', sys.pattern.dataUri);
  document.documentElement.style.colorScheme = sys.dark ? 'dark' : 'light';
}

// --- the panels -------------------------------------------------------------

function renderTokens(sys) {
  const c = sys.colour;
  $('#ramps').innerHTML = [c.primary, c.accentRamp, c.neutral]
    .map((r) => `<div class="ramp">${r.map((h) => `<i style="background:${h}" title="${h}"></i>`).join('')}</div>`)
    .join('');

  const a = audit(sys);
  const byName = Object.fromEntries(a.results.map((x) => [x.name, x]));
  const rows = [
    ['background', c.bg],
    ['text', c.text, 'body text on background'],
    ['muted', c.textMuted, 'muted text on background'],
    ['brand', c.brand, 'brand text on background'],
    ['accent', c.accent, 'accent text on background'],
    ['button', c.buttonBg, 'button label on button'],
    ['border', c.border, 'border on background'],
  ];
  $('#colour-tokens').innerHTML = rows
    .map(([name, hex, auditKey]) => {
      const r = auditKey ? byName[auditKey] : null;
      return `<tr><td><span class="chip" style="background:${hex}"></span>${name}</td><td>${hex}</td><td class="${r?.pass ? 'pass' : ''}">${r ? `${r.ratio}:1` : ''}</td></tr>`;
    })
    .join('');

  $('#type-preview').innerHTML = `
    <p class="h" style="font-size:${sys.type.scale[7].rem}rem;line-height:${sys.type.scale[7].lineHeight};letter-spacing:${sys.type.scale[7].letterSpacing}em">Aa Heading</p>
    <p class="b">Body copy, set at ${sys.type.scale[2].px}px with a line height of ${sys.type.scale[2].lineHeight}. The tracking tightens as the size grows, which is the part most scales forget.</p>
    <p class="m">mono 0123456789</p>`;

  $('#type-tokens').innerHTML = [
    ['pairing', sys.type.pairing.name],
    ['ratio', `${sys.type.ratio} (${sys.type.ratioName.replace(/_/g, ' ')})`],
    ['heading', sys.type.heading.split(',')[0]],
    ['body', sys.type.body.split(',')[0]],
    ['scale', sys.type.scale.map((s) => s.px).join(' ')],
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td colspan="2">${esc(v)}</td></tr>`)
    .join('');

  $('#elevations').innerHTML = sys.elevationLevels
    .map((lv) => {
      const s = sys.elevation[lv];
      const here = lv === sys.shadow.level;
      // In dark mode the surface does the lifting, not the shadow.
      const bg = sys.elevationSurface[lv];
      return `<div class="elev${here ? ' here' : ''}" style="box-shadow:${s.layers.join(', ')};background:${bg}"
        title="${s.layers.length} layer${s.layers.length === 1 ? '' : 's'} · ${bg}">
        <b>${lv}</b><span>${s.layers.length}&times;</span></div>`;
    })
    .join('');

  // Patterns tile as a background; shapes are drawn objects. They need
  // different containers, so they get them rather than sharing one that suits
  // neither.
  $('#textures').innerHTML =
    PATTERNS.map((p) => {
      // The page uses these at ~4% so they whisper. In a 90px swatch that
      // reads as an empty box, so the preview is louder than the real value.
      const pat = pattern(p, { colour: sys.colour.text, opacity: 0.45, seed: sys.seed });
      return `<div class="tex" style="background-image:${pat.dataUri}"><span>${p}</span></div>`;
    }).join('') +
    `<div class="tex shape">${blob(sys.seed, { size: 100 }).svg}<span>blob</span></div>` +
    DIVIDERS.slice(0, 3)
      .map(
        (d) =>
          `<div class="tex shape divider">${divider(d, { width: 100, height: 46, seed: sys.seed }).svg}<span>${d}</span></div>`
      )
      .join('');

  $('#gradbox').style.cssText = sys.gradient.css;
  $('#gradcss').textContent = sys.gradient.css;

  $('#motionbox').innerHTML = Array.from({ length: 6 }, (_, i) => `<div class="m" style="--i:${i}"></div>`).join('');
  injectMotion(sys);
  playMotion(sys);
}

// Re-derive a shadow at another level without rebuilding the whole system.
// Elevation used to be faked here: take whichever single shadow the vibe chose
// and multiply its pixel values. That was wrong twice over. In Editorial the
// only shadow is one layer at 2.7% opacity, so scaling the geometry produced
// five identical invisible boxes; and in Glassy the "flat" swatch was a
// six-layer shadow shrunk, which is not what flat means.
//
// A real elevation scale varies layer count, blur *and* opacity together, and
// lib/shadow.mjs has always generated exactly that. Use it.

let motionStyle;
function injectMotion(sys) {
  if (!motionStyle) {
    motionStyle = document.createElement('style');
    document.head.appendChild(motionStyle);
  }
  motionStyle.textContent = sys.motion.css.replace(`.${sys.motion.class} {`, `.motionbox .m {`);
}
function playMotion(sys) {
  $$('.motionbox .m').forEach((el, i) => {
    el.style.animation = 'none';
    void el.offsetWidth; // force a reflow so the animation restarts
    el.style.animation = `${sys.motion.class} ${sys.motion.ms}ms ${sys.motion.easing} ${i * 60}ms both`;
  });
}

// --- the demo interfaces ----------------------------------------------------

const DEMOS = {
  dashboard: (sys) => `
    <div style="display:grid;grid-template-columns:180px 1fr;min-height:380px">
      <aside style="background:${sys.colour.surfaceAlt};padding:1.2rem;border-right:1px solid ${sys.colour.border}">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.4rem">
          ${avatar(sys.seed, { style: 'geometric', size: 26, on: sys.colour.surfaceAlt })}
          <b style="font-family:${sys.type.heading}">Acme</b>
        </div>
        ${['Overview', 'Revenue', 'Customers', 'Settings']
          .map(
            (l, i) =>
              `<div style="padding:.5rem .6rem;border-radius:${sys.radius.sm}px;margin-bottom:.2rem;font-size:.88rem;${i === 0 ? `background:${sys.colour.buttonBg};color:${sys.colour.buttonText};font-weight:600` : `color:${sys.colour.textMuted}`}">${l}</div>`
          )
          .join('')}
      </aside>
      <div style="padding:1.4rem">
        <h3 style="font-family:${sys.type.heading};margin:0 0 1rem">Overview</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-bottom:1.2rem">
          ${[['Revenue', '£48,200', '+12%'], ['Users', '2,481', '+4%'], ['Churn', '1.2%', '−0.3%']]
            .map(
              ([k, v, d]) => `<div style="padding:.9rem;border:1px solid ${sys.colour.border};border-radius:${sys.radius.md}px;background:${sys.colour.surface}">
                <div style="font-size:.72rem;color:${sys.colour.textMuted};font-family:${sys.type.mono}">${k}</div>
                <div style="font-size:1.4rem;font-family:${sys.type.heading}">${v}</div>
                <div style="font-size:.75rem;color:${sys.colour.accent}">${d}</div>
              </div>`
            )
            .join('')}
        </div>
        <div style="height:110px;border-radius:${sys.radius.md}px;${sys.gradient.css};margin-bottom:1rem"></div>
        <button style="padding:.6rem 1.1rem;border:0;border-radius:${sys.radius.md}px;background:${sys.colour.buttonBg};color:${sys.colour.buttonText};font-weight:600;cursor:pointer">Export report</button>
      </div>
    </div>`,

  landing: (sys) => `
    <div style="padding:3rem 2rem;text-align:center;${sys.gradient.css}">
      <p style="font-family:${sys.type.mono};font-size:.75rem;color:${sys.colour.text};opacity:.7">NOW IN BETA</p>
      <h1 style="font-family:${sys.type.heading};font-size:2.6rem;letter-spacing:-.03em;margin:.4rem 0;color:${sys.colour.text}">Ship it before Friday</h1>
      <p style="max-width:44ch;margin:0 auto 1.4rem;color:${sys.colour.text};opacity:.75">The same words every landing page uses, so you are judging the design and not the copy.</p>
      <button style="padding:.75rem 1.4rem;border:0;border-radius:${sys.radius.md}px;background:${sys.colour.buttonBg};color:${sys.colour.buttonText};font-weight:600;cursor:pointer">Start free</button>
    </div>
    <div style="padding:2rem;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;background:${sys.colour.bg}">
      ${['Fast', 'Accessible', 'Yours']
        .map(
          (t, i) => `<div style="padding:1rem;border:1px solid ${sys.colour.border};border-radius:${sys.radius.md}px;background:${sys.colour.surface}">
            <div style="width:34px;height:34px;border-radius:${sys.radius.sm}px;background:${sys.colour.primary[i * 3 + 2]};margin-bottom:.6rem"></div>
            <b style="font-family:${sys.type.heading}">${t}</b>
            <p style="font-size:.85rem;color:${sys.colour.textMuted};margin:.3rem 0 0">A sentence of supporting detail that nobody reads.</p>
          </div>`
        )
        .join('')}
    </div>`,

  pricing: (sys) => `
    <div style="padding:2.2rem;background:${sys.colour.bg}">
      <h3 style="font-family:${sys.type.heading};text-align:center;font-size:1.8rem;margin:0 0 1.6rem">Pricing</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
        ${[['Free', '£0', false], ['Team', '£29', true], ['Scale', '£99', false]]
          .map(
            ([name, price, feat]) => `<div style="padding:1.2rem;border-radius:${sys.radius.lg}px;border:${feat ? 2 : 1}px solid ${feat ? sys.colour.buttonBg : sys.colour.border};background:${sys.colour.surface};box-shadow:${feat ? sys.shadow.layers.join(', ') : 'none'}">
              ${feat ? `<div style="font-family:${sys.type.mono};font-size:.66rem;color:${sys.colour.accent}">MOST POPULAR</div>` : ''}
              <b style="font-family:${sys.type.heading};font-size:1.1rem">${name}</b>
              <div style="font-size:2rem;font-family:${sys.type.heading};margin:.3rem 0">${price}<span style="font-size:.8rem;color:${sys.colour.textMuted}">/mo</span></div>
              <ul style="list-style:none;padding:0;margin:.8rem 0;font-size:.85rem;color:${sys.colour.textMuted}">
                ${['Everything free', 'Priority support', 'Audit log'].map((f) => `<li style="padding:.2rem 0">✓ ${f}</li>`).join('')}
              </ul>
              <button style="width:100%;padding:.6rem;border:${feat ? 0 : `1px solid ${sys.colour.border}`};border-radius:${sys.radius.md}px;background:${feat ? sys.colour.buttonBg : 'transparent'};color:${feat ? sys.colour.buttonText : sys.colour.text};font-weight:600;cursor:pointer">Choose</button>
            </div>`
          )
          .join('')}
      </div>
    </div>`,

  form: (sys) => `
    <div style="padding:2.2rem;max-width:460px;margin:0 auto;background:${sys.colour.bg}">
      <h3 style="font-family:${sys.type.heading};font-size:1.6rem;margin:0 0 .4rem">Create an account</h3>
      <p style="color:${sys.colour.textMuted};font-size:.9rem;margin:0 0 1.4rem">Focus states included, because keyboard users exist.</p>
      ${['Name', 'Email', 'Password']
        .map(
          (l) => `<label style="display:block;margin-bottom:.9rem">
            <span style="display:block;font-size:.8rem;color:${sys.colour.textMuted};margin-bottom:.3rem;font-family:${sys.type.mono}">${l}</span>
            <input placeholder="${l}" style="width:100%;padding:.6rem .8rem;border:1px solid ${sys.colour.border};border-radius:${sys.radius.md}px;background:${sys.colour.surface};color:${sys.colour.text};font:inherit">
          </label>`
        )
        .join('')}
      <button style="width:100%;padding:.7rem;border:0;border-radius:${sys.radius.md}px;background:${sys.colour.buttonBg};color:${sys.colour.buttonText};font-weight:600;cursor:pointer">Create account</button>
      <p style="font-size:.78rem;color:${sys.colour.textMuted};text-align:center;margin-top:.9rem">Already have one? <a href="#" style="color:${sys.colour.brand}">Sign in</a></p>
    </div>`,
};

function renderDemo(sys) {
  $('#demo').innerHTML = DEMOS[state.demo](sys);
}

// --- contexts ---------------------------------------------------------------
// Each preview is a real iframe running the exported HTML, so what you see is
// the artefact rather than a mock-up of it.

const FILTERS = {
  normal: 'none',
  protanopia: 'url(#nu-prot)',
  deuteranopia: 'url(#nu-deut)',
  tritanopia: 'url(#nu-trit)',
};

function renderContexts(sys) {
  const { toHtml } = { toHtml: null };
  const html = exportAll(sys).files['index.html'];
  const dark = exportAll(system(state.seed, { vibe: state.vibe, dark: !sys.dark })).files['index.html'];

  const frames = [
    ['as generated', html, ''],
    [sys.dark ? 'light mode' : 'dark mode', dark, ''],
    ['deuteranopia', html, 'filter:grayscale(.15) sepia(.35) hue-rotate(-18deg) saturate(1.4)'],
    ['200% zoom', html.replace('<body>', '<body style="zoom:2">'), ''],
  ];

  $('#contexts').innerHTML = frames
    .map(
      ([label, doc, style]) =>
        `<div class="ctx"><div class="label"><span>${label}</span></div>
         <iframe title="${label}" sandbox="allow-same-origin" style="${style}" srcdoc="${esc(doc)}"></iframe></div>`
    )
    .join('');
}

// --- avatars ----------------------------------------------------------------

const NAMES = ['mo', 'siyu', 'ada', 'grace', 'linus', 'radia', 'katherine', 'alan', 'barbara', 'tim', 'margaret', 'donald'];

function renderAvatars(sys) {
  const base = $('#avname').value.trim() || 'mo';
  const names = [base, ...NAMES.filter((n) => n !== base)].slice(0, 12);
  $('#avgrid').innerHTML = names
    .map(
      (n) =>
        `<div class="av">${avatar(n, {
          style: state.avatarStyle,
          size: 88,
          on: sys.colour.bg,
          label: n,
          mood: state.avatarMood === 'neutral' ? null : state.avatarMood,
          hat: state.avatarHat,
        })}<span>${esc(n)}</span></div>`
    )
    .join('');

  // One name, every mood, side by side — the clearest possible demonstration
  // that it is the same person each time.
  $('#moodstrip').innerHTML = MOODS.map(
    (m) =>
      `<div class="av">${avatar(base, {
        style: MOOD_STYLES.includes(state.avatarStyle) ? state.avatarStyle : 'face',
        size: 68,
        on: sys.colour.bg,
        mood: m === 'neutral' ? null : m,
        label: `${base}, ${m}`,
      })}<span>${m}</span></div>`
  ).join('');
}

// --- chaos ------------------------------------------------------------------

function renderChaos(sys) {
  $('#chaosgrid').innerHTML = CASES.map((t) => {
    const inner = t.image
      ? `<img src="${t.image}" alt="An image that failed to load, with alt text long enough to show how it wraps">`
      : t.text === ''
        ? `<span style="color:var(--text-muted);font-style:italic">nothing here yet</span>`
        : `<span ${t.dir ? `dir="${t.dir}"` : ''} style="${t.zoom ? `font-size:${t.zoom}em` : ''}">${esc(t.text)}</span>`;
    return `<div class="chaos">
      <div class="what">${esc(t.label)}</div>
      <p class="why">${esc(t.why)}</p>
      <div class="box">${inner}</div>
    </div>`;
  }).join('');

  const s = staticChecks(sys);
  $('#staticchecks').innerHTML =
    `<h3>What can be checked without a browser</h3><ul class="checks">` +
    s.checks
      .map(
        (c) =>
          `<li><span class="${c.pass ? 'ok' : 'no'}">${c.pass ? '✓' : '✗'}</span><span>${esc(c.label)}<small>${esc(c.why)}</small></span></li>`
      )
      .join('') +
    `</ul>`;
}

// --- export -----------------------------------------------------------------

function renderExport(sys) {
  const e = exportAll(sys);
  const files = Object.keys(e.files);

  $('#export-tabs').innerHTML = files
    .map((f) => `<button data-file="${f}" aria-selected="${f === state.exportFile}">${f}</button>`)
    .join('');
  $$('#export-tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      state.exportFile = b.dataset.file;
      renderExport(sys);
    })
  );

  const current = e.files[state.exportFile] ?? e.files[files[0]];
  $('#export-code').textContent = current;
  $('#export-size').textContent = `${e.sizes[state.exportFile]?.human ?? ''} · 0 bytes of runtime`;

  $('#copycode').onclick = async () => {
    await navigator.clipboard.writeText(current);
    $('#copycode').textContent = 'copied';
    setTimeout(() => ($('#copycode').textContent = 'Copy'), 1400);
  };
  $('#download').onclick = () => {
    const blobUrl = URL.createObjectURL(new Blob([current], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = state.exportFile;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const a = audit(sys);
  $('#report').innerHTML =
    `<h3>The proof</h3><table>` +
    a.results
      .map(
        (r) =>
          `<tr><td>${esc(r.name)}</td><td class="ratio">${r.ratio}:1</td><td class="${r.pass ? 'ok' : 'no'}">${r.pass ? r.grade : 'fail'}</td></tr>`
      )
      .join('') +
    `</table><p class="lede" style="margin:.9rem 0 0;font-size:.85rem">` +
    (a.passed
      ? `Every pairing meets or beats its target. Weakest readable pair: <b>${a.weakest.ratio}:1</b>.`
      : `Some pairings fall short — that is a bug, please report it.`) +
    `</p>`;
}

// --- gallery ----------------------------------------------------------------

const GALLERY = [
  ['aurora', 'glassy', false],
  ['ink', 'editorial', false],
  ['concrete', 'brutalist', false],
  ['phosphor', 'terminal', true],
  ['bubblegum', 'playful', false],
  ['midnight', 'editorial', true],
  ['signal', 'brutalist', true],
  ['peach', 'playful', false],
];

function renderGallery() {
  $('#gallery-grid').innerHTML = GALLERY.map(([seed, vibe, dark]) => {
    const s = system(seed, { vibe, dark });
    return `<button class="card" data-seed="${seed}" data-vibe="${vibe}" data-dark="${dark}">
      <div class="strip">${s.colour.primary.slice(1, 9).map((h) => `<i style="background:${h}"></i>`).join('')}</div>
      <div class="meta"><b>${esc(seed)}</b><span>${VIBES[vibe].label}${dark ? ' · dark' : ''}</span></div>
    </button>`;
  }).join('');

  $$('#gallery-grid .card').forEach((b) =>
    b.addEventListener('click', () => {
      state.seed = b.dataset.seed;
      state.vibe = b.dataset.vibe;
      state.dark = b.dataset.dark === 'true';
      $('#seed').value = state.seed;
      generate();
      $('#top').scrollIntoView({ behavior: 'smooth' });
    })
  );
}


// --- the mascot -------------------------------------------------------------
// He is re-serialised only when the system changes. The eye tracking moves two
// circles via a transform, because rebuilding the SVG on every mousemove is how
// you make a 120px character cost more than the rest of the page.

let mascotIdle = null;
let quipN = 0;

function renderMascot(sys) {
  $('#mascot').innerHTML = mascot(sys.colour, { size: 132, state: state.mascotState });
  setMascotState(state.mascotState, true);
}

function setMascotState(next, quiet = false) {
  state.mascotState = next;
  const el = $('#nu-mascot');
  if (!el) return;
  if (!quiet) {
    el.innerHTML = mascot(state.sys.colour, { size: 132, state: next })
      .replace(/^[\s\S]*?<g id="nu-mascot-body">/, '<g id="nu-mascot-body">')
      .replace(/<\/svg>$/, '');
    el.dataset.state = next;
    // Only the body is swapped, so the label on the outer element has to be
    // updated by hand — otherwise a screen reader is told he is still idle
    // twenty minutes after he fell asleep.
    el.setAttribute('aria-label', `The notugly mascot, ${next}`);
  }
  $('#mascot-quip').textContent = quip(next, quipN++);

  // He falls asleep if you leave him alone, and wakes up when you come back.
  clearTimeout(mascotIdle);
  if (next !== 'asleep') {
    mascotIdle = setTimeout(() => setMascotState('asleep'), 25000);
  }
}

function trackEyes(e) {
  const pupils = $('#nu-mascot-pupils');
  if (!pupils) return;
  const box = $('#nu-mascot').getBoundingClientRect();
  if (!box.width) return;
  const dx = e.clientX - (box.left + box.width / 2);
  const dy = e.clientY - (box.top + box.height / 2);
  const d = Math.hypot(dx, dy) || 1;
  // Capped well inside the lens so he never looks like his eyes fell out.
  const reach = Math.min(2.6, d / 90);
  pupils.setAttribute('transform', `translate(${(dx / d) * reach} ${(dy / d) * reach})`);
  if (state.mascotState === 'asleep') setMascotState('idle');
}

// --- personas ---------------------------------------------------------------

function currentPersona() {
  return persona(state.personaSeed, { archetype: state.archetype, dark: state.dark });
}

function renderPersona() {
  const p = currentPersona();
  const c = p.system.colour;

  $('#personabox').innerHTML = `
    <div class="persona" style="--p:${p.colour};background:${c.surface};border-color:${c.border}">
      <div class="pface">${p.avatar({ size: 150, on: c.surface })}</div>
      <div class="pmeta">
        <h3 style="color:${c.text}">${esc(p.name)}</h3>
        <p class="phandle">${esc(p.handle)} · <b>${esc(p.archetypeLabel)}</b></p>
        <p class="pbio" style="color:${c.text}">${esc(p.bio)}</p>
        <p class="psays">“${esc(p.catchphrase)}”</p>
        <div class="ptraits">${p.traits.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        <div class="penergy" aria-label="Energy ${p.energy} of 5">
          ${Array.from({ length: 5 }, (_, i) => `<i class="${i < p.energy ? 'on' : ''}"></i>`).join('')}
        </div>
      </div>
      <div class="pkit">
        ${['favicon', 'small', 'medium'].map((k) => {
          const size = { favicon: 32, small: 48, medium: 64 }[k];
          return `<div class="pkitem">${p.avatar({ size, on: c.surface })}<span>${size}px</span></div>`;
        }).join('')}
      </div>
    </div>`;

  $('#cardbox').innerHTML = card(p, { tagline: 'made with notugly' });
  $$('#parchetypes button').forEach((b) =>
    b.setAttribute('aria-selected', String((b.dataset.arch || null) === state.archetype))
  );

  const seeds = ['ada', 'grace', 'linus', 'radia', 'katherine', 'alan'];
  $('#castgrid').innerHTML = cast(seeds, { dark: state.dark })
    .map(
      (m) => `<div class="castcard" style="border-color:${m.colour}">
        ${m.avatar({ size: 72, on: state.sys.colour.surface })}
        <b>${esc(m.name)}</b>
        <span class="fine">${esc(m.archetypeLabel)}</span>
      </div>`
    )
    .join('');
}

function download(name, body, type = 'image/svg+xml') {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// --- judgement --------------------------------------------------------------

function renderFix() {
  const fg = $('#fixfg').value.trim();
  const bg = $('#fixbg').value.trim();
  const ok = (h) => /^#[0-9a-f]{6}$/i.test(h);
  if (!ok(fg) || !ok(bg)) {
    $('#fixout').innerHTML = `<p class="fine">Two six-digit hex colours, please.</p>`;
    return;
  }
  const i = inspect(fg, bg);
  const row = (label, f) =>
    f.impossible
      ? `<tr><td>${label}</td><td colspan="2" class="fine">impossible against this background</td></tr>`
      : `<tr><td>${label}</td>
         <td><i class="sw" style="background:${f.to}"></i><code>${f.to}</code></td>
         <td class="num">${f.after}:1</td></tr>`;

  $('#fixout').innerHTML = `
    <div class="fixdemo">
      <div style="background:${bg};color:${fg}">The quick brown fox</div>
      <div style="background:${bg};color:${i.fixes.aa.to}">The quick brown fox</div>
    </div>
    <p class="verdict ${i.wcag.aa ? 'good' : 'bad'}">
      ${i.wcag.ratio}:1 — ${i.wcag.aa ? i.wcag.grade.toUpperCase() : 'fails AA'}
      <span class="fine">· APCA Lc ${i.apca.lc}, ${esc(i.apca.use)}</span>
    </p>
    ${i.wcag.aa ? '' : `<table class="tokens">${row('AA Large', i.fixes.aaLarge)}${row('AA', i.fixes.aa)}${row('AAA', i.fixes.aaa)}</table>`}`;
}

function renderVision(sys) {
  const v = checkVision(sys.colour);
  const roles = ['bg', 'surface', 'text', 'brand', 'accent', 'buttonBg', 'border'];
  $('#visionout').innerHTML = `
    <table class="tokens vision">
      <tr><th></th><th>normal</th>${VISION.map((k) => `<th title="${PREVALENCE[k]}">${k.slice(0, 6)}</th>`).join('')}</tr>
      ${roles
        .map(
          (r) => `<tr><td class="fine">${r}</td>
            <td><i class="sw" style="background:${sys.colour[r]}"></i></td>
            ${VISION.map((k) => `<td><i class="sw" style="background:${simulate(sys.colour[r], k)}"></i></td>`).join('')}
          </tr>`
        )
        .join('')}
    </table>
    <p class="verdict ${v.passed ? 'good' : 'warn'}">
      ${v.passed ? 'No two colours collapse into each other.' : `${v.collisions.length} pair(s) merge.`}
    </p>
    ${v.collisions
      .map((c) => `<p class="fine"><i class="sw" style="background:${c.pair[0]}"></i><i class="sw" style="background:${c.pair[1]}"></i> both become ${c.becomes[0]} under ${c.kind} (${c.prevalence})</p>`)
      .join('')}`;
}

function renderPrint(sys) {
  const r = printReport(sys.colour);
  $('#printout').innerHTML = `
    <table class="tokens">
      ${r.checks
        .map(
          (c) => `<tr>
            <td class="fine">${c.role}</td>
            <td><i class="sw" style="background:${c.hex}"></i></td>
            <td>${c.shift.inGamut ? '<span class="fine">in gamut</span>' : `<i class="sw" style="background:${c.shift.as}"></i><span class="fine">${c.shift.as}</span>`}</td>
            <td class="num fine">${c.coverage}%</td>
          </tr>`
        )
        .join('')}
    </table>
    <p class="fine">Left is the screen. Right is roughly what a press can reach.</p>`;
}

function renderRoast() {
  const colours = ($('#roastin').value.match(/#[0-9a-f]{6}/gi) || []).map((c) => c.toLowerCase());
  const r = roast(colours);
  $('#roastout').innerHTML = `
    <p class="verdict ${r.score >= 70 ? 'good' : 'bad'}">${esc(r.verdict)} <span class="fine">${r.score}/100</span></p>
    <ul class="burns">${r.burns.map((b) => `<li>${esc(b.says)}${b.fix ? `<br><span class="fine">→ ${esc(b.fix)}</span>` : ''}</li>`).join('')}</ul>`;
}

// --- two-up battle ----------------------------------------------------------
// Twenty clicks and it has worked out what you like, without ever asking you a
// question you would not be able to answer.

function newBattle(keep = null) {
  const rnd = () => toSeed(Math.floor(performance.now() * 1000) ^ Date.now() ^ Math.floor(Math.random() * 1e9));
  const pick = () => ({
    seed: rnd(),
    vibe: keep && Math.random() < 0.6 ? keep.vibe : VIBE_NAMES[Math.floor(Math.random() * VIBE_NAMES.length)],
    dark: keep && Math.random() < 0.7 ? keep.dark : Math.random() < 0.4,
  });
  state.battle = { a: pick(), b: pick(), round: (state.battle?.round || 0) + 1, keep };
  renderBattle();
}

function renderBattle() {
  const { a, b, round } = state.battle;
  const side = (cfg, which) => {
    const s = system(cfg.seed, { vibe: cfg.vibe, dark: cfg.dark });
    return `<button class="bside" data-side="${which}" style="background:${s.colour.bg};color:${s.colour.text};border-color:${s.colour.border}">
      <span class="bramp">${s.colour.primary.slice(2, 9).map((h) => `<i style="background:${h}"></i>`).join('')}</span>
      <b style="font-family:${s.type.heading}">${esc(s.seed)}</b>
      <span class="bbtn" style="background:${s.colour.buttonBg};color:${s.colour.buttonText};border-radius:${s.radius.md}px">Button</span>
      <span class="fine" style="color:${s.colour.textMuted}">${s.vibeLabel}${cfg.dark ? ' · dark' : ''}</span>
    </button>`;
  };
  $('#battle').innerHTML = `
    <p class="fine">Round ${round}${state.battle.keep ? ` · leaning ${state.battle.keep.vibe}${state.battle.keep.dark ? ', dark' : ''}` : ''}</p>
    <div class="bpair">${side(a, 'a')}<span class="bvs">or</span>${side(b, 'b')}</div>`;
  $$('#battle .bside').forEach((el) =>
    el.addEventListener('click', () => {
      const won = state.battle[el.dataset.side];
      // Adopt the winner immediately — the whole page becomes it, which is the
      // fastest possible way to tell whether you actually meant it.
      state.seed = won.seed;
      state.vibe = won.vibe;
      state.dark = won.dark;
      $('#seed').value = won.seed;
      generate();
      newBattle(won);
    })
  );
}

// --- keyboard ---------------------------------------------------------------

function keys(e) {
  // Never steal a key from someone typing a seed.
  if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const vi = VIBE_NAMES.indexOf(state.vibe);

  if (k === 'r') { $('#reroll').click(); }
  else if (k === 'd') { $('#mode').click(); }
  else if (e.key === 'ArrowRight') { state.vibe = VIBE_NAMES[(vi + 1) % VIBE_NAMES.length]; generate(); }
  else if (e.key === 'ArrowLeft') { state.vibe = VIBE_NAMES[(vi - 1 + VIBE_NAMES.length) % VIBE_NAMES.length]; generate(); }
  else if (k === 'e') { document.getElementById('export').scrollIntoView({ behavior: 'smooth' }); }
  else if (k === 'p') { document.getElementById('personas').scrollIntoView({ behavior: 'smooth' }); }
  else if (k === '?') { $('.keys').classList.toggle('lit'); }
  else return;
  e.preventDefault();
}

// --- wiring -----------------------------------------------------------------

function generate() {
  const sys = system(state.seed, { vibe: state.vibe, dark: state.dark });
  state.sys = sys;

  apply(sys);
  renderTokens(sys);
  renderDemo(sys);
  renderContexts(sys);
  renderAvatars(sys);
  renderChaos(sys);
  renderExport(sys);
  renderMascot(sys);
  renderPersona();
  renderVision(sys);
  renderPrint(sys);
  renderFix();

  // The brand mark is the mascot at 24px — small enough that the glasses are
  // the only thing that survives, which turns out to be enough.
  $('#brand-avatar').innerHTML = mascot(sys.colour, { size: 24, state: 'happy', id: 'nu-brand' });
  $$('#vibes .vibe').forEach((b) => b.setAttribute('aria-selected', b.dataset.vibe === state.vibe));
  $('#mode').setAttribute('aria-pressed', String(state.dark));
  $('#mode').textContent = state.dark ? 'Light' : 'Dark';

  const a = audit(sys);
  $('#hint').textContent = a.passed
    ? `${sys.vibeLabel} · seed ${sys.seed} · weakest readable pair ${a.weakest.ratio}:1 — every pairing passes`
    : `${sys.vibeLabel} · seed ${sys.seed} · some pairings fail`;

  const url = new URL(location.href);
  url.searchParams.set('seed', state.seed);
  url.searchParams.set('vibe', state.vibe);
  if (state.dark) url.searchParams.set('dark', '1');
  else url.searchParams.delete('dark');
  history.replaceState(null, '', url);
}

function boot() {
  // Vibe buttons carry a live preview of what they will do.
  $('#vibes').innerHTML = VIBE_NAMES.map((v) => {
    const s = system(state.seed, { vibe: v });
    return `<button class="vibe" role="tab" data-vibe="${v}" aria-selected="${v === state.vibe}">
      <span class="sw">${s.colour.primary.slice(3, 8).map((h) => `<i style="background:${h}"></i>`).join('')}</span>
      ${VIBES[v].label}</button>`;
  }).join('');
  $$('#vibes .vibe').forEach((b) =>
    b.addEventListener('click', () => {
      state.vibe = b.dataset.vibe;
      generate();
    })
  );

  $('#demo-tabs').innerHTML = Object.keys(DEMOS)
    .map((d) => `<button data-demo="${d}" aria-selected="${d === state.demo}">${d}</button>`)
    .join('');
  $$('#demo-tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      state.demo = b.dataset.demo;
      $$('#demo-tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
      renderDemo(state.sys);
    })
  );

  $('#avstyles').innerHTML = STYLES.map(
    (s) => `<button data-style="${s}" aria-selected="${s === state.avatarStyle}">${s}</button>`
  ).join('');
  $$('#avstyles button').forEach((b) =>
    b.addEventListener('click', () => {
      state.avatarStyle = b.dataset.style;
      $$('#avstyles button').forEach((x) => x.setAttribute('aria-selected', x === b));
      renderAvatars(state.sys);
    })
  );
  $('#avname').addEventListener('input', () => renderAvatars(state.sys));

  $('#seed').addEventListener('input', (e) => {
    state.seed = e.target.value.trim() || 'notugly';
    generate();
  });
  $('#reroll').addEventListener('click', () => {
    state.seed = toSeed(Math.floor(performance.now() * 1000) ^ Date.now());
    $('#seed').value = state.seed;
    generate();
  });
  $('#mode').addEventListener('click', () => {
    state.dark = !state.dark;
    generate();
  });
  $('#copylink').addEventListener('click', async () => {
    await navigator.clipboard.writeText(location.href);
    $('#copylink').textContent = 'copied';
    setTimeout(() => ($('#copylink').textContent = 'Copy link'), 1400);
  });
  $('#replay').addEventListener('click', () => playMotion(state.sys));

  // A shared link should land on exactly the design it was sent for.
  const q = new URLSearchParams(location.search);
  if (q.get('seed')) state.seed = q.get('seed');
  if (VIBE_NAMES.includes(q.get('vibe'))) state.vibe = q.get('vibe');
  if (q.get('dark')) state.dark = true;
  $('#seed').value = state.seed;

  // --- avatar moods and hats ---
  $('#avmoods').innerHTML = ['neutral', ...MOODS.filter((m) => m !== 'neutral')]
    .map((m) => `<button data-mood="${m}" aria-selected="${m === state.avatarMood}">${m}</button>`)
    .join('');
  $$('#avmoods button').forEach((b) =>
    b.addEventListener('click', () => {
      state.avatarMood = b.dataset.mood;
      $$('#avmoods button').forEach((x) => x.setAttribute('aria-selected', x === b));
      renderAvatars(state.sys);
    })
  );
  $('#avhats').innerHTML = HATS.map(
    (h) => `<button data-hat="${h}" aria-selected="${h === state.avatarHat}">${h}</button>`
  ).join('');
  $$('#avhats button').forEach((b) =>
    b.addEventListener('click', () => {
      state.avatarHat = b.dataset.hat;
      $$('#avhats button').forEach((x) => x.setAttribute('aria-selected', x === b));
      renderAvatars(state.sys);
    })
  );

  // --- personas ---
  $('#parchetypes').innerHTML =
    `<button data-arch="" aria-selected="true">any</button>` +
    ARCHETYPES.map((a) => `<button data-arch="${a.key}">${a.label.replace('The ', '')}</button>`).join('');
  $$('#parchetypes button').forEach((b) =>
    b.addEventListener('click', () => {
      state.archetype = b.dataset.arch || null;
      renderPersona();
    })
  );
  $('#pname').addEventListener('input', (e) => {
    state.personaSeed = e.target.value.trim() || 'mo';
    renderPersona();
  });
  $('#preroll').addEventListener('click', () => {
    state.personaSeed = toSeed(Math.floor(performance.now() * 1000) ^ Date.now());
    $('#pname').value = state.personaSeed;
    renderPersona();
    setMascotState('shocked');
  });
  $('#dlcard').addEventListener('click', () => {
    const p = currentPersona();
    download(`${p.seed}-card.svg`, card(p, { tagline: 'made with notugly' }));
    setMascotState('happy');
  });
  $('#dlkit').addEventListener('click', () => {
    const kit = identityKit(currentPersona());
    // One HTML file holding every asset, because a zip needs a dependency and
    // eight separate downloads needs eight clicks.
    const page = `<!doctype html><meta charset="utf-8"><title>${esc(kit.name)} — identity kit</title>
<style>body{font:16px system-ui;max-width:60rem;margin:3rem auto;padding:0 1rem}
h1{margin:0}code{background:#eee;padding:.15em .4em;border-radius:4px}
.row{display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;margin:1rem 0}</style>
<h1>${esc(kit.name)}</h1><p>${esc(kit.handle)} — ${esc(kit.bio)}</p>
<p>Brand colour: <code>${kit.colour}</code></p>
<div class="row">${Object.entries(kit.avatars).map(([k, svg]) => `<figure style="margin:0"><figcaption><small>${k}</small></figcaption>${svg}</figure>`).join('')}</div>
<h2>Social card</h2>${kit.card}
<h2>CSS</h2><pre><code>${esc(kit.css)}</code></pre>`;
    download(`${kit.name.replace(/\s+/g, '-').toLowerCase()}-identity.html`, page, 'text/html');
    setMascotState('happy');
  });

  // --- judgement ---
  $('#fixfg').addEventListener('input', renderFix);
  $('#fixbg').addEventListener('input', renderFix);
  $('#roastgo').addEventListener('click', () => {
    renderRoast();
    setMascotState('worried');
  });
  renderRoast();
  newBattle();

  // --- ambient ---
  addEventListener('pointermove', trackEyes, { passive: true });
  addEventListener('keydown', keys);
  $('#reroll').addEventListener('click', () => setMascotState('shocked'));
  $('#mascotwrap').addEventListener('click', () => setMascotState('happy'));

  renderGallery();
  generate();

  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
    { threshold: 0.05 }
  );
  $$('.reveal').forEach((el) => io.observe(el));
}

boot();
