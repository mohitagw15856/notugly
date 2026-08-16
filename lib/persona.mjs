// A persona: one seed, one whole person.
//
// Every avatar generator stops at the picture. But a picture is not an online
// presence — a presence is a face *and* a name *and* a way of talking *and* a
// colour that is yours, and those four things agreeing with each other is what
// makes something feel like somebody rather than an asset.
//
// So this makes all of it from the same seed. The bookish one gets glasses,
// muted colours, a serif, and dry phrasing. The menace gets a monster, hot
// pink, and a font that shouts. That coherence is the entire trick.
//
// No model is called here and none ever will be. Every word below was written
// by a person and is picked by a seeded PRNG, which means it costs nothing to
// run, works offline, and gives the same answer forever.

import { chance } from './seed.mjs';
import { avatar, paletteFor, MOODS } from './avatar.mjs';
import { system } from './system.mjs';
import { oklchToHex, toDisplayable, hexToOklch, accessibleOn, contrast } from './color.mjs';

// --- who they are -------------------------------------------------------------

export const ARCHETYPES = [
  {
    key: 'lurker',
    label: 'The Lurker',
    traits: ['reads everything', 'says nothing', 'has receipts'],
    styles: ['ghost', 'specs', 'line'],
    vibe: 'editorial',
    hues: [230, 250, 262],
    bios: [
      'Been here since before it was good. Has never once posted.',
      'Read the whole thread. Will not be commenting.',
      'Present in every channel. Detected in none.',
    ],
    says: ['👀', 'noted', 'interesting', '(no reply)'],
    energy: 1,
  },
  {
    key: 'overthinker',
    label: 'The Overthinker',
    traits: ['three drafts deep', 'considers the edge case', 'sleeps poorly'],
    styles: ['specs', 'pencil', 'face'],
    vibe: 'editorial',
    hues: [212, 196, 262],
    bios: [
      'Has rewritten this bio four times. This is the fourth.',
      'Currently weighing both sides of a decision that does not matter.',
      'Two hours into a five-minute problem and enjoying it.',
    ],
    says: ['but consider', 'hm, although', 'okay so actually', 'wait'],
    energy: 2,
  },
  {
    key: 'shipper',
    label: 'The Ship-It',
    traits: ['merges on Friday', 'apologises Monday', 'moves fast'],
    styles: ['monster', 'face', 'sticker'],
    vibe: 'brutalist',
    hues: [22, 42, 12],
    bios: [
      'Deploys on Friday. Has never met a consequence.',
      'It works on my machine and my machine is production.',
      'Perfect is a word people use when they are stalling.',
    ],
    says: ['ship it', 'good enough', "we'll fix it forward", 'merged'],
    energy: 5,
  },
  {
    key: 'archivist',
    label: 'The Archivist',
    traits: ['knows where it is', 'wrote the doc', 'remembers why'],
    styles: ['object', 'specs', 'line'],
    vibe: 'editorial',
    hues: [88, 60, 142],
    bios: [
      'Knows which folder. Knows which version. Knows who broke it.',
      'Wrote the document nobody read and has kept it current anyway.',
      'The reason anything from before 2019 still makes sense.',
    ],
    says: ['there is a doc', 'we tried that in 2021', 'see: line 340'],
    energy: 2,
  },
  {
    key: 'menace',
    label: 'The Menace',
    traits: ['posts at 3am', 'no filter', 'beloved anyway'],
    styles: ['monster', 'cat', 'sticker'],
    vibe: 'playful',
    hues: [322, 292, 348],
    bios: [
      'Banned from three group chats. Invited back to all three.',
      'A problem, but the fun kind.',
      'Types in lowercase exclusively. Means every word.',
    ],
    says: ['lol no', 'anyway', 'absolutely not', 'ok but hear me out'],
    energy: 5,
  },
  {
    key: 'perfectionist',
    label: 'The Perfectionist',
    traits: ['aligns to the pixel', 'notices the kerning', 'unwell about it'],
    styles: ['specs', 'line', 'face'],
    vibe: 'editorial',
    hues: [168, 196, 212],
    bios: [
      'That is two pixels off and it has ruined the afternoon.',
      'Will not be discussing the kerning again. Will absolutely be discussing it again.',
      'Everything is fine except one thing, which is not fine.',
    ],
    says: ['almost', 'nearly', 'one more pass', 'that is not centred'],
    energy: 3,
  },
  {
    key: 'nightowl',
    label: 'The Night Owl',
    traits: ['peaks at 1am', 'unreachable at 10am', 'best work in the dark'],
    styles: ['ghost', 'cat', 'monster'],
    vibe: 'terminal',
    hues: [262, 292, 230],
    bios: [
      'Does the best work between midnight and four. Do not schedule the standup.',
      'Timezone: nocturnal.',
      'Awake. Not necessarily conscious.',
    ],
    says: ['still up', 'one more thing', 'ok NOW bed', '3am thought'],
    energy: 4,
  },
  {
    key: 'enthusiast',
    label: 'The Enthusiast',
    traits: ['genuinely delighted', 'sends the link', 'means it'],
    styles: ['dog', 'duck', 'sticker'],
    vibe: 'playful',
    hues: [45, 88, 28],
    bios: [
      'Has found a thing and you are going to hear about the thing.',
      'Unironically excited, which is somehow the bravest thing on the internet.',
      'Sent you four links. All four are good. That is the problem.',
    ],
    says: ['OH this is good', 'have you seen', 'okay okay okay', '!!!'],
    energy: 5,
  },
  {
    key: 'skeptic',
    label: 'The Skeptic',
    traits: ['asks the annoying question', 'usually right', 'rarely thanked'],
    styles: ['cat', 'specs', 'face'],
    vibe: 'brutalist',
    hues: [12, 348, 22],
    bios: [
      'Asked the question everyone was avoiding. Was correct. Was not thanked.',
      'Source?',
      'Not cynical. Just has been here before.',
    ],
    says: ['says who', 'source?', "that's not what that means", 'define "works"'],
    energy: 3,
  },
  {
    key: 'quiet',
    label: 'The Quiet Genius',
    traits: ['speaks rarely', 'ends the argument', 'already fixed it'],
    styles: ['capybara', 'line', 'ghost'],
    vibe: 'glassy',
    hues: [196, 168, 142],
    bios: [
      'Said one sentence in the meeting. It was the correct sentence.',
      'Already fixed it. Did not mention it.',
      'Quiet, then devastating, then quiet again.',
    ],
    says: ['done', 'fixed', 'try now', '👍'],
    energy: 1,
  },
  {
    key: 'goblin',
    label: 'The Chaos Goblin',
    traits: ['no plan', 'no fear', 'somehow it works'],
    styles: ['monster', 'duck', 'sticker'],
    vibe: 'playful',
    hues: [88, 322, 45],
    bios: [
      'No plan. No fear. Somehow ahead of schedule.',
      'Solved it with a method that must never be spoken of again.',
      'Chaotic good, allegedly.',
    ],
    says: ['what if', 'hear me out', 'it worked??', 'oops'],
    energy: 5,
  },
  {
    key: 'mentor',
    label: 'The Mentor',
    traits: ['answers properly', 'never condescends', 'has time'],
    styles: ['capybara', 'dog', 'face'],
    vibe: 'editorial',
    hues: [142, 88, 168],
    bios: [
      'Has explained this before and will explain it again without sighing.',
      'The reason four people did not quit.',
      'Answers the beginner question properly, every time.',
    ],
    says: ['good question', 'so the reason is', "you're close", 'nice one'],
    energy: 3,
  },
];

