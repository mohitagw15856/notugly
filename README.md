<p align="center">
  <img src="assets/readme/cast.svg" alt="A row of generated avatars" width="100%">
</p>

<h1 align="center">notugly</h1>

<p align="center"><b>Your design is ugly. Here, have this one instead.</b></p>

<p align="center">
  <code>npx notugly</code> · <a href="https://mohitagw15856.github.io/notugly"><b>Play with it →</b></a>
</p>

<br>

## What is this

You need colours. You pick a blue. You pick a grey that goes with the blue.
Twenty minutes later you have eleven greys, none of them go together, and the
button text is unreadable but you've stopped being able to tell.

This does that bit for you, and **it can't produce an unreadable pairing** —
not because it checks afterwards and apologises, but because the text colour is
worked out *from* the background. There's no code path that produces bad
contrast.

```console
$ npx notugly audit

  ✓ body text on background        20.55:1  needs 4.5  AAA
  ✓ muted text on background       11.86:1  needs 4.5  AAA
  ✓ button label on button             8:1  needs 4.5  AAA

  Provably not ugly.
```

2,000 random systems, 2,000 passes. The build regenerates that number every
time and **fails if it slips**, which is a very stressful way to write a README
claim.

<br>

## Twenty faces

<p align="center">
  <img src="assets/readme/doodles.svg" alt="Pencil people, a cat, a duck, a capybara, a monster and a floppy disk" width="100%">
</p>

Pencil people whose lines genuinely wobble, a character whose entire
personality is its glasses, a capybara, desk objects for team pages where a
face feels presumptuous, and one-line portraits traced without lifting the pen.

Deterministic from a name, so a person's face never changes. Six moods and
seven hats, and **the person underneath stays the same person**.

```console
npx notugly avatar mo --style pencil --mood determined
```

<details>
<summary><b>All twenty styles, six moods, and the thing every other avatar library gets wrong</b></summary>

<br>

<p align="center">
  <img src="assets/readme/styles.svg" alt="One name in twenty avatar styles" width="100%">
  <img src="assets/readme/moods.svg" alt="One face in six moods" width="90%">
</p>

The moods row is one seed. Same hair, same glasses, same face — a mood has to
pull from the random stream even when it's about to overrule the value, or
every later draw shifts and you get a different person wearing the same name.

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

## A face is not a presence

<p align="center">
  <img src="assets/readme/persona.svg" alt="A generated persona card" width="100%">
</p>

A presence is a face **and** a name **and** a way of talking **and** a colour
that's yours. Those four agreeing is what makes something feel like *somebody*.
So all of it comes out of one seed — twelve archetypes, from the Lurker to the
Chaos Goblin, each picking its own face, colour family and typographic vibe.

```console
npx notugly persona mo --out ./me     # avatars, favicon, social card, CSS
npx notugly cast ada grace linus      # a team, guaranteed no two alike
```

That card is 1200×630 with **no webfonts, no images and nothing that can 404**
in someone else's preview crawler. It's one SVG that contains itself.

> Nothing here calls a model. Every name, bio and catchphrase was written by a
> person and picked by a seeded PRNG — so it runs offline, costs nothing, and
> gives the same answer forever.

<br>

## Everything else it does

| | |
|---|---|
| `notugly fix "#8ab4f8" "#fff"` | The nearest passing colour to the one you picked. Same hue, same chroma, now readable. |
| `notugly diff a.com b.com` | Two designs, differences called out. Replaces *"theirs feels more premium"* with *"theirs is five typefaces and ours is one"*. |
| `notugly onepager` | One printable sheet: what fails, and whether each fix is a find-and-replace or a decision somebody must sign off. |
| `notugly roast "#fff" …` | What's wrong with your palette, rudely, with numbers. Every burn earned from a measurement. |
| `notugly vision` | Which colours collapse for colour-blind viewers — real Viénot/Brettel cone matrices, not a hue-rotate. |
| `notugly print` | What survives CMYK, modelled from actual process-ink primaries. |
| `notugly name "#4f76b6"` | *Hydrangea.* Nobody has ever argued about a hex code. |
| `notugly steal lichess.org` | The palette, fonts and radii off a real site. Yes, this is a bit cheeky. |
| `notugly poster / specimen / zine` | True-size printable SVG in millimetres, gamut-checked. |
| `notugly slides` | A real `.thmx` for PowerPoint and Keynote. |
| `notugly eras` | The same seed as 1998, 2008, 2015 and now. Every one was, at the time, what modern looked like. |
| `notugly watch <url>` | What drifted — and whether it's a new colour or one 0.003 away from a token nobody could find. |
| `notugly tokens f.json` | Audits *somebody else's* W3C or Figma tokens: `color.text.danger on surface.default is 2.99:1`. |
| `notugly chaos` | The content that breaks design systems — 60-character German nouns, Arabic, a 404ing image, 200% zoom. |

