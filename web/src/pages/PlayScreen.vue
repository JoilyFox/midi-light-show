<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Power, Zap } from '@lucide/vue';
import {
  useShow,
  loadInventory,
  loadMappings,
  loadLive,
  hydrateLive,
  midiLabelFor,
  isOnline,
  liveFor,
} from '@/lib/store';
import { api } from '@/lib/api';
import { throttle } from '@/lib/throttle';
import { toastError } from '@/lib/toast';
import type { Fixture } from '@/types';
import ScreenHeader from '@/components/console/ScreenHeader.vue';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Slider from '@/components/ui/Slider.vue';
import GroupChip from '@/components/ui/GroupChip.vue';
import FixtureTile from '@/components/ui/FixtureTile.vue';

const show = useShow();

// The controls act on whichever fixtures are selected. Chips set the selection to
// all / a group; a plain tile click selects just that one; shift-click adds/removes.
const selected = ref<Set<string>>(new Set());

const brightness = ref(80);
const hex = ref('#FFB25C');
const temp = ref(3200);

const allFixtures = computed(() => [...show.fixtures].sort((a, b) => a.number - b.number));
const targetFixtures = computed(() => allFixtures.value.filter((f) => selected.value.has(f.id)));
const targetIps = computed(() => [...new Set(targetFixtures.value.map((f) => f.ip))]);

const allActive = computed(
  () => show.fixtures.length > 0 && selected.value.size === show.fixtures.length,
);
function groupActive(g: { fixtureIds: string[] }): boolean {
  return (
    g.fixtureIds.length > 0 &&
    selected.value.size === g.fixtureIds.length &&
    g.fixtureIds.every((id) => selected.value.has(id))
  );
}
const targetLabel = computed(() => {
  if (allActive.value) return 'all fixtures';
  const g = show.groups.find((x) => groupActive(x));
  if (g) return g.name;
  if (selected.value.size === 1) {
    const f = targetFixtures.value[0];
    return f ? f.name : '1 fixture';
  }
  return `${selected.value.size} selected`;
});
const isSelected = (f: Fixture) => selected.value.has(f.id);

function selectAll() {
  selected.value = new Set(show.fixtures.map((f) => f.id));
}
function selectGroup(g: { fixtureIds: string[] }) {
  const known = new Set(show.fixtures.map((f) => f.id));
  selected.value = new Set(g.fixtureIds.filter((id) => known.has(id)));
}
function onTileClick(f: Fixture, e: MouseEvent) {
  if (e.shiftKey) {
    const next = new Set(selected.value);
    next.has(f.id) ? next.delete(f.id) : next.add(f.id); // toggle in/out of the multi-selection
    selected.value = next;
  } else {
    selected.value = new Set([f.id]);
  }
}

