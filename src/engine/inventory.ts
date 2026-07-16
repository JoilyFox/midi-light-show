/**
 * Fixture inventory — the persisted list of fixtures + groups, and the logic that
 * resolves a mapping's target reference (id / group id / raw IP / '*') into IP(s).
 *
 * The inventory lives inside ShowConfig (config/show.json). These are pure helpers that
 * read/mutate the config's `fixtures` / `groups` arrays; ShowEngine owns persistence.
 *
 * Design (see docs/DECISIONS.md · docs/concepts/06-fixtures/):
 *  - A fixture's `id` is stable and IP-independent — WiFi bulbs move on DHCP, so mappings
 *    target the id, not the address. `mac` is the durable hardware identity for re-matching.
 *  - Group ids are prefixed `grp_`, fixture ids `fx_`, so a single mapping.fixture string is
 *    self-describing and resolution never needs a "kind" field.
 */

import type { Group, InventoryFixture, ShowConfig } from './types';

let counter = 0;
/** Short, collision-resistant id. Not a UUID — inventory is small and single-user. */
function uid(prefix: string): string {
  counter = (counter + 1) % 0xffff;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}
export const newFixtureId = () => uid('fx_');
export const newGroupId = () => uid('grp_');

const IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
export const looksLikeIp = (s: string) => IP_RE.test(s);

/** Fixtures array, always defined. */
export const fixturesOf = (c: ShowConfig): InventoryFixture[] => (c.fixtures ??= []);
/** Groups array, always defined. */
export const groupsOf = (c: ShowConfig): Group[] => (c.groups ??= []);

/** Every distinct fixture IP in the inventory — the '*' fallback target set. */
export const allIps = (c: ShowConfig): string[] => [...new Set(fixturesOf(c).map((f) => f.ip))];

/**
 * Resolve a mapping target reference to a list of fixture IPs.
 *   fixture id → [ip] · group id → member ips · raw ip → [ip] · '*'/'' → all inventory ips.
 * Unknown refs resolve to [] (mapping simply does nothing) rather than throwing.
 */
export function resolveTargets(c: ShowConfig, ref: string): string[] {
  if (!ref || ref === '*') return allIps(c);
  if (ref.startsWith('grp_')) {
    const g = groupsOf(c).find((x) => x.id === ref);
    if (!g) return [];
    const byId = new Map(fixturesOf(c).map((f) => [f.id, f.ip]));
    return [...new Set(g.fixtureIds.map((id) => byId.get(id)).filter((ip): ip is string => !!ip))];
  }
  const f = fixturesOf(c).find((x) => x.id === ref);
  if (f) return [f.ip];
  if (looksLikeIp(ref)) return [ref];
  return [];
}

/** Next free rig number (max + 1, starting at 1). */
export function nextNumber(c: ShowConfig): number {
  const nums = fixturesOf(c).map((f) => f.number);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

export function addFixture(
  c: ShowConfig,
  input: { name?: string; ip: string; number?: number; mac?: string; driver?: 'wiz' },
): InventoryFixture {
  const fx: InventoryFixture = {
    id: newFixtureId(),
    name: input.name?.trim() || `Fixture ${input.ip}`,
    number: input.number ?? nextNumber(c),
    ip: input.ip,
    driver: input.driver ?? 'wiz',
    ...(input.mac ? { mac: input.mac } : {}),
  };
  fixturesOf(c).push(fx);
  return fx;
}

export function updateFixture(
  c: ShowConfig,
  id: string,
  patch: Partial<Pick<InventoryFixture, 'name' | 'ip' | 'number' | 'mac'>>,
): InventoryFixture | null {
  const fx = fixturesOf(c).find((f) => f.id === id);
  if (!fx) return null;
  if (patch.name !== undefined) fx.name = patch.name.trim() || fx.name;
  if (patch.ip !== undefined) fx.ip = patch.ip;
  if (patch.number !== undefined) fx.number = patch.number;
  if (patch.mac !== undefined) fx.mac = patch.mac;
  return fx;
}

/** Remove a fixture and strip it from any group's member list. */
export function removeFixture(c: ShowConfig, id: string): boolean {
  const list = fixturesOf(c);
  const i = list.findIndex((f) => f.id === id);
  if (i < 0) return false;
  list.splice(i, 1);
  for (const g of groupsOf(c)) g.fixtureIds = g.fixtureIds.filter((fid) => fid !== id);
  return true;
}

export function addGroup(c: ShowConfig, input: { name?: string; fixtureIds?: string[] }): Group {
  const g: Group = {
    id: newGroupId(),
    name: input.name?.trim() || 'Group',
    fixtureIds: dedupeKnown(c, input.fixtureIds ?? []),
  };
  groupsOf(c).push(g);
  return g;
}

export function updateGroup(
  c: ShowConfig,
  id: string,
  patch: { name?: string; fixtureIds?: string[] },
): Group | null {
  const g = groupsOf(c).find((x) => x.id === id);
  if (!g) return null;
  if (patch.name !== undefined) g.name = patch.name.trim() || g.name;
  if (patch.fixtureIds !== undefined) g.fixtureIds = dedupeKnown(c, patch.fixtureIds);
  return g;
}

export function removeGroup(c: ShowConfig, id: string): boolean {
  const list = groupsOf(c);
  const i = list.findIndex((g) => g.id === id);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

/** Keep only fixture ids that exist, de-duplicated, order preserved. */
function dedupeKnown(c: ShowConfig, ids: string[]): string[] {
  const known = new Set(fixturesOf(c).map((f) => f.id));
  return [...new Set(ids)].filter((id) => known.has(id));
}

/**
 * One-time migration for configs written before the inventory existed: seed `fixtures`
 * from the distinct IPs referenced by mappings, and rewrite each mapping's `fixture` IP
 * to the new stable fixture id. Idempotent — only runs when `fixtures` is absent.
 * Returns true if it changed anything (caller should persist).
 */
export function migrateLegacyConfig(c: ShowConfig): boolean {
  if (c.fixtures !== undefined) return false;
  c.fixtures = [];
  c.groups ??= [];
  const ipToId = new Map<string, string>();
  for (const m of c.mappings) {
    const ref = m.fixture;
    if (!ref || ref === '*' || !looksLikeIp(ref)) continue;
    let id = ipToId.get(ref);
    if (!id) {
      id = addFixture(c, { ip: ref, name: `Fixture ${ref}` }).id;
      ipToId.set(ref, id);
    }
    m.fixture = id;
  }
  return true;
}
