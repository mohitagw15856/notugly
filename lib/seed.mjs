// Deterministic randomness.
//
// Every generator here takes a seed, and the same seed always produces the same
// thing. That is what makes a design shareable as a URL, reproducible in a
// build, and stable for a user's avatar — nobody wants their face to change
// because a server restarted.
//
// Math.random() is deliberately never used anywhere in this project.

// FNV-1a: tiny, fast, and spreads short strings like "mo" or "hello" well
// enough that neighbouring seeds do not produce neighbouring designs.
export function hash(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 — a small, well-distributed PRNG. Good enough for pretty pictures
// and far better than the usual sin(seed) trick, which has visible structure.
export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  if (a === 0) a = 0x9e3779b9;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A handful of conveniences, because every generator wants the same four things.
export function chance(seed) {
  const r = rng(seed);
  return {
    next: r,
    float: (lo = 0, hi = 1) => lo + r() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + r() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    // Weighted pick, for "mostly this, occasionally that".
    weighted: (pairs) => {
      const total = pairs.reduce((a, [, w]) => a + w, 0);
      let n = r() * total;
      for (const [value, w] of pairs) {
        n -= w;
        if (n <= 0) return value;
      }
      return pairs[pairs.length - 1][0];
    },
    bool: (p = 0.5) => r() < p,
    shuffle: (arr) => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

// Short, pronounceable, URL-safe seeds. "?seed=v7k2q" is something a person can
// read out loud; a UUID is not.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function toSeed(n) {
  let x = typeof n === 'number' ? n >>> 0 : hash(n);
  let out = '';
  for (let i = 0; i < 5; i++) {
    out += ALPHABET[x % ALPHABET.length];
    x = Math.floor(x / ALPHABET.length);
  }
  return out;
}

export const randomSeedFrom = (entropy) => toSeed(hash(String(entropy)));
