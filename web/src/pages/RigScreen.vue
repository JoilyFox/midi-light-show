<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Radar, ScanLine, Pencil, Boxes } from '@lucide/vue';
import {
  useShow,
  loadInventory,
  loadMappings,
  refreshReachability,
  midiLabelFor,
  isOnline,
  liveFor,
} from '@/lib/store';
import { api } from '@/lib/api';
import { toastOk, toastError } from '@/lib/toast';
import type { Fixture } from '@/types';
import ScreenHeader from '@/components/console/ScreenHeader.vue';
import FixtureFormModal from '@/components/console/FixtureFormModal.vue';
import GroupsModal from '@/components/console/GroupsModal.vue';
import FixtureTile from '@/components/ui/FixtureTile.vue';
import Button from '@/components/ui/Button.vue';
import GroupChip from '@/components/ui/GroupChip.vue';
import Icon from '@/components/ui/Icon.vue';

const show = useShow();
const discovering = ref(false);
const selected = ref<'all' | string>('all');
const formOpen = ref(false);
const editing = ref<Fixture | null>(null);
const groupsOpen = ref(false);

const filtered = computed(() => {
  if (selected.value === 'all') return [...show.fixtures].sort((a, b) => a.number - b.number);
  const g = show.groups.find((x) => x.id === selected.value);
  const ids = new Set(g?.fixtureIds ?? []);
  return show.fixtures.filter((f) => ids.has(f.id)).sort((a, b) => a.number - b.number);
});

const nextNumber = computed(() =>
  show.fixtures.length ? Math.max(...show.fixtures.map((f) => f.number)) + 1 : 1,
);

function tileColor(f: Fixture): string {
  const c = liveFor(f.ip)?.color;
  return c ? `rgb(${c.r},${c.g},${c.b})` : '#FFB25C';
}
function tileBrightness(f: Fixture): number {
  return (liveFor(f.ip)?.brightness ?? 0) / 100;
}

onMounted(async () => {
  try {
    await Promise.all([loadInventory(), loadMappings()]);
    void refreshReachability();
  } catch (e) {
    toastError((e as Error).message);
  }
});

async function discover() {
  discovering.value = true;
  try {
    const { added } = await api.discoverFixtures();
    await loadInventory();
    void refreshReachability();
    toastOk(
      added
        ? `Discovered — ${added} new fixture${added === 1 ? '' : 's'}`
        : 'Discovery — no new fixtures',
    );
  } catch (e) {
    toastError((e as Error).message);
  } finally {
    discovering.value = false;
  }
}

function openAdd() {
  editing.value = null;
  formOpen.value = true;
}
function openEdit(f: Fixture) {
  editing.value = f;
  formOpen.value = true;
}

async function identify(f: Fixture) {
  try {
    await api.identifyFixture(f.id);
    toastOk(`Blinking “${f.name}”`);
  } catch (e) {
    toastError((e as Error).message);
  }
}

async function saveFixture(v: {
  id: string | null;
  name: string;
  ip: string;
  number: number;
  groupIds: string[];
}) {
  try {
    const id =
      v.id ?? (await api.addFixture({ name: v.name, ip: v.ip, number: v.number })).fixture.id;
    if (v.id) await api.updateFixture(v.id, { name: v.name, ip: v.ip, number: v.number });
    // reconcile group membership
    await Promise.all(
      show.groups.map((g) => {
        const should = v.groupIds.includes(g.id);
        const has = g.fixtureIds.includes(id);
        if (should === has) return null;
        const fixtureIds = should ? [...g.fixtureIds, id] : g.fixtureIds.filter((x) => x !== id);
        return api.updateGroup(g.id, { fixtureIds });
      }),
    );
    await loadInventory();
    formOpen.value = false;
    toastOk(v.id ? 'Fixture saved' : 'Fixture added');
  } catch (e) {
    toastError((e as Error).message);
  }
}

async function removeFixture(id: string) {
  try {
    await api.deleteFixture(id);
    await loadInventory();
    formOpen.value = false;
    toastOk('Fixture removed');
  } catch (e) {
    toastError((e as Error).message);
  }
}

