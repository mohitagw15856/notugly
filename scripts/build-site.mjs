#!/usr/bin/env node
// Assembles site/ — the same library the CLI uses, copied verbatim so the
// browser and the terminal cannot drift apart.

import { writeFileSync, mkdirSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { system, audit } from '../lib/system.mjs';
import { VIBE_NAMES } from '../lib/vibe.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = `${ROOT}site`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/lib`, { recursive: true });

for (const f of ['index.html', 'style.css', 'app.js']) copyFileSync(`${ROOT}web/${f}`, `${OUT}/${f}`);

// Every library file the page imports. These are plain ESM with no Node
// built-ins, which is exactly why they can be served as-is.
const LIBS = ['seed.mjs', 'color.mjs', 'avatar.mjs', 'gradient.mjs', 'shadow.mjs', 'pattern.mjs', 'shape.mjs', 'type.mjs', 'motion.mjs', 'vibe.mjs', 'system.mjs', 'export.mjs', 'chaos.mjs'];
for (const f of LIBS) copyFileSync(`${ROOT}lib/${f}`, `${OUT}/lib/${f}`);

// Refuse to ship a library that would break in a browser.
for (const f of LIBS) {
  const src = readFileSync(`${ROOT}lib/${f}`, 'utf8');
  if (/from '(node:|fs|path|url|crypto)/.test(src)) {
    console.error(`Refusing to build: lib/${f} imports a Node built-in and cannot run in the browser.`);
    process.exit(1);
  }
}

mkdirSync(`${OUT}/assets`, { recursive: true });
copyFileSync(`${ROOT}assets/social.svg`, `${OUT}/assets/social.svg`);

writeFileSync(`${OUT}/.nojekyll`, '');

const hash = createHash('sha256')
  .update(readFileSync(`${ROOT}web/app.js`))
  .update(readFileSync(`${ROOT}web/style.css`))
  .update(readFileSync(`${ROOT}web/index.html`))
  .digest('hex')
  .slice(0, 12);

writeFileSync(
  `${OUT}/sw.js`,
  `// Generated. Cache name is a content hash so a fix always reaches everybody.
const CACHE = 'notugly-${hash}';
const BUILD = '${hash}';
const ASSETS = ${JSON.stringify(['./', './index.html', './style.css', './app.js', ...LIBS.map((f) => `./lib/${f}`)], null, 2)};

self.addEventListener('install', (e) => {
  const fresh = ASSETS.map((u) => new Request(u + (u.includes('?') ? '&' : '?') + 'v=' + BUILD, { cache: 'reload' }));
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      // Only ever cache a success — fetch resolves on 404 and 503, and caching
      // an error page under an asset's URL poisons it until the next deploy.
      if (res.ok && res.status === 200 && res.type !== 'opaque') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match('./index.html', { ignoreSearch: true })))
  );
});
`
);

// Duplicate ids silently break querySelector.
const html = readFileSync(`${OUT}/index.html`, 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.error(`Refusing to build: duplicate ids — ${[...new Set(dupes)].join(', ')}`);
  process.exit(1);
}

const combos = VIBE_NAMES.length * 2;
console.log(`✓ built site/ — ${LIBS.length} library files, ${combos} vibe/mode combinations, offline-ready`);
