// Pets, monsters, objects and one-line portraits.
//
// Kept apart from avatar.mjs because that file is the engine — the palette
// logic, the contrast ring, the public API — and this one is just drawings.
// Every renderer here has the same shape: (seed, palette, label, backdrop).

import { chance } from './seed.mjs';
import { oklchToHex, toDisplayable, contrast } from './color.mjs';

// A colour that is guaranteed to be visible on whatever it sits on. Every
// creature uses this rather than picking blind, which is how the pale-ghost-on-
// a-pale-plate bug happened in the first place.
const visible = (c, options, backdrop, fallback) => {
  const usable = backdrop ? options.filter((col) => contrast(col, backdrop) >= 1.35) : options;
  return c.pick(usable.length ? usable : [fallback]);
};

// --- pets -------------------------------------------------------------------

export function dog(seed, p, _l, bd) {
  const c = chance(`dog:${seed}`);
  const fur = visible(c, [p.mid, p.accent, oklchToHex(toDisplayable([0.72, 0.09, 60]))], bd, p.mid);
  const floppy = c.bool(0.6);
  const spot = c.bool(0.45);
  return `
    ${floppy
      ? `<path d="M24 44 q-10 6 -6 22 q10 4 14 -8z" fill="${fur}"/><path d="M76 44 q10 6 6 22 q-10 4 -14 -8z" fill="${fur}"/>`
      : `<path d="M28 40 l2 -20 l16 12z" fill="${fur}"/><path d="M72 40 l-2 -20 l-16 12z" fill="${fur}"/>`}
    <ellipse cx="50" cy="54" rx="26" ry="23" fill="${fur}"/>
    ${spot ? `<ellipse cx="${c.float(32, 40)}" cy="48" rx="8" ry="7" fill="${p.ink}" fill-opacity=".18"/>` : ''}
    <ellipse cx="50" cy="66" rx="14" ry="10" fill="${p.light}"/>
    <circle cx="${50 - 10}" cy="50" r="3.4" fill="${p.ink}"/>
    <circle cx="${50 + 10}" cy="50" r="3.4" fill="${p.ink}"/>
    <ellipse cx="50" cy="62" rx="4" ry="3" fill="${p.ink}"/>
    <path d="M50 65 v3 M50 68 q-5 4 -9 1 M50 68 q5 4 9 1" stroke="${p.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${c.bool(0.4) ? `<path d="M50 70 q4 6 8 3" stroke="${p.accent}" stroke-width="3" fill="none" stroke-linecap="round"/>` : ''}`;
}

export function duck(seed, p, _l, bd) {
  const c = chance(`duck:${seed}`);
  const body = visible(c, [p.light, p.mid, oklchToHex(toDisplayable([0.88, 0.14, 92]))], bd, p.mid);
  const bill = oklchToHex(toDisplayable([0.78, 0.16, 60]));
  return `
    <ellipse cx="50" cy="62" rx="27" ry="20" fill="${body}"/>
    <circle cx="${50 + 8}" cy="38" r="17" fill="${body}"/>
    <path d="M${50 + 24} 38 q12 2 10 6 q-3 4 -11 2z" fill="${bill}"/>
    <circle cx="${50 + 12}" cy="34" r="2.8" fill="${p.ink}"/>
    ${c.bool(0.5) ? `<path d="M28 58 q-8 -6 -4 -12 q6 2 8 8z" fill="${body}" stroke="${p.ink}" stroke-opacity=".15"/>` : ''}
    <path d="M34 66 q10 8 24 4" stroke="${p.ink}" stroke-opacity=".18" stroke-width="2" fill="none"/>`;
}

