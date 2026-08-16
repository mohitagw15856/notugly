// The chaos test.
//
// Design systems are demonstrated with three words of Latin and a square
// photograph. Real content is a 47-character German compound noun, a name in
// Arabic, an image that 404s, and a user who has set their browser to 200%.
//
// This produces that content, so a system can be shown surviving it. It is the
// difference between "look how nice" and "look how it holds".

export const CASES = [
  {
    id: 'long-word',
    label: 'An unbreakable word',
    why: 'Overflows any container that has not set a wrapping strategy.',
    text: 'Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz',
  },
  {
    id: 'long-text',
    label: 'Far more text than anyone designed for',
    why: 'Cards and buttons are usually sized around the happy path.',
    text: 'This is the sort of sentence a real user writes when they have opinions about your product, and it keeps going well past the point where the mockup had a tidy two-line label sitting comfortably inside its box.',
  },
  {
    id: 'empty',
    label: 'Nothing at all',
    why: 'Empty states are the most common screen in a new account and the least designed.',
    text: '',
  },
  {
    id: 'rtl',
    label: 'Right to left',
    why: 'Layouts pinned with left/right rather than start/end break here.',
    text: 'مرحبا بالعالم، هذا نص تجريبي',
    dir: 'rtl',
  },
  {
    id: 'cjk',
    label: 'CJK characters',
    why: 'Line-height tuned for Latin clips ascenders and descenders here.',
    text: '設計システムは実際の文字で試すべきです',
  },
  {
    id: 'emoji',
    label: 'Emoji and combining marks',
    why: 'Font fallback and line-height wobble; ZWJ sequences can double the height.',
    text: 'Ship it 🚀 👩‍💻 é̷̢̛x̸t̴r̵a̶ marks',
  },
  {
    id: 'numbers',
    label: 'Long numbers and currency',
    why: 'Tabular figures matter; proportional digits make tables jitter.',
    text: '1,234,567.89 · €9.99 · +44 7700 900123',
  },
  {
    id: 'broken-image',
    label: 'An image that does not load',
    why: 'Alt text lands in a box sized for a picture. Most systems have not styled it.',
    image: 'this-image-does-not-exist.png',
  },
  {
    id: 'zoom',
    label: 'Two hundred per cent zoom',
    why: 'WCAG requires it to work. Fixed pixel heights are where it fails.',
    text: 'Readable at 200%?',
    zoom: 2,
  },
  {
    id: 'long-link',
    label: 'A very long URL',
    why: 'Unbreakable strings push layouts sideways and cause horizontal scroll.',
    text: 'https://example.com/a/very/long/path/that/keeps/going/and/going?with=query&params=too',
  },
];

// A quick pass/fail on the things that can be checked without a browser.
export function staticChecks(sys) {
  const checks = [
    {
      id: 'reduced-motion',
      label: 'Respects prefers-reduced-motion',
      pass: sys.motion.css.includes('prefers-reduced-motion'),
      why: 'Animation without an escape hatch is a bug for anyone with vestibular sensitivity.',
    },
    {
      id: 'focus-visible',
      label: 'Has a focus colour distinct from the background',
      pass: sys.colour.focus !== sys.colour.bg,
      why: 'Keyboard users need to see where they are.',
    },
    {
      id: 'no-webfont',
      label: 'Needs no webfont download',
      pass: !/https?:\/\//.test(sys.type.heading + sys.type.body),
      why: 'A system that costs 300 kB before it renders is a liability.',
    },
    {
      id: 'relative-type',
      label: 'Type scale is in rem, so browser zoom works',
      pass: sys.type.scale.every((s) => typeof s.rem === 'number'),
      why: 'Pixel type ignores the user’s own font-size setting.',
    },
  ];
  return { checks, passed: checks.every((c) => c.pass) };
}
