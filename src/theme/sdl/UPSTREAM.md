# Vendored SDL tokens — DO NOT EDIT

These two files are byte-identical copies of the Sarva Design Language skill. The skill lives
outside the Vite root and is absent in CI, so importing it directly would break deploys.

| file | upstream | sha256 |
|---|---|---|
| design-tokens.json | `colorways/design-tokens.json` | `3f8cae2642e447ff` |
| viz-palettes.json | `dataviz/viz-palettes.json` | `ef38952ef8ac3fe1` |

- Upstream root: `~/.claude/skills/sarva-design-language`
- SDL version at vendor time: **v2.0.0-rc**
- Vendored: 2026-08-13

Run `npm run sdl:check` to diff against upstream at role level. It exits 0 when the skill
directory is absent, so CI never breaks.

## Deliberate deviations

Project-level overrides live in `src/theme/overrides.js`, each with a `reason`. Proposals go
to this repo's `sdl-notes.md`, never upstream — see the skill's EVOLUTION.md ritual.

Known upstream desync (resolved in favour of typography):
`design-tokens.json` gives Rose Dusk and Garden Dawn `font: "Gill Sans"`, but
`typography/SKILL.md` v1.1.0 — locked LATER, 2026-08-12 — records Gill Sans as REJECTED for
titles and assigns the washed pair Palatino. Typography owns typography, so the JSON's `font`
field is dropped entirely and title faces derive per-theme in `overrides.js`.
