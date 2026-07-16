<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Zap, SlidersHorizontal, Search, Trash2 } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import Chip from '@/components/ui/Chip.vue';
import GroupChip from '@/components/ui/GroupChip.vue';
import StatusDot from '@/components/ui/StatusDot.vue';
import Card from '@/components/ui/Card.vue';
import Fader from '@/components/ui/Fader.vue';
import FixtureTile from '@/components/ui/FixtureTile.vue';

type Rig = {
  number: number;
  name: string;
  color: string;
  brightness: number;
  midi: string;
  online?: boolean;
  on?: boolean;
};
const rig: Rig[] = [
  { number: 1, name: 'Stage Left', color: '#FF9E3D', brightness: 0.95, midi: 'CH1 · N60' },
  { number: 2, name: 'Stage Right', color: '#35D0E0', brightness: 0.8, midi: 'CH1 · N62' },
  { number: 3, name: 'Backdrop', color: '#E85CC4', brightness: 0.38, midi: 'CH1 · N64' },
  { number: 4, name: 'Drum Riser', color: '#3B6BFF', brightness: 0.88, midi: 'CH2 · N36' },
  { number: 5, name: 'Ceiling Wash', color: '#4FD86A', brightness: 0, midi: 'CH1 · CC20', on: false },
  { number: 6, name: 'Front Fill', color: '#FFE7C4', brightness: 0.7, midi: 'CH1 · N67', online: false },
];

const pulsing = ref(false);
function pulseRig() {
  pulsing.value = true;
  window.setTimeout(() => (pulsing.value = false), 380);
}

const swatches: [string, string][] = [
  ['ink', '#0F1013'],
  ['panel', '#15171C'],
  ['panel-3', '#23272F'],
  ['line', '#2A2E37'],
  ['text', '#ECEEF1'],
  ['filament', '#FFB25C'],
  ['online', '#57D9A3'],
  ['danger', '#FF6B6B'],
];
</script>

<template>
  <div class="mx-auto max-w-[1100px] px-6 py-12 flex flex-col gap-12">
    <!-- identity -->
    <header>
      <p class="font-mono text-[11px] tracking-[.28em] uppercase text-filament">Design system · Filament</p>
      <h1 class="mt-3 text-[40px] font-semibold tracking-[-.02em] leading-none">Component library</h1>
      <p class="mt-4 max-w-[60ch] text-text-dim">
        Prop-driven Vue components with Tailwind encapsulated inside them. Compose the UI from these —
        <code class="font-mono text-filament text-[13px]">&lt;Button variant="primary" size="lg"&gt;</code> —
        with almost no utility classes in app code.
      </p>
    </header>

    <!-- buttons -->
    <Card title="Button — variant × size">
      <div class="flex flex-col gap-5">
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="primary" :icon="Plus">Add lamp</Button>
          <Button variant="secondary" :icon="Search">Discover</Button>
          <Button variant="ghost" :icon="Zap">Pulse rig</Button>
          <Button variant="danger" :icon="Trash2">Blackout</Button>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="ghost" size="sm" icon-only :icon="Plus" aria-label="add" />
          <Button variant="ghost" size="md" icon-only :icon="SlidersHorizontal" aria-label="controls" />
          <Button variant="ghost" size="lg" icon-only :icon="Zap" aria-label="pulse" />
          <Button variant="secondary" disabled>Disabled</Button>
        </div>
      </div>
    </Card>

    <!-- chips + dots -->
    <Card title="Chip · GroupChip · StatusDot">
      <div class="flex flex-col gap-5">
        <div class="flex flex-wrap items-center gap-3">
          <Chip>CH1 · N60</Chip>
          <Chip size="sm">CH2 · N36</Chip>
          <Chip tone="filament">ARMED</Chip>
          <span class="flex items-center gap-2 text-[13px] text-text-dim"><StatusDot state="online" /> online</span>
          <span class="flex items-center gap-2 text-[13px] text-text-dim"><StatusDot state="offline" /> offline</span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <GroupChip active :count="6">All</GroupChip>
          <GroupChip :count="2">Front</GroupChip>
          <GroupChip :count="2">Back</GroupChip>
          <GroupChip :count="1">Drums</GroupChip>
        </div>
      </div>
    </Card>

    <!-- fixture tiles + fader -->
    <Card title="FixtureTile (the signature) · Fader">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start">
        <div>
          <div class="mb-4">
            <Button variant="ghost" :icon="Zap" @click="pulseRig">Pulse rig</Button>
          </div>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
            <FixtureTile
              v-for="f in rig"
              :key="f.number"
              :number="f.number"
              :name="f.name"
              :color="f.color"
              :brightness="f.brightness"
              :midi="f.midi"
              :online="f.online"
              :on="f.on"
              :pulse="pulsing && f.online !== false"
            />
          </div>
        </div>
        <Fader :value="78" label="percent" />
      </div>
    </Card>

    <!-- tokens -->
    <Card title="Color tokens">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div v-for="[name, hex] in swatches" :key="name" class="flex items-center gap-3">
          <span
            class="w-7 h-7 rounded-[7px] border border-white/10 shrink-0"
            :style="{ background: hex }"
          />
          <div class="min-w-0">
            <div class="text-[12.5px] font-medium truncate">{{ name }}</div>
            <div class="font-mono text-[11px] text-text-mute">{{ hex }}</div>
          </div>
        </div>
      </div>
    </Card>

    <p class="text-center text-text-mute text-[12.5px]">
      Filament · the design system implemented in Vue 3 + Vite + Tailwind v4.
    </p>
  </div>
</template>
