# Sources index

Registry of sources cited by concept notes (via `source_ids`). Cite by `id`, never paste a raw URL or a
secret into a note's frontmatter. Format: `` `id` · **Title** · what it covers · location``.

## In-repo design & process
- `filament-mockup` · **Filament UI mockup** · the clickable reference implementation of the design system (Rig/Map/Play/Log + token reference) · Claude artifact (session deliverable), source at `scratchpad/filament-design.html`
- `research-md` · **docs/RESEARCH.md** · WiZ/latency findings; WiZ = scenes, WLED/DMX = tight sync · repo
- `decisions-md` · **docs/DECISIONS.md** · running ADR log of non-obvious choices · repo
- `runbook-md` · **docs/RUNBOOK.md** · run/restart, tools, Ableton-socket method, gotchas · repo
- `midi-bridge-md` · **docs/MIDI-BRIDGE.md** · bridge best-practices + roadmap · repo

## External — lighting / show control (from the 2026-07 deep-research pass)
- `qlcplus-features` · **QLC+ features & fixture model** · two-layer fixture (definition vs instance), id-based identity, output plugins · https://www.qlcplus.org/discover/features
- `qlcplus-glossary` · **QLC+ glossary & concepts** · name/address not used for internal identity · https://docs.qlcplus.org/v4/basics/glossary-and-concepts
- `ofl-fixture-format` · **Open Fixture Library — fixture format** · channels defined once, modes reference them · https://github.com/OpenLightingProject/open-fixture-library/blob/master/docs/fixture-format.md
- `ableton-link` · **Ableton Link** · beat/tempo/phase sync, quantum, host-clock based · https://ableton.github.io/link/
- `pywizlight` · **pywizlight** · WiZ local UDP API; no built-in rate limiter → caller must coalesce · https://github.com/sbidy/pywizlight

## External — frontend stack (Phase 2)
- `tailwind-theme` · **Tailwind CSS v4 — theme variables** · `@theme` CSS-first design tokens → utilities + CSS vars · https://tailwindcss.com/docs/theme
- `tailwind-v4` · **Tailwind CSS v4 announcement** · CSS-first config, OKLCH palette · https://tailwindcss.com/blog/tailwindcss-v4
- `cva` · **class-variance-authority** · type-safe prop→variant class mapping · https://joe-bell-cva-85.mintlify.app/
- `tailwind-variants` · **Tailwind Variants** · variants + slots + built-in tailwind-merge · https://www.tailwind-variants.org/
