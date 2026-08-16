// The mascot.
//
// notugly generates a face for everybody else, so it was faintly absurd that
// it didn't have one. This is the repo's own character: a small round fellow in
// glasses who is quietly judging your contrast ratios.
//
// He is not a static image. He re-skins himself from whatever system is
// currently on screen — so when you click "brutalist", he goes brutalist too —
// and his eyes follow the cursor. Every part that moves has an id, because the
// alternative is the page re-serialising the whole SVG sixty times a second.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MASCOT_STATES = ['idle', 'happy', 'thinking', 'shocked', 'worried', 'proud', 'asleep'];

// What each state does to the mouth and brows. Eyes are handled separately
// because they track the pointer independently of mood.
const FACE = {
  idle: { mouth: 'M40 66 q10 8 20 0', brows: 0, lid: 0 },
  happy: { mouth: 'M38 64 q12 14 24 0', brows: -3, lid: 0.25 },
  thinking: { mouth: 'M42 68 q10 -3 18 -5', brows: -6, lid: 0.35 },
  shocked: { mouth: 'M45 64 q5 12 10 0 q-5 -6 -10 0', brows: -9, lid: -0.2 },
  worried: { mouth: 'M40 70 q10 -8 20 0', brows: 5, lid: 0.1 },
  proud: { mouth: 'M38 64 q12 12 24 0', brows: -2, lid: 0.5 },
  asleep: { mouth: 'M46 68 q4 4 8 0', brows: 2, lid: 1 },
};

/**
 * @param {object} colour  a system's `colour` object — the mascot borrows it
 * @param {object} opts    { size, state, glasses }
 */
export function mascot(colour, { size = 120, state = 'idle', glasses = true, id = 'nu-mascot' } = {}) {
  const f = FACE[state] || FACE.idle;
  const skin = colour.surface;
  const line = colour.text;
  const frame = colour.brand;
  const blush = colour.accent;

  // Pupil travel is capped well inside the lens, so however far the cursor
  // goes he never looks like his eyes have fallen out.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"
  id="${esc(id)}" class="mascot" role="img" aria-label="The notugly mascot, ${esc(state)}" data-state="${esc(state)}">
  <g id="${esc(id)}-body">
    <ellipse cx="50" cy="88" rx="26" ry="5" fill="${line}" opacity=".12"/>
    <circle cx="50" cy="50" r="34" fill="${skin}" stroke="${colour.border}" stroke-width="2"/>
    <path d="M22 34 q28 -20 56 0 q-28 -9 -56 0z" fill="${line}" opacity=".9"/>
    <g id="${esc(id)}-brows" transform="translate(0 ${f.brows})" stroke="${line}" stroke-width="2.6" fill="none" stroke-linecap="round">
      <path d="M31 39 q6 -3 12 -1"/>
      <path d="M57 38 q6 -2 12 1"/>
    </g>
    <g id="${esc(id)}-eyes">
      <circle cx="38" cy="50" r="7" fill="#ffffff" stroke="${line}" stroke-width="1.2"/>
      <circle cx="62" cy="50" r="7" fill="#ffffff" stroke="${line}" stroke-width="1.2"/>
      <g id="${esc(id)}-pupils">
        <circle cx="38" cy="50" r="3.4" fill="${line}"/>
        <circle cx="62" cy="50" r="3.4" fill="${line}"/>
      </g>
      <g id="${esc(id)}-lids" fill="${skin}" style="transform-origin:50px 50px">
        <rect x="30" y="${43 - 14 * (1 - Math.max(0, f.lid))}" width="16" height="14" rx="2"/>
        <rect x="54" y="${43 - 14 * (1 - Math.max(0, f.lid))}" width="16" height="14" rx="2"/>
      </g>
    </g>
    ${glasses
      ? `<g fill="none" stroke="${frame}" stroke-width="2.6">
           <circle cx="38" cy="50" r="11"/><circle cx="62" cy="50" r="11"/>
           <path d="M49 50 h2"/><path d="M27 48 l-5 -3"/><path d="M73 48 l5 -3"/>
         </g>`
      : ''}
    <ellipse cx="26" cy="60" rx="5" ry="3" fill="${blush}" opacity=".45"/>
    <ellipse cx="74" cy="60" rx="5" ry="3" fill="${blush}" opacity=".45"/>
    <path id="${esc(id)}-mouth" d="${f.mouth}" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`;
}

/**
 * What the mascot should be feeling, given what the page just did. Keeping this
 * here rather than in the page means the CLI can use the same reactions.
 */
export function reactTo(event, detail = {}) {
  switch (event) {
    case 'reroll': return 'shocked';
    case 'audit': return detail.passed ? 'proud' : 'worried';
    case 'export': return 'happy';
    case 'hover': return 'thinking';
    case 'idle-long': return 'asleep';
    default: return 'idle';
  }
}

// The lines he says. Short, dry, and never about anything he cannot see.
export const QUIPS = {
  idle: ['ready when you are', 'go on then'],
  happy: ['there we go', 'that one is nice'],
  thinking: ['hmm', 'hold on'],
  shocked: ['oh!', 'again?'],
  worried: ['that will not pass', 'someone cannot read that'],
  proud: ['provably not ugly', 'all clear'],
  asleep: ['zzz', '…'],
};

export function quip(state, n = 0) {
  const list = QUIPS[state] || QUIPS.idle;
  return list[n % list.length];
}
