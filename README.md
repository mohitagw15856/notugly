<p align="center">
  <img src="assets/readme/cast.svg" alt="A row of generated avatars" width="100%">
</p>

<h1 align="center">notugly</h1>

<p align="center"><b>Your design is ugly. Here, have this one instead.</b></p>

<p align="center">
  <code>npx notugly</code>
</p>

<p align="center">
  <a href="https://mohitagw15856.github.io/notugly"><b>Play with it →</b></a>
</p>

<br>

## What is this

You need colours. You pick a blue. You pick a grey that goes with the blue.
Twenty minutes later you have eleven greys, none of them go together, and the
button text is unreadable but you've stopped being able to tell.

This does that bit for you, and **it can't produce an unreadable pairing** —
not because it checks afterwards and apologises, but because the text colour is
worked out *from* the background. There's no code path that produces bad
contrast. Try to find one.

```console
$ npx notugly audit

  ✓ body text on background        20.54:1  needs 4.5  AAA
  ✓ muted text on background       11.85:1  needs 4.5  AAA
  ✓ button label on button          8.16:1  needs 4.5  AAA

  Provably not ugly.
```

2,000 random systems, 2,000 passes. The build regenerates that number every
time and **fails if it slips**, which is a very stressful way to write a README
claim.

<br>

## The avatars

<p align="center">
  <img src="assets/readme/styles.svg" alt="One name in thirteen avatar styles" width="100%">
</p>

Thirteen styles. Same name, same face, forever — `mo` will always be that
specific bespectacled fellow.

```console
npx notugly avatar mo --style pencil
```

There are **pencil people** (stick figures with genuinely wobbly hand-drawn
lines, not fake-wobbly), **specs** (a small round character whose whole
personality is its glasses), plus cats, ghosts, die-cut stickers, and the
usual geometric ones if you're boring.

<details>
<summary><b>The thing every other avatar library gets wrong</b></summary>

<br>

An avatar is a coloured disc sitting on *your* page background. If those two
happen to be close in luminance, the edge dissolves and you get a floating
face. Nobody checks for this. It looks broken and nobody knows why.

Tell notugly what it's sitting on and it adds a separating ring — but only when
it actually needs one:

```console
npx notugly avatar mo --on "#0b0d12"
```

</details>

<br>

## Five opinions

<p align="center">
  <img src="assets/readme/vibe-editorial.svg" width="31%" alt="Editorial">
  <img src="assets/readme/vibe-brutalist.svg" width="31%" alt="Brutalist">
  <img src="assets/readme/vibe-playful.svg" width="31%" alt="Playful">
</p>
<p align="center">
  <img src="assets/readme/vibe-glassy.svg" width="31%" alt="Glassy">
  <img src="assets/readme/vibe-terminal.svg" width="31%" alt="Terminal">
</p>

Radius, shadow, saturation, type and motion all have to agree with each other
or the thing looks like four people built it. So they're decided together.

```console
npx notugly --vibe brutalist
```

**[On the website the whole page turns into the vibe you click.](https://mohitagw15856.github.io/notugly)**
That's not a demo panel. That's the actual page.

<br>

## Then you take it

```console
$ npx notugly export --out ./ui

  notugly.css              2.9 kB
  tailwind.config.js       3.7 kB
  tokens.json              5.0 kB
  notugly.jsx              960 B
  Notugly.svelte           883 B
  index.html               4.4 kB

  runtime cost  0 bytes
```

That last line is the point. It's all static text. No package, no provider, no
`<ThemeProvider>` wrapping your entire app, nothing to `npm install` at 3am
when it breaks.

<br>

## Also it steals

```console
$ npx notugly steal lichess.org

  #000000  ×55
  #f0d9b5  ×2
  #946f51  ×2
```

Those last two are the chessboard squares. It read them straight off the site.

Point it at anything and get the palette, fonts and radii back as something you
can edit. Yes, this is a bit cheeky.

<br>

## The chaos test

Every design system gets demoed with three words of Latin and a square
photograph.

Real content is `Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz`,
a name in Arabic, an image that 404s, and someone at 200% zoom.

```console
npx notugly chaos
```

The [site throws all of it at whatever you've made](https://mohitagw15856.github.io/notugly/#chaos).
Most kits fall over. This one is quite smug about not doing that.

<br>

## Why it isn't just vibes

<table>
<tr><td>

**Colour maths in OKLab**

</td><td>

In HSL, `#ffff00` and `#0000ff` are both "50% lightness". One is nine times
brighter than the other. That's why generated ramps usually look cheap.

</td></tr>
<tr><td>

**Motion ships its own off switch**

</td><td>

Every preset comes with `prefers-reduced-motion` in the same file. Animation
without an escape hatch is a bug, not a flourish.

</td></tr>
<tr><td>

**No webfonts**

</td><td>

300 kB before anything renders isn't a design system, it's a tax.

</td></tr>
<tr><td>

**Nothing is copied**

</td><td>

Every colour, shape and face is generated from a seed. No scraped assets, no
lifted palettes.

</td></tr>
</table>

<br>

## As a library

```js
import { system, audit } from 'notugly';
import { avatar } from 'notugly/avatar';

const ui = system('my-app', { vibe: 'playful', dark: true });
audit(ui).passed;                    // true. if it's false, that's my bug
avatar('mo', { on: ui.colour.bg });  // never invisible
```

Same seed, same design, forever. Which means a design is a URL you can send
someone, and a user's face never changes because a server restarted.

<br>

<p align="center">
  <sub>
    MIT · no dependencies · <a href="https://mohitagw15856.github.io/notugly">the fun version of this page</a>
  </sub>
</p>
