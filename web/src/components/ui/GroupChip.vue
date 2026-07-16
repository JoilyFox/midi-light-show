<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/cn';

// The Rig group filter pill (All / Front / Back / Drums …).
const props = defineProps<{ active?: boolean; count?: number; class?: string }>();
const classes = computed(() =>
  cn(
    'inline-flex items-center gap-1.5 text-[12.5px] rounded-full border px-3 py-1.5 cursor-pointer transition-colors',
    props.active
      ? 'bg-[rgba(255,178,92,.12)] border-[color:rgba(255,178,92,.35)] text-filament'
      : 'bg-panel border-line text-text-dim hover:text-text',
    props.class,
  ),
);
</script>

<template>
  <span :class="classes">
    <slot />
    <span v-if="count != null" class="font-mono text-[11px] opacity-60 tabular-nums">{{ count }}</span>
  </span>
</template>