// --- what they are called -----------------------------------------------------

const ADJ = [
  'quiet', 'lucky', 'spare', 'brisk', 'soft', 'sharp', 'idle', 'plain', 'odd', 'brave',
  'small', 'rough', 'clean', 'late', 'deep', 'wild', 'neat', 'bold', 'calm', 'dry',
];
const NOUN = [
  'otter', 'kettle', 'comet', 'harbour', 'ledger', 'marble', 'lantern', 'thicket', 'anchor',
  'pigeon', 'compass', 'walnut', 'meadow', 'signal', 'burrow', 'ember', 'satchel', 'gable',
  'moth', 'pebble', 'orchard', 'tinder', 'wren', 'furrow',
];

/** A handle that reads like a person picked it, not like a UUID. */
export function handle(seed) {
  const c = chance(`handle:${seed}`);
  const shape = c.weighted([['adjnoun', 5], ['nounnum', 2], ['noundot', 2], ['double', 1]]);
  const a = c.pick(ADJ);
  const n = c.pick(NOUN);
  const n2 = c.pick(NOUN);
  return {
    adjnoun: `${a}${n}`,
    nounnum: `${n}${c.int(2, 99)}`,
    noundot: `${n}.${a}`,
    double: `${n}${n2}`,
  }[shape];
}