export function capybara(seed, p, _l, bd) {
  const c = chance(`capy:${seed}`);
  const fur = visible(c, [oklchToHex(toDisplayable([0.62, 0.08, 55])), p.mid, p.accent], bd, p.mid);
  const zen = c.bool(0.65);
  return `
    <ellipse cx="${50 - 17}" cy="36" rx="6" ry="5" fill="${fur}"/>
    <ellipse cx="${50 + 17}" cy="36" rx="6" ry="5" fill="${fur}"/>
    <rect x="24" y="38" width="52" height="42" rx="18" fill="${fur}"/>
    ${zen
      ? `<path d="M${50 - 14} 54 q5 4 10 0 M${50 + 4} 54 q5 4 10 0" stroke="${p.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${50 - 9}" cy="54" r="2.8" fill="${p.ink}"/><circle cx="${50 + 9}" cy="54" r="2.8" fill="${p.ink}"/>`}
    <ellipse cx="50" cy="68" rx="9" ry="6" fill="${p.ink}" fill-opacity=".12"/>
    <ellipse cx="50" cy="66" rx="3.4" ry="2.4" fill="${p.ink}"/>
    <path d="M50 69 q-4 3 -7 1 M50 69 q4 3 7 1" stroke="${p.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${c.bool(0.3) ? `<ellipse cx="${50 + 20}" cy="30" rx="7" ry="5" fill="${p.accent}"/>` : ''}`;
}

// --- monsters ---------------------------------------------------------------

export function monster(seed, p, _l, bd) {
  const c = chance(`mon:${seed}`);
  const body = visible(c, [p.mid, p.accent, p.light], bd, p.mid);
  const eyes = c.weighted([[1, 3], [2, 4], [3, 2]]);
  const legs = c.int(2, 4);
  const horns = c.bool(0.5);
  const teeth = c.bool(0.55);

  const eyeRow = Array.from({ length: eyes }, (_, i) => {
    const spread = eyes === 1 ? 0 : (i - (eyes - 1) / 2) * (eyes === 3 ? 15 : 18);
    const r = eyes === 1 ? 11 : 7;
    return `<circle cx="${50 + spread}" cy="46" r="${r}" fill="${p.light}"/>
            <circle cx="${50 + spread + c.float(-2, 2)}" cy="${46 + c.float(-2, 2)}" r="${r * 0.45}" fill="${p.ink}"/>`;
  }).join('');

  const legRow = Array.from({ length: legs }, (_, i) => {
    const x = 50 - ((legs - 1) * 13) / 2 + i * 13;
    return `<path d="M${x} 74 v${c.float(8, 14)}" stroke="${body}" stroke-width="6" stroke-linecap="round"/>`;
  }).join('');

  return `
    ${horns ? `<path d="M34 30 l-4 -12 l12 6z M66 30 l4 -12 l-12 6z" fill="${body}"/>` : ''}
    ${legRow}
    <rect x="24" y="28" width="52" height="48" rx="${c.float(12, 24)}" fill="${body}"/>
    ${eyeRow}
    ${teeth
      ? `<path d="M40 62 h20 v4 l-4 -2 l-4 3 l-4 -3 l-4 2z" fill="${p.ink}"/>`
      : `<path d="M42 63 q8 7 16 0" stroke="${p.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`}
    ${c.bool(0.4) ? `<circle cx="30" cy="60" r="4" fill="${p.accent}" fill-opacity=".5"/><circle cx="70" cy="60" r="4" fill="${p.accent}" fill-opacity=".5"/>` : ''}`;
}

// --- desk objects -----------------------------------------------------------
// For team pages where a face feels presumptuous.

export function object(seed, p, _l, bd) {
  const c = chance(`obj:${seed}`);
  const main = visible(c, [p.mid, p.accent, p.light], bd, p.mid);
  const kind = c.pick(['mug', 'plant', 'lamp', 'book', 'floppy']);

  const objects = {
    mug: `<path d="M30 40 h34 v26 a8 8 0 0 1 -8 8 h-18 a8 8 0 0 1 -8 -8z" fill="${main}"/>
          <path d="M64 46 h6 a7 7 0 0 1 0 14 h-6" fill="none" stroke="${main}" stroke-width="5"/>
          <ellipse cx="47" cy="40" rx="17" ry="5" fill="${p.light}"/>
          <path d="M42 30 q3 -6 0 -10 M50 32 q3 -6 0 -10" stroke="${p.light}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>`,
    plant: `<path d="M50 62 q-16 -8 -18 -26 q16 2 18 26z" fill="${main}"/>
            <path d="M50 62 q16 -10 16 -28 q-14 4 -16 28z" fill="${main}" fill-opacity=".8"/>
            <path d="M50 64 v-16" stroke="${p.ink}" stroke-width="2" opacity=".4"/>
            <path d="M34 62 h32 l-4 20 h-24z" fill="${p.ink}" fill-opacity=".75"/>`,
    lamp: `<path d="M34 44 l16 -20 l16 20z" fill="${main}"/>
           <path d="M50 44 v28" stroke="${p.ink}" stroke-width="3"/>
           <ellipse cx="50" cy="76" rx="16" ry="5" fill="${p.ink}" fill-opacity=".75"/>
           <circle cx="50" cy="48" r="4" fill="${p.light}"/>`,
    book: `<path d="M26 32 h22 v44 h-22z" fill="${main}"/>
           <path d="M52 32 h22 v44 h-22z" fill="${main}" fill-opacity=".8"/>
           <path d="M48 30 h4 v48 h-4z" fill="${p.ink}" fill-opacity=".7"/>
           <path d="M32 42 h12 M32 48 h12 M58 42 h10" stroke="${p.light}" stroke-width="2" opacity=".7"/>`,
    floppy: `<rect x="26" y="26" width="48" height="48" rx="4" fill="${main}"/>
             <rect x="36" y="26" width="28" height="18" rx="2" fill="${p.light}"/>
             <rect x="52" y="29" width="7" height="12" fill="${p.ink}"/>
             <rect x="34" y="52" width="32" height="22" rx="2" fill="${p.light}"/>`,
  };
  return objects[kind];
}

