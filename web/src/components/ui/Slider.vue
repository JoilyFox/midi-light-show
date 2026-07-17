<script setup lang="ts">
import { computed } from 'vue';

// Horizontal range with an amber fill and a mono value readout. v-model as number.
const props = defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  accent?: string; // override fill (e.g. a live color)
}>();
const emit = defineEmits<{ 'update:modelValue': [number]; change: [number] }>();

const min = computed(() => props.min ?? 0);
const max = computed(() => props.max ?? 100);
const pct = computed(() => ((props.modelValue - min.value) / (max.value - min.value)) * 100);
const fill = computed(() => props.accent ?? 'var(--color-filament)');

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).valueAsNumber);
}
function onChange(e: Event) {
  emit('change', (e.target as HTMLInputElement).valueAsNumber);
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div v-if="label || unit" class="flex items-baseline justify-between">
      <span class="font-mono text-[10.5px] tracking-[.14em] uppercase text-text-mute">{{
        label
      }}</span>
      <span class="font-mono text-[15px] tabular-nums text-text"
        >{{ Math.round(modelValue)
        }}<span class="text-text-mute text-[11px] ml-0.5">{{ unit }}</span></span
      >
    </div>
    <input
      type="range"
      class="slider"
      :min="min"
      :max="max"
      :step="step ?? 1"
      :value="modelValue"
      :style="{ '--pct': pct + '%', '--fill': fill }"
      @input="onInput"
      @change="onChange"
    />
  </div>
</template>

<style scoped>
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--fill) 0%,
    var(--fill) var(--pct),
    #0d0f12 var(--pct),
    #0d0f12 100%
  );
  border: 1px solid var(--color-line);
  cursor: pointer;
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(180deg, #eceef1, #aeb4bd);
  border: 1px solid #7f858e;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(180deg, #eceef1, #aeb4bd);
  border: 1px solid #7f858e;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}
.slider:focus-visible {
  border-color: var(--color-filament);
}
</style>
