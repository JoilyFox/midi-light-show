---
id: fixture-inventory
title: Fixture inventory & groups
category: 02-engine
tags: [cat/engine, fixtures, config, api]
status: current
code: [src/engine/inventory.ts, src/engine/types.ts, src/engine/showEngine.ts, src/server.ts, src/drivers/wiz.ts]
prerequisites: []
see_also: ["[[mapping-engine]]", "[[fixture-driver-interface]]", "[[wiz-driver]]"]
source_ids: [qlc-plus]
added: 2026-07-17
updated: 2026-07-18
---

# Fixture inventory & groups

> The persisted list of fixtures (stable id, rig number, name, IP) plus named groups — and the rule that resolves a mapping's target reference into fixture IP(s).

## What it is
A small database, embedded in `config/show.json`, of the lamps the show knows about. Each
**fixture** has a stable `id` (independent of its IP), a human `number` (the tile label), a `name`,
an `ip`, an optional `mac`, and a `driver` (`'wiz'` today). **Groups** are named sets of fixture ids
for group control and group-targeted mappings. This is the QLC+-style "patch": identity lives in the
inventory, and everything else (mappings, manual control) refers to fixtures **by id**, never by address.

## How it works
- **Model** — `InventoryFixture` / `Group` / `ShowConfig.fixtures[] / .groups[]` in `src/engine/types.ts`.
- **Pure helpers** — `src/engine/inventory.ts` owns id generation (`fx_…` / `grp_…`), CRUD on the
  config arrays, and `resolveTargets(config, ref)`:
  - `ref` starts `grp_` → every member fixture's IP (deduped)
  - `ref` matches a fixture id → that fixture's IP
  - `ref` looks like an IP → used as-is (back-compat with pre-inventory configs)
  - `ref` is `'*'`/empty → every inventory IP
- **Engine** — `ShowEngine` exposes `getInventory / addFixture / updateFixture / removeFixture /
  addGroup / updateGroup / removeGroup / discoverAndMerge / identify`, each persisting via `save()`.
  `execute()` targets fixtures through `resolveTargets`, so one mapping can drive a single lamp,
  a whole group, or all lamps.
- **Network scan** — `driver.scan()` (in `wiz.ts`) does the thorough discovery the Add-fixture flow uses:
  it **broadcasts AND unicasts getPilot to every host in the local /24(s)**, keeps only addresses that
  answer the WiZ protocol (the "only bulbs" filter), and enriches each with module name + live pilot
  state (on/brightness/color/temp) for preview. Returned by `GET /api/scan` — read-only, no inventory change.
- **Discovery merge** — `discoverAndMerge()` broadcasts on the LAN and upserts responders into the
  inventory, matching first by `mac` (durable) then by `ip` (refreshing the address on a DHCP move).
- **Identify** — `blinkIp(ip)` flashes a lamp white three times **then restores its prior state** (so
  identifying doesn't leave a bulb off). `identify(id)` blinks a known fixture; `identifyIp(ip)` blinks
  any address — used from the discovery list to locate a bulb *before* adding it.
- **API** — `src/server.ts`: `GET/POST /api/fixtures`, `POST /api/fixtures/discover`, `GET /api/scan`,
  `POST /api/identify {ip}`, `PUT/DELETE /api/fixtures/:id`, `POST /api/fixtures/:id/identify`, and
  `POST/PUT/DELETE /api/groups`. The **Rig → Discover** modal (`web/DiscoverModal.vue`) drives scan +
  per-bulb blink + add.

## Key decisions & why
- **Id, not IP, is identity.** WiFi bulbs move on DHCP; binding mappings to the address would break the
  show whenever the router reassigns a lease. The id is stable; `discoverAndMerge` keeps the IP fresh.
- **One self-describing `fixture` string on a mapping** (id / `grp_…` / IP / `*`) instead of a
  `{ kind, ref }` pair — resolution reads the prefix, and old IP-based configs keep working untouched.
- **Migration is automatic and idempotent.** `migrateLegacyConfig` runs once (guarded on
  `fixtures === undefined`): it seeds fixtures from the distinct IPs referenced by existing mappings and
  rewrites those mappings to the new ids, so upgrading an old `show.json` needs no manual edit.

## Gotchas
- Deleting a fixture strips it from every group's `fixtureIds`, but does **not** delete mappings that
  targeted it — those simply resolve to `[]` (do nothing) until re-pointed. Intentional: a mapping is
  cheap to keep and re-target.
- `resolveTargets` returns `[]` for an unknown ref; the engine only falls back to `knownFixtures`
  (last discovery result) for a `'*'`/empty ref when the inventory is empty.

## Status & TODO
- Done: model, CRUD API, discovery-merge, identify-blink, legacy migration — verified end-to-end.
- TODO: expose per-fixture driver selection in the API once a second driver (WLED) exists.

## See also
- [[mapping-engine]] — consumes `resolveTargets` to pick which fixtures an event drives
- [[fixture-driver-interface]] — the `driver` field points at one of these output adapters
- [[wiz-driver]] — the only driver today; discovery/identify go through it

## Sources
- `qlc-plus` — the two-layer fixture/patch identity model this borrows from
