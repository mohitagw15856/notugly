// Motion presets, each of which switches itself off when asked to.
//
// Every preset below emits a prefers-reduced-motion block alongside it. That is
// not a nicety: vestibular disorders are common, and a design system that ships
// animation without the escape hatch is shipping a bug.

export const EASINGS = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  spring: 'cubic-bezier(0.2, 1.2, 0.3, 1)',
  bounce: 'cubic-bezier(0.2, 1.6, 0.4, 1)',
  linear: 'linear',
};

export const DURATIONS = { instant: 80, quick: 160, normal: 260, slow: 420, deliberate: 700 };

export const PRESETS = {
  'fade-up': { from: 'opacity:0; transform: translateY(14px)', to: 'opacity:1; transform:none', ease: 'entrance', dur: 'normal' },
  'fade-in': { from: 'opacity:0', to: 'opacity:1', ease: 'standard', dur: 'quick' },
  'scale-in': { from: 'opacity:0; transform: scale(.96)', to: 'opacity:1; transform:none', ease: 'spring', dur: 'normal' },
  'slide-left': { from: 'opacity:0; transform: translateX(20px)', to: 'opacity:1; transform:none', ease: 'entrance', dur: 'normal' },
  pop: { from: 'transform: scale(.8)', to: 'transform: scale(1)', ease: 'bounce', dur: 'quick' },
  'blur-in': { from: 'opacity:0; filter: blur(8px)', to: 'opacity:1; filter:none', ease: 'entrance', dur: 'slow' },
};

export function motion(name = 'fade-up', { stagger = 0 } = {}) {
  const p = PRESETS[name] || PRESETS['fade-up'];
  const ms = DURATIONS[p.dur];
  const ease = EASINGS[p.ease];
  const key = `nu-${name}`;

  const css = `@keyframes ${key} {
  from { ${p.from}; }
  to { ${p.to}; }
}

.${key} {
  animation: ${key} ${ms}ms ${ease} both;${stagger ? `\n}\n\n.${key}:nth-child(n) {\n  animation-delay: calc(var(--i, 0) * ${stagger}ms);` : ''}
}

/* Nobody should have to fight your design system to stop it moving. */
@media (prefers-reduced-motion: reduce) {
  .${key} { animation: none; }
}`;

  return { name, class: key, ms, easing: ease, css };
}

export const allMotion = () => Object.keys(PRESETS).map((n) => motion(n));