async function createGroup(name: string) {
  try {
    await api.addGroup({ name });
    await loadInventory();
    toastOk('Group created');
  } catch (e) {
    toastError((e as Error).message);
  }
}
async function renameGroup(p: { id: string; name: string }) {
  try {
    await api.updateGroup(p.id, { name: p.name });
    await loadInventory();
    toastOk('Group renamed');
  } catch (e) {
    toastError((e as Error).message);
  }
}
async function removeGroup(id: string) {
  try {
    await api.deleteGroup(id);
    if (selected.value === id) selected.value = 'all';
    await loadInventory();
    toastOk('Group deleted');
  } catch (e) {
    toastError((e as Error).message);
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1180px] px-6 py-8">
    <ScreenHeader
      title="Rig"
      :subtitle="`${show.fixtures.length} fixture${show.fixtures.length === 1 ? '' : 's'} · ${show.groups.length} group${show.groups.length === 1 ? '' : 's'}`"
    >
      <template #actions>
        <Button variant="secondary" :icon="Radar" :loading="discovering" @click="discover">
          {{ discovering ? 'Scanning…' : 'Discover' }}
        </Button>
        <Button variant="primary" :icon="Plus" @click="openAdd">Add fixture</Button>
      </template>
    </ScreenHeader>

    <!-- group filter -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <GroupChip
        :active="selected === 'all'"
        :count="show.fixtures.length"
        @click="selected = 'all'"
        >All</GroupChip
      >
      <GroupChip
        v-for="g in show.groups"
        :key="g.id"
        :active="selected === g.id"
        :count="g.fixtureIds.length"
        @click="selected = g.id"
      >
        {{ g.name }}
      </GroupChip>
      <Button variant="ghost" size="sm" :icon="Boxes" @click="groupsOpen = true">Groups</Button>
    </div>

    <!-- grid -->
    <div v-if="filtered.length" class="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-4">
      <div v-for="f in filtered" :key="f.id" class="relative group/tile">
        <FixtureTile
          :number="f.number"
          :name="f.name"
          :color="tileColor(f)"
          :brightness="tileBrightness(f)"
          :midi="midiLabelFor(f.id)"
          :online="isOnline(f.ip)"
          @click="openEdit(f)"
        />
        <!-- hover actions (siblings of the clipped tile so they can overflow) -->
        <div
          class="absolute top-2.5 right-8 flex gap-1 opacity-0 group-hover/tile:opacity-100 transition-opacity"
        >
          <button
            class="w-7 h-7 grid place-items-center rounded-[7px] bg-panel-3/90 border border-line text-text-dim hover:text-filament backdrop-blur"
            title="Blink to identify"
            @click.stop="identify(f)"
          >
            <Icon :icon="ScanLine" :size="14" />
          </button>
          <button
            class="w-7 h-7 grid place-items-center rounded-[7px] bg-panel-3/90 border border-line text-text-dim hover:text-text backdrop-blur"
            title="Edit"
            @click.stop="openEdit(f)"
          >
            <Icon :icon="Pencil" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- empty state -->
    <div
      v-else
      class="rounded-[14px] border border-dashed border-line py-16 flex flex-col items-center gap-3 text-center"
    >
      <Icon :icon="Boxes" :size="30" class="text-text-mute" />
      <p class="text-text-dim">
        {{ selected === 'all' ? 'No fixtures yet.' : 'No fixtures in this group.' }}
      </p>
      <div v-if="selected === 'all'" class="flex gap-2">
        <Button variant="secondary" :icon="Radar" :loading="discovering" @click="discover"
          >Discover on LAN</Button
        >
        <Button variant="primary" :icon="Plus" @click="openAdd">Add manually</Button>
      </div>
    </div>

    <FixtureFormModal
      :open="formOpen"
      :fixture="editing"
      :groups="show.groups"
      :next-number="nextNumber"
      @close="formOpen = false"
      @save="saveFixture"
      @remove="removeFixture"
    />
    <GroupsModal
      :open="groupsOpen"
      :groups="show.groups"
      @close="groupsOpen = false"
      @create="createGroup"
      @rename="renameGroup"
      @remove="removeGroup"
    />
  </div>
</template>