// --- one continuous line ----------------------------------------------------
// A single unbroken stroke. The constraint is the charm.

export function line(seed, p, _l, bd) {
  const c = chance(`line:${seed}`);
  const ink = bd && contrast(p.ink, bd) < 1.6 ? p.light : p.ink;
  const w = c.float(2, 2.8);

  // A face traced without lifting the pen: down the profile, round the chin,
  // up and over the crown, then a closing loop for the hair.
  const chinY = c.float(66, 74);
  const noseX = c.float(30, 36);
  const browY = c.float(40, 46);

  const d =
    `M${noseX + 6} 20 ` +
    `C${noseX - 8} ${browY - 6}, ${noseX - 6} ${browY + 4}, ${noseX + 2} ${browY + 8} ` +
    `C${noseX - 4} ${browY + 14}, ${noseX + 2} ${browY + 16}, ${noseX + 8} ${browY + 17} ` +
    `C${noseX + 4} ${chinY - 8}, ${noseX + 12} ${chinY}, ${50} ${chinY} ` +
    `C${68} ${chinY}, ${76} ${chinY - 18}, ${74} ${browY} ` +
    `C${72} 22, ${58} 14, ${noseX + 6} 20 Z`;

  const eye = `M${noseX + 12} ${browY + 2} q5 -3 9 0`;
  const lips = `M${noseX + 12} ${chinY - 10} q6 3 11 0`;

  return `
    <path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${eye}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>
    <path d="${lips}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>
    ${c.bool(0.5) ? `<circle cx="${74}" cy="${browY + 10}" r="3" fill="none" stroke="${ink}" stroke-width="${w}"/>` : ''}`;
}

// --- two of them ------------------------------------------------------------
// For shared accounts, pairs, and "the two of us who maintain this".

export function duo(seed, p, _l, bd, renderOne) {
  const c = chance(`duo:${seed}`);
  const a = renderOne(`${seed}-a`, p, null, bd);
  const b = renderOne(`${seed}-b`, p, null, bd);
  return `
    <g transform="translate(30 44) scale(0.62) translate(-50 -50)">${b}</g>
    <g transform="translate(62 56) scale(0.68) translate(-50 -50)">${a}</g>`;
}

export const CREATURES = { dog, duck, capybara, monster, object, line };
