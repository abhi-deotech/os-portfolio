# Folder games

Drop-in games for the Game Center. Anything in here is served as a static file and hosted in a
sandboxed iframe — no build step, no bundler, no server.

## Adding one

Create `public/games/<slug>/`:

```
public/games/my-game/
  game.json     required
  index.html    required — the entry point
  cover.webp    optional — 40 KB max
  LICENSE       required unless the game is your own original work
```

Then regenerate the index:

```bash
npm run games:sync
```

This is wired into `npm run build`, so a deploy can't ship an index that disagrees with what is
on disk. It has to be generated rather than discovered at runtime because the app is statically
hosted — `netlify.toml` publishes `dist`, `render.yaml` is `type: static`, and there is no
serverless function anywhere in the repo that could enumerate a directory.

## game.json

```json
{
  "id": "my-game",
  "title": "My Game",
  "tagline": "One line, under about 48 characters.",
  "genre": "arcade",
  "icon": "Gamepad2",
  "hue": 210,
  "controls": { "keys": ["←", "→"], "touch": "tap", "desc": "Arrows to move, tap to fire." },
  "window": { "width": 800, "height": 700 },
  "credit": { "author": "You", "url": "https://…", "license": "MIT" }
}
```

- `id` — lowercase kebab-case, unique across every game including the built-ins.
- `genre` — one of `arcade`, `puzzle`, `logic`, `quiz`.
- `icon` — any [lucide](https://lucide.dev) export name.
- `hue` — an OKLCH hue angle in `[0, 360)`. **Not a colour.** The active colorway supplies chroma
  and lightness, which is why a tile can't end up off-theme. Same contract as `src/config/apps.jsx`.
- `credit.license` — use `"original"` if you wrote it; otherwise the SPDX id, and ship the
  matching `LICENSE` file. `games:sync` fails the build if you declare a license without one.

`games:sync` validates all of this and exits non-zero on any problem. A silently skipped game is
worse than a failed build — it looks like the convention is broken.

## Writing the game

`index.html` loads from a real URL, so relative paths work normally:

```html
<script src="game.js"></script>
<img src="sprites.png">
```

It runs with `sandbox="allow-scripts"` and **no** `allow-same-origin`, so the document has an
opaque origin. In practice:

- `localStorage`, `sessionStorage`, `indexedDB` and `document.cookie` all **throw**. Keep state in
  memory. (Games sideloaded by a visitor get an in-memory shim; folder games do not, so handle it.)
- You cannot reach `parent`, and nothing in the OS can be read or written.
- Network requests are subject to the app's CSP.

To surface a score in the shell header:

```js
window.lumina && window.lumina.score(myScore);
```

That API is injected only for sideloaded games. For a folder game, guard the call as above — it's
a no-op when absent.

## Currently vendored

| Game | Author | License | Source |
|---|---|---|---|
| Bubble Shooter | Rembound | MIT | [rembound/Bubble-Shooter-HTML5](https://github.com/rembound/Bubble-Shooter-HTML5) |
| Match 3 | Rembound | MIT | [rembound/Match-3-Game-HTML5](https://github.com/rembound/Match-3-Game-HTML5) |
| Tetris | Dionysis Zindros | MIT | [dionyziz/canvas-tetris](https://github.com/dionyziz/canvas-tetris) |

Each keeps its upstream `LICENSE` file, and the attribution shows on the game's tile.

Licenses were verified against the GitHub licenses API before vendoring. Two popular candidates
were **rejected** on licence grounds and should not be added: `hextris` and `clumsy-bird` are both
GPL-3.0, which would be incompatible here. `js13kGames` entries default to all-rights-reserved
unless the individual entry says otherwise — check each one.
