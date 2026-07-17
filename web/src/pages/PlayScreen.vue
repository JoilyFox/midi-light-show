<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Power, Zap } from '@lucide/vue';
import {
  useShow,
  loadInventory,
  loadMappings,
  loadLive,
  refreshReachability,
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
const target = ref<'all' | string>('all');

const brightness = ref(80);
const hex = ref('#FFB25C');
const temp = ref(3200);

const targetFixtures = computed<Fixture[]>(() => {
  const byNum = (a: Fixture, b: Fixture) => a.number - b.number;
  if (target.value === 'all') return [...show.fixtures].sort(byNum);
  if (target.value.startsWith('grp_')) {
    const g = show.groups.find((x) => x.id === target.value);
    const ids = new Set(g?.fixtureIds ?? []);
    return show.fixtures.filter((f) => ids.has(f.id)).sort(byNum);
  }
  const f = show.fixtures.find((x) => x.id === target.value);
  return f ? [f] : [];
});
const targetIps = computed(() => [...new Set(targetFixtures.value.map((f) => f.ip))]);
const targetLabel = computed(() => {
  if (target.value === 'all') return 'all fixtures';
  if (target.value.startsWith('grp_'))
    return show.groups.find((g) => g.id === target.value)?.name ?? 'group';
  return show.fixtures.find((f) => f.id === target.value)?.name ?? 'fixture';
});
const isTargeted = (f: Fixture) => targetFixtures.value.some((t) => t.id === f.id);

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

// When the target changes, seed the controls from the first target's live state.
watch(
  target,
  () => {
    const first = targetFixtures.value[0];
    const live = first ? liveFor(first.ip) : undefined;
    if (live) {
      brightness.value = Math.round(live.brightness) || brightness.value;
      if (live.color) hex.value = rgbToHex(live.color);
    }
  },
  { immediate: false },
);

onMounted(async () => {
  try {
    await Promise.all([loadInventory(), loadMappings(), loadLive()]);
    void refreshReachability();
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
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <GroupChip :active="target === 'all'" :count="show.fixtures.length" @click="target = 'all'"
        >All</GroupChip
      >
      <GroupChip
        v-for="g in show.groups"
        :key="g.id"
        :active="target === g.id"
        :count="g.fixtureIds.length"
        @click="target = g.id"
      >
        {{ g.name }}
      </GroupChip>
    </div>

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
      <div v-if="targetFixtures.length || show.fixtures.length">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-4">
          <button
            v-for="f in [...show.fixtures].sort((a, b) => a.number - b.number)"
            :key="f.id"
            class="text-left rounded-[15px] transition-shadow"
            :class="isTargeted(f) ? 'ring-2 ring-filament ring-offset-2 ring-offset-ink' : ''"
            @click="target = f.id"
          >
            <FixtureTile
              :number="f.number"
              :name="f.name"
              :color="tileColor(f)"
              :brightness="tileBright(f)"
              :midi="midiLabelFor(f.id)"
              :online="isOnline(f.ip)"
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