function hexToRgb(h: string) {
  const n = parseInt(h.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
const rgbToHex = (c: { r: number; g: number; b: number }) =>
  '#' + [c.r, c.g, c.b].map((x) => x.toString(16).padStart(2, '0')).join('');

function send(state: Record<string, unknown>) {
  targetIps.value.forEach((ip) =>
    api.setState(ip, state).catch((e) => toastError((e as Error).message)),
  );
}
const sendBrightness = throttle((v: number) => send({ brightness: v }), 55);
const sendColor = throttle((h: string) => send(hexToRgb(h)), 55);
const sendTemp = throttle((v: number) => send({ temp: v }), 55);

function onBrightness(v: number) {
  brightness.value = v;
  sendBrightness(v);
}
function onColor(h: string) {
  hex.value = h;
  sendColor(h);
}
function onTemp(v: number) {
  temp.value = v;
  sendTemp(v);
}
const powerOn = () => send({ on: true, brightness: brightness.value });
const powerOff = () => send({ on: false });
function flash() {
  send({ on: true, brightness: 100 });
  window.setTimeout(() => send({ on: false }), 240);
}

const presets = [
  '#FFB25C',
  '#FF5C5C',
  '#FF9E3D',
  '#4FD86A',
  '#35D0E0',
  '#3B6BFF',
  '#E85CC4',
  '#FFFFFF',
];

function tileColor(f: Fixture): string {
  const c = liveFor(f.ip)?.color;
  return c ? `rgb(${c.r},${c.g},${c.b})` : '#FFB25C';
}
const tileBright = (f: Fixture) => (liveFor(f.ip)?.brightness ?? 0) / 100;

// When the selection changes, seed the controls from the first selected fixture's live state.
watch(
  () => [...selected.value][0],
  () => {
    const first = targetFixtures.value[0];
    const live = first ? liveFor(first.ip) : undefined;
    if (live) {
      brightness.value = Math.round(live.brightness) || brightness.value;
      if (live.color) hex.value = rgbToHex(live.color);
    }
  },
);

onMounted(async () => {
  try {
    await Promise.all([loadInventory(), loadMappings(), loadLive()]);
    selectAll(); // start with everything selected
    void hydrateLive();
  } catch (e) {
    toastError((e as Error).message);
  }
});
</script>

<template>
  <div class="mx-auto max-w-[1180px] px-6 py-8">
    <ScreenHeader
      title="Play"
      :subtitle="`Manual control → ${targetLabel} · ${targetIps.length} fixture${targetIps.length === 1 ? '' : 's'}`"
    />

    <!-- target scope -->
    <div class="flex flex-wrap items-center gap-2 mb-2">
      <GroupChip :active="allActive" :count="show.fixtures.length" @click="selectAll"
        >All</GroupChip
      >
      <GroupChip
        v-for="g in show.groups"
        :key="g.id"
        :active="groupActive(g)"
        :count="g.fixtureIds.length"
        @click="selectGroup(g)"
      >
        {{ g.name }}
      </GroupChip>
    </div>
    <p class="text-[12px] text-text-mute mb-6">
      Click a lamp to control just it · <kbd class="font-mono text-text-dim">Shift</kbd>-click to
      select several.
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
      <!-- control panel -->
      <Card title="Control">
        <div class="flex flex-col gap-6">
          <div class="flex gap-2">
            <Button variant="primary" :icon="Power" class="flex-1" @click="powerOn">On</Button>
            <Button variant="ghost" :icon="Power" class="flex-1" @click="powerOff">Off</Button>
            <Button variant="ghost" :icon="Zap" @click="flash" aria-label="Flash">Flash</Button>
          </div>

          <Slider
            :model-value="brightness"
            label="Brightness"
            unit="%"
            :accent="hex"
            @update:model-value="onBrightness"
          />

          <div class="flex flex-col gap-2">
            <span class="font-mono text-[10.5px] tracking-[.14em] uppercase text-text-mute"
              >Color</span
            >
            <div class="flex items-center gap-3">
              <input
                type="color"
                :value="hex"
                class="w-12 h-10 rounded-[9px] bg-transparent border border-line cursor-pointer p-0"
                @input="onColor(($event.target as HTMLInputElement).value)"
              />
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="p in presets"
                  :key="p"
                  class="w-6 h-6 rounded-[6px] border border-white/10 cursor-pointer transition-transform hover:scale-110"
                  :style="{ background: p }"
                  :aria-label="p"
                  @click="onColor(p)"
                />
              </div>
            </div>
          </div>

          <Slider
            :model-value="temp"
            label="White temp"
            unit="K"
            :min="2200"
            :max="6500"
            :step="100"
            @update:model-value="onTemp"
          />
        </div>
      </Card>

      <!-- live fixtures -->
      <div v-if="allFixtures.length">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-4">
          <button
            v-for="f in allFixtures"
            :key="f.id"
            class="text-left rounded-[15px] transition-shadow"
            :class="isSelected(f) ? 'ring-2 ring-filament ring-offset-2 ring-offset-ink' : ''"
            @click="onTileClick(f, $event)"
          >
            <FixtureTile
              :number="f.number"
              :name="f.name"
              :color="tileColor(f)"
              :brightness="tileBright(f)"
              :midi="midiLabelFor(f.id)"
              :online="isOnline(f.ip)"
              :on="liveFor(f.ip)?.on"
            />
          </button>
        </div>
      </div>
      <div
        v-else
        class="rounded-[14px] border border-dashed border-line py-16 flex items-center justify-center text-text-mute"
      >
        No fixtures — add some on the Rig screen.
      </div>
    </div>
  </div>
</template>
