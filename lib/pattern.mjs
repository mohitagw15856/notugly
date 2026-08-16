// Patterns and texture, as inline data URIs. No image files, no requests.
//
// Grain in particular is the cheapest way to stop a flat gradient looking like
// a screenshot of a gradient, and almost nobody ships it because the usual
// route is a PNG.

import { chance } from './seed.mjs';

export const PATTERNS = ['grain', 'dots', 'grid', 'lines', 'isometric', 'cross', 'waves'];

const uri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

export function pattern(name = 'dots', { colour = '#000000', opacity = 0.08, size = 20, seed = 'a' } = {}) {
  const c = chance(`pat:${seed}:${name}`);
  const s = size;
  const stroke = `stroke="${colour}" stroke-opacity="${opacity}"`;
  const fill = `fill="${colour}" fill-opacity="${opacity}"`;

  const svgs = {
    // feTurbulence is the only way to get real noise without an image.
    grain: `<svg xmlns="http://www.w3.org/2000/svg" width="${s * 6}" height="${s * 6}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="${opacity}"/></svg>`,
    dots: `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 12}" ${fill}/></svg>`,
    grid: `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><path d="M${s} 0 H0 V${s}" fill="none" ${stroke}/></svg>`,
    lines: `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><path d="M0 ${s} L${s} 0" ${stroke}/></svg>`,
    cross: `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><path d="M${s / 2} ${s / 2 - 3} v6 M${s / 2 - 3} ${s / 2} h6" ${stroke}/></svg>`,
    isometric: `<svg xmlns="http://www.w3.org/2000/svg" width="${s * 2}" height="${s * 1.16}"><path d="M0 ${s * 0.58} L${s} 0 L${s * 2} ${s * 0.58} L${s} ${s * 1.16} Z" fill="none" ${stroke}/></svg>`,
    waves: `<svg xmlns="http://www.w3.org/2000/svg" width="${s * 2}" height="${s}"><path d="M0 ${s / 2} q${s / 2} -${s / 2} ${s} 0 t${s} 0" fill="none" ${stroke}/></svg>`,
  };

  const svg = svgs[name] || svgs.dots;
  return { name, svg, css: `background-image: ${uri(svg)};`, dataUri: uri(svg), bytes: uri(svg).length };
}