/** The same thing, spaced and capitalised, for when it needs to be a display name. */
export function displayName(seed) {
  const h = handle(seed);
  return h
    .replace(/[.\d]+/g, ' ')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^(\w+?)(otter|kettle|comet|harbour|ledger|marble|lantern|thicket|anchor|pigeon|compass|walnut|meadow|signal|burrow|ember|satchel|gable|moth|pebble|orchard|tinder|wren|furrow)$/, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// --- the whole person ---------------------------------------------------------

/**
 * Everything about one persona, all agreeing with each other.
 *
 * Pass `archetype` to pin who they are; otherwise the seed decides. Pass
 * `brand` to lock their colour, same as `system()`.
 */
export function persona(seed = 'someone', options = {}) {
  const c = chance(`persona:${seed}`);
  const chosen = ARCHETYPES.find((a) => a.key === options.archetype) || c.pick(ARCHETYPES);

  const style = options.style || c.pick(chosen.styles);
  const hue = c.pick(chosen.hues);
  // Their colour: the archetype decides the family, the seed decides the exact
  // one. Two lurkers are both blue, but they are not the *same* blue.
  const colour =
    options.brand || oklchToHex(toDisplayable([c.float(0.5, 0.62), c.float(0.11, 0.17), hue + c.float(-10, 10)]));

  const ui = system(seed, { vibe: options.vibe || chosen.vibe, dark: options.dark ?? false, brand: colour });

  const name = options.name || displayName(seed);
  const at = options.handle || handle(seed);
  const traits = c.shuffle([...chosen.traits]).slice(0, 3);
  const mood = options.mood || c.pick(MOODS);

  return {
    seed: String(seed),
    name,
    handle: `@${at}`,
    archetype: chosen.key,
    archetypeLabel: chosen.label,
    traits,
    bio: c.pick(chosen.bios),
    catchphrase: c.pick(chosen.says),
    // 1–5. Drives how much the mascot moves, how loud the type is, everything.
    energy: chosen.energy,
    mood,
    style,
    colour,
    avatar: (opts = {}) => avatar(seed, { style, mood, on: ui.colour.bg, label: name, ...opts }),
    palette: paletteFor(seed),
    system: ui,
  };
}

/**
 * A whole cast at once, guaranteed to be visually distinct from each other.
 * Generating a team one-by-one gives you four people who are all teal.
 */
export function cast(seeds, options = {}) {
  const made = [];
  for (const s of seeds) {
    let best = null;
    // Try a few archetypes for this seed and keep whichever is furthest in hue
    // from everyone already in the cast.
    for (let attempt = 0; attempt < 8; attempt++) {
      const p = persona(`${s}${attempt ? `#${attempt}` : ''}`, { ...options, name: options.name ?? undefined });
      const [, , h] = hexToOklch(p.colour);
      const nearest = made.length
        ? Math.min(...made.map((m) => Math.abs(((h - hexToOklch(m.colour)[2] + 540) % 360) - 180)))
        : 360;
      const usedArchetype = made.some((m) => m.archetype === p.archetype);
      const score = nearest - (usedArchetype ? 60 : 0);
      // Re-label with the *original* seed. The attempt suffix exists only to
      // reroll the archetype and hue — it must not leak into what they are
      // called, or the name and the handle end up describing two people.
      if (!best || score > best.score) {
        best = {
          p: { ...p, seed: String(s), name: options.name ?? displayName(s), handle: `@${handle(s)}` },
          score,
        };
      }
    }
    made.push(best.p);
  }
  return made;
}

// --- the card -----------------------------------------------------------------

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// Rough advance-width for the system sans at a given size. Not a font metrics
// table — but enough to stop a long name running off the edge of a card, which
// is the only failure that actually shows.
const widthOf = (text, size) =>
  [...String(text)].reduce((w, ch) => w + (/[ilj.,'!|]/.test(ch) ? 0.3 : /[A-Z@MW]/.test(ch) ? 0.72 : 0.55), 0) * size;

const fit = (text, size, max) => {
  let s = size;
  while (widthOf(text, s) > max && s > 10) s -= 1;
  return s;
};

/**
 * A social card. 1200×630, the size every platform crops to, with the persona's
 * own colours and their actual face on it.
 *
 * Self-contained SVG — no fonts to load, no images to fetch, nothing that can
 * 404 in someone else's preview crawler.
 */
export function card(p, { width = 1200, height = 630, tagline = null } = {}) {
  const c = p.system.colour;
  // Every avatar is drawn in a 0–100 viewBox; the `size` attribute only sets
  // the outer element's width. Strip the wrapper and that mapping goes with
  // it, so the drawing has to be scaled back up by hand or it sits as a speck
  // in the middle of the clip circle.
  const FACE = 260;
  const inner = p
    .avatar({ size: FACE, on: c.surface })
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');
  const face = `<g transform="scale(${FACE / 100})">${inner}</g>`;

  const nameSize = fit(p.name, 76, width - 460);
  const bioSize = 30;
  const accent = accessibleOn(c.surface, [c.brand, c.accent, c.text], 4.5);

  // The bio, wrapped by hand, because SVG will not do it for you.
  const words = p.bio.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (widthOf(next, bioSize) > width - 460 && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(`${p.name} — ${p.archetypeLabel}`)}">
  <rect width="${width}" height="${height}" fill="${c.bg}"/>
  <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="28" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>
  <rect x="40" y="40" width="10" height="${height - 80}" rx="5" fill="${p.colour}"/>
  <g transform="translate(96 ${height / 2 - FACE / 2})">
    <clipPath id="pc"><circle cx="${FACE / 2}" cy="${FACE / 2}" r="${FACE / 2}"/></clipPath>
    <g clip-path="url(#pc)">${face}</g>
    <circle cx="${FACE / 2}" cy="${FACE / 2}" r="${FACE / 2 - 1.5}" fill="none" stroke="${c.border}" stroke-width="3"/>
  </g>
  <text x="400" y="${height / 2 - 78}" font-family="Helvetica, Arial, sans-serif" font-size="${nameSize}" font-weight="700" fill="${c.text}">${esc(p.name)}</text>
  <text x="400" y="${height / 2 - 32}" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="500" fill="${accent}">${esc(p.handle)} · ${esc(p.archetypeLabel)}</text>
  ${lines
    .map(
      (l, i) =>
        `<text x="400" y="${height / 2 + 26 + i * 40}" font-family="Helvetica, Arial, sans-serif" font-size="${bioSize}" fill="${c.textMuted}">${esc(l)}</text>`
    )
    .join('\n  ')}
  <g transform="translate(400 ${height / 2 + 42 + lines.length * 40})">
    ${p.traits
      .map((t, i) => {
        const w = widthOf(t, 22) + 34;
        const x = p.traits.slice(0, i).reduce((sum, prev) => sum + widthOf(prev, 22) + 34 + 12, 0);
        return `<g transform="translate(${x} 0)"><rect width="${w}" height="42" rx="21" fill="${c.bg}" stroke="${c.border}"/><text x="${w / 2}" y="27" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="${c.textMuted}">${esc(t)}</text></g>`;
      })
      .join('\n    ')}
  </g>
  ${tagline ? `<text x="${width - 80}" y="${height - 76}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="${c.textMuted}">${esc(tagline)}</text>` : ''}
</svg>`;
}

/**
 * Every asset one persona needs to exist online, in one object. This is the
 * thing you actually ship: the favicon, the four avatar sizes every platform
 * asks for, the social card, and the colours to build the rest of the page.
 */
export function identityKit(p) {
  const sizes = { favicon: 32, small: 64, medium: 128, large: 512 };
  const avatars = Object.fromEntries(
    Object.entries(sizes).map(([k, size]) => [k, p.avatar({ size, on: p.system.colour.bg })])
  );
  return {
    name: p.name,
    handle: p.handle,
    bio: p.bio,
    colour: p.colour,
    avatars,
    // A circle is wrong for a favicon at 32px — it loses too much to the
    // rounding. Square keeps the marks.
    faviconSquare: p.avatar({ size: 32, radius: 'square' }),
    card: card(p),
    css: `:root{--persona:${p.colour};--persona-bg:${p.system.colour.bg};--persona-text:${p.system.colour.text}}`,
  };
}

// --- animated stickers --------------------------------------------------------

/**
 * A persona as a looping animated sticker, for Slack and Discord.
 *
 * SMIL rather than CSS keyframes, because a `<style>` block inside an SVG is
 * stripped by most chat clients' sanitisers while animate elements survive —
 * and because SMIL keeps the file self-contained with no external anything.
 *
 * Every motion is small and slow. A sticker that thrashes in a channel is one
 * people mute.
 */
export const STICKER_MOTIONS = ['bob', 'nod', 'blink', 'spin', 'pulse', 'wave'];

export function sticker(p, { size = 160, motion = 'bob', seconds = null } = {}) {
  const inner = p
    .avatar({ size: 100, on: p.system.colour.surface })
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');

  const dur = seconds ?? { bob: 1.8, nod: 2.4, blink: 4, spin: 6, pulse: 2.2, wave: 1.6 }[motion] ?? 2;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const anim = {
    bob: `<animateTransform attributeName="transform" type="translate" values="0 0; 0 -4; 0 0" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines=".4 0 .6 1; .4 0 .6 1" keyTimes="0;0.5;1"/>`,
    nod: `<animateTransform attributeName="transform" type="rotate" values="-4 50 50; 4 50 50; -4 50 50" dur="${dur}s" repeatCount="indefinite"/>`,
    // The whole character squashes briefly, which reads as a blink even on
    // styles that have no eyes to close.
    blink: `<animateTransform attributeName="transform" type="scale" values="1 1; 1 0.94; 1 1" dur="${dur}s" repeatCount="indefinite" keyTimes="0;0.06;0.12" additive="sum"/>`,
    spin: `<animateTransform attributeName="transform" type="rotate" values="0 50 50; 360 50 50" dur="${dur}s" repeatCount="indefinite"/>`,
    pulse: `<animateTransform attributeName="transform" type="scale" values="1; 1.06; 1" dur="${dur}s" repeatCount="indefinite" additive="sum"/>`,
    wave: `<animateTransform attributeName="transform" type="rotate" values="0 50 90; 7 50 90; -7 50 90; 0 50 90" dur="${dur}s" repeatCount="indefinite"/>`,
  }[motion] ?? '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${esc(p.name)}, animated">
  <clipPath id="sk"><circle cx="50" cy="50" r="50"/></clipPath>
  <g clip-path="url(#sk)">
    <rect width="100" height="100" fill="${p.system.colour.surface}"/>
    <g>${inner}${anim}</g>
  </g>
</svg>`;
}

/** A whole sticker pack — one persona, every motion. */
export const stickerPack = (p, opts = {}) =>
  Object.fromEntries(STICKER_MOTIONS.map((m) => [`${p.seed}-${m}.svg`, sticker(p, { ...opts, motion: m })]));