Plus a **[GitHub Action](action.yml)** that fails a PR on a contrast
regression, palettes from photographs, animated Slack stickers, and a decision
log so there's an answer in six months to *"why does it look like this"*.

<details>
<summary><b>There is also a small man who lives on the website</b></summary>

<br>

<p align="center">
  <img src="assets/readme/mascot.svg" alt="The notugly mascot in six moods" width="82%">
</p>

His eyes follow your cursor, he re-skins into whatever design you're looking at,
he's alarmed when you reroll, and if you ignore him for twenty-five seconds he
falls asleep. He is also, unavoidably, judging your contrast ratios.

</details>

<br>

## Five opinions

<p align="center">
  <img src="assets/readme/vibe-editorial.svg" width="19%" alt="Editorial">
  <img src="assets/readme/vibe-brutalist.svg" width="19%" alt="Brutalist">
  <img src="assets/readme/vibe-playful.svg" width="19%" alt="Playful">
  <img src="assets/readme/vibe-glassy.svg" width="19%" alt="Glassy">
  <img src="assets/readme/vibe-terminal.svg" width="19%" alt="Terminal">
</p>

Radius, shadow, saturation, type and motion have to agree or it looks like four
people built it — so they're decided together.
**[On the website the whole page becomes the vibe you click.](https://mohitagw15856.github.io/notugly)**
That's not a demo panel, that's the actual page.

<br>

## Bring your own brand

The commonest objection to any generator is *"this is lovely but our colour is
#E4002B and that is not negotiable"*. Fine:

```console
npx notugly --brand "#e4002b"
```

Your colour, used exactly as given. Everything else is built around it, and
**the audit still passes** — eighty brand-locked combinations are checked on
every commit.

<br>

## Then you take it

```console
$ npx notugly export --out ./ui

  notugly.css              2.7 kB      figma/manifest.json      162 B
  tailwind.config.js       3.5 kB      figma/code.js            3.8 kB
  tokens.json              4.9 kB      vscode/package.json      395 B
  notugly.jsx               710 B      vscode/…theme.json       3.3 kB
  Notugly.svelte            632 B      index.html               4.0 kB

  runtime cost  0 bytes
```

That last line is the point. It's all static text. No package, no provider, no
`<ThemeProvider>` wrapping your app, nothing to `npm install` at 3am when it
breaks. The Figma one is a **loadable plugin**, not a token file you then have
to find an importer for.

<br>

## Why it isn't just vibes

<table>
<tr><td width="190">

**Colour maths in OKLab**

</td><td>

In HSL, `#ffff00` and `#0000ff` are both "50% lightness". One is nine times
brighter. That's why generated ramps usually look cheap.

</td></tr>
<tr><td>

**Every claim has a test**

</td><td>

152 of them — including that the generated VS Code theme's syntax colours clear
4.5:1 in all ten vibe/mode combinations. An editor is the densest possible test
of a palette.

</td></tr>
<tr><td>

**Motion ships its own off switch**

</td><td>

Every preset comes with `prefers-reduced-motion` in the same file. Animation
without an escape hatch is a bug, not a flourish.

</td></tr>
<tr><td>

**No webfonts, nothing copied**

</td><td>

300 kB before anything renders is a tax, not a design system. Every colour,
shape, face and name is generated from a seed — no scraped assets, no lifted
palettes, no model calls.

</td></tr>
</table>

<br>

## As a library

```js
import { system, audit } from 'notugly';
import { avatar } from 'notugly/avatar';
import { persona, card } from 'notugly/persona';
import { fixContrast } from 'notugly/fix';

const ui = system('my-app', { vibe: 'playful', brand: '#e4002b' });
audit(ui).passed;                    // true. if it's false, that's my bug

avatar('mo', { on: ui.colour.bg });  // never invisible
card(persona('mo'));                 // a self-contained social card
fixContrast('#8ab4f8', '#ffffff');   // → #4f76b6, same hue, now readable
```

Same seed, same design, forever — so a design is a URL you can send someone,
and a user's face never changes because a server restarted.

<br>

## Used by

The design skills in
**[pm-claude-skills](https://github.com/mohitagw15856/pm-claude-skills)** call
this for their contrast numbers, and its MCP server exposes `check_contrast`.
That's the argument for the whole library in one line: **a skill can tell a
model to check the contrast, but only arithmetic can actually check it.**

<br>

<p align="center">
  <sub>
    MIT · zero dependencies · <a href="https://mohitagw15856.github.io/notugly">the fun version of this page</a>
  </sub>
</p>
