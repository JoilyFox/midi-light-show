<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/cn';

// Vertical brightness/level fader — chunky, live, mono value. Display component (wire input in Phase 3).
const props = defineProps<{ value: number; min?: number; max?: number; label?: string; class?: string }>();
const pct = computed(() => {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  return Math.max(0, Math.min(100, ((props.value - min) / (max - min)) * 100));
});
</script>

<template>
  <div :class="cn('flex flex-col items-center gap-3', props.class)">
    <div class="relative w-3 h-[230px] rounded-full bg-[#0d0f12] border border-line overflow-hidden">
      <div
        class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-filament-deep to-filament shadow-[0_0_16px_rgba(255,178,92,.5)]"
        :style="{ height: pct + '%' }"
      />
      <div
        class="absolute left-1/2 w-[30px] h-3.5 rounded-[5px] bg-gradient-to-b from-[#eceef1] to-[#aeb4bd] -translate-x-1/2 translate-y-1/2 shadow-[0_3px_8px_rgba(0,0,0,.6)]"
        :style="{ bottom: pct + '%' }"
      />
    </div>
    <div class="font-mono text-[26px] font-semibold tabular-nums leading-none">{{ value }}</div>
    <div v-if="label" class="font-mono text-[10px] tracking-[.14em] uppercase text-text-mute">
      {{ label }}
    </div>
  </div>
</template>
