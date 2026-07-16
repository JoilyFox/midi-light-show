<script setup lang="ts">
import { computed } from 'vue';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/lib/cn';

// Mono data chip — e.g. a fixture's MIDI assignment "CH1 · N60".
const chip = tv({
  base: 'inline-flex items-center font-mono whitespace-nowrap border rounded-[6px] tabular-nums',
  variants: {
    tone: {
      default: 'bg-[#0f1114] border-line text-text-dim',
      filament: 'bg-[rgba(255,178,92,.12)] border-[color:rgba(255,178,92,.35)] text-filament',
    },
    size: {
      sm: 'text-[10.5px] px-1.5 py-0.5',
      md: 'text-xs px-2 py-1',
    },
  },
  defaultVariants: { tone: 'default', size: 'md' },
});

type ChipVariants = VariantProps<typeof chip>;
const props = defineProps<{ tone?: ChipVariants['tone']; size?: ChipVariants['size']; class?: string }>();
const classes = computed(() => cn(chip({ tone: props.tone, size: props.size }), props.class));
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
