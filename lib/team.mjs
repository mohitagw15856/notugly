// A whole company from one seed.
//
// The problem this solves is small and extremely common: a team page where
// four people uploaded photographs, two used the default grey silhouette, one
// used a cartoon of a frog, and the eighth is a company logo. It looks like
// eight separate websites.
//
// One seed, N people. Every avatar comes from the same palette family, so the
// page reads as one organisation, while every person still gets a face that is
// unmistakably theirs and never changes.

import { avatar, paletteFor } from './avatar.mjs';
import { persona, displayName, handle, ARCHETYPES } from './persona.mjs';
import { system } from './system.mjs';
import { hexToOklch, oklchToHex, toDisplayable, contrast } from './color.mjs';
import { chance } from './seed.mjs';

/**
 * @param {string} org      the shared seed — a company name works well
 * @param {string[]} people names or ids; each gets a stable face
 */
export function team(org, people, { style = null, dark = false, brand = null, vibe = null } = {}) {
  const sys = system(org, { dark, brand, vibe: vibe ?? 'editorial' });
  const c = chance(`team:${org}`);
  const [, , orgHue] = hexToOklch(brand ?? sys.colour.brand);

  // One style for the whole team unless told otherwise. Mixed styles are the
  // thing that makes a team page look assembled rather than designed — a
  // pencil sketch next to a photorealistic face next to a monster.
  const chosen = style ?? c.pick(['face', 'specs', 'pencil', 'cat', 'line']);

  // Spread the members' hues around the org hue: distinct from each other, but
  // audibly in the same key.
  //
  // The span has to be generous. Requesting a hue is not the same as getting
  // one — toDisplayable clamps into sRGB and that shifts hue by a few degrees,
  // so a ten-person team spaced a nominal 15° apart came back with two members
  // 13.7° apart and indistinguishable.
  const span = Math.min(300, 34 * people.length);

  // Drawn once. Inside the loop it advances the stream on every member, so the
  // "+ i" rotation stops being a rotation and two people collide anyway.
  const archetypeStart = c.int(0, ARCHETYPES.length - 1);

  return {
    org,
    system: sys,
    style: chosen,
    members: people.map((who, i) => {
      const offset = people.length === 1 ? 0 : -span / 2 + (span * i) / (people.length - 1);
      const hue = ((orgHue + offset) % 360 + 360) % 360;
      const colour = oklchToHex(toDisplayable([dark ? 0.68 : 0.55, 0.14, hue]));
      // Spread the archetypes too. Left to the seed, a six-person team lands
      // three Menaces, which undercuts the whole point of generating a cast.
      const archetype = ARCHETYPES[(archetypeStart + i) % ARCHETYPES.length].key;
      const p = persona(`${org}:${who}`, { style: chosen, dark, brand: colour, archetype });

      return {
        id: String(who),
        name: displayName(String(who)) === String(who) ? String(who) : String(who),
        handle: `@${handle(`${org}:${who}`)}`,
        colour,
        archetype: p.archetypeLabel,
        bio: p.bio,
        // The face is seeded on org+person, so the same person at a different
        // company gets a different face — which is correct. Their identity here
        // belongs to this team page, not to them globally.
        avatar: (opts = {}) => avatar(`${org}:${who}`, { style: chosen, on: sys.colour.bg, label: String(who), ...opts }),
      };
    }),
  };
}

/** Are any two members' colours too close to tell apart? */
export function teamDistinct(t) {
  const clashes = [];
  for (let i = 0; i < t.members.length; i++) {
    for (let j = i + 1; j < t.members.length; j++) {
      const a = t.members[i];
      const b = t.members[j];
      const gap = Math.abs(((hexToOklch(a.colour)[2] - hexToOklch(b.colour)[2] + 540) % 360) - 180);
      if (gap < 14) clashes.push({ a: a.id, b: b.id, degrees: +gap.toFixed(1) });
    }
  }
  return { passed: clashes.length === 0, clashes };
}

/** A contact-sheet of the whole team, as one self-contained SVG. */
export function teamSheet(t, { size = 96, columns = 6, gap = 18 } = {}) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const rows = Math.ceil(t.members.length / columns);
  const cellH = size + 26;
  const w = Math.min(t.members.length, columns) * (size + gap) - gap;
  const h = rows * (cellH + gap) - gap;
  const c = t.system.colour;

  const cells = t.members
    .map((m, i) => {
      const x = (i % columns) * (size + gap);
      const y = Math.floor(i / columns) * (cellH + gap);
      const inner = m
        .avatar({ size })
        .replace(/^<svg[^>]*>/, '')
        .replace(/<\/svg>$/, '');
      return `<g transform="translate(${x} ${y})">
        <clipPath id="tm${i}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath>
        <g clip-path="url(#tm${i})"><g transform="scale(${size / 100})">${inner}</g></g>
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1.5}" fill="none" stroke="${m.colour}" stroke-width="3"/>
        <text x="${size / 2}" y="${size + 16}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="${c.textMuted}">${esc(m.id)}</text>
      </g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="The ${esc(t.org)} team">${cells}</svg>`;
}
