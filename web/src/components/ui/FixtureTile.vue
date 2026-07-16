<script setup lang="ts">
import { computed } from 'vue';
import Chip from './Chip.vue';
import StatusDot from './StatusDot.vue';

// The signature component: a lamp tile that emits its live color, scaled by brightness, and blooms on pulse.
// See docs/concepts/04-design-system/glowing-fixture-tile.md
const props = defineProps<{
  number: number | string;
  name: string;
  color: string;
  brightness: number; // 0..1
  midi?: string;
  online?: boolean;
  on?: boolean;
  pulse?: boolean;
}>();

const level = computed(() => (props.on === false ? 0 : Math.max(0, Math.min(1, props.brightness))));
const pctLabel = computed(() =>
  props.online === false ? '—' : props.on === false ? 'Off' : `${Math.round(level.value * 100)}%`,
);
const styleVars = computed(() => ({ '--c': props.color, '--b': String(level.value) }));
</script>

<template>
  <div
    class="tile"
    :class="{ off: on === false, offline: online === false, pulse: pulse }"
    :style="styleVars"
  >
    <div class="flex items-center justify-between">
      <span class="font-mono text-[22px] font-semibold tabular-nums leading-none">{{ number }}</span>
      <StatusDot :state="online === false ? 'offline' : 'online'" />
    </div>
    <div class="bulb" aria-hidden="true" />
    <div class="mt-auto text-[14.5px] font-semibold tracking-[-.01em]">{{ name }}</div>
    <div class="flex items-center justify-between gap-2">
      <Chip size="sm">{{ midi ?? '—' }}</Chip>
      <span class="font-mono text-xs text-text-dim tabular-nums">{{ pctLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.tile {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 11px;
  min-height: 168px;
  padding: 15px;
  cursor: pointer;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--color-panel-2), var(--color-panel));
  transition:
    border-color 0.18s,
    transform 0.18s;
}
.tile:hover {
  border-color: #3b414c;
  transform: translateY(-2px);
}
.tile::before {
  content: '';
  position: absolute;
  z-index: -1;
  left: 50%;
  top: 44%;
  width: 180px;
  height: 180px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, var(--c) 0%, transparent 60%);
  opacity: calc(0.08 + var(--b) * 0.4);
  filter: blur(3px);
  transition: opacity 0.55s ease;
}
.tile.pulse::before {
  opacity: 1;
}
.tile.off::before {
  opacity: 0.03;
}
.tile.offline {
  opacity: 0.5;
}
.bulb {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 33%, #fff 0%, var(--c) 55%, color-mix(in srgb, var(--c) 62%, #000) 100%);
  box-shadow:
    0 0 calc(5px + var(--b) * 30px) color-mix(in srgb, var(--c) 85%, transparent),
    inset 0 -3px 6px rgba(0, 0, 0, 0.35),
    inset 0 2px 5px rgba(255, 255, 255, 0.55);
  transition: box-shadow 0.5s;
}
.tile.off .bulb {
  background: radial-gradient(circle at 38% 33%, #444a53, #23272f 90%);
  box-shadow: inset 0 -2px 5px rgba(0, 0, 0, 0.4);
}
</style>
