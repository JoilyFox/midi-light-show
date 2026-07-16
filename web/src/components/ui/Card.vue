<script setup lang="ts">
import { computed } from 'vue';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/lib/cn';

// Panel/card with an optional mono header. Uses tailwind-variants slots for multi-part styling.
const card = tv({
  slots: {
    root: 'bg-panel border border-line rounded-[13px] overflow-hidden',
    body: '',
  },
  variants: {
    padding: {
      none: { body: 'p-0' },
      sm: { body: 'p-3' },
      md: { body: 'p-[18px]' },
      lg: { body: 'p-6' },
    },
  },
  defaultVariants: { padding: 'md' },
});

type CardVariants = VariantProps<typeof card>;
const props = defineProps<{ padding?: CardVariants['padding']; title?: string; class?: string }>();
const styles = computed(() => card({ padding: props.padding }));
</script>

<template>
  <div :class="cn(styles.root(), props.class)">
    <div
      v-if="title || $slots.header"
      class="px-[18px] pt-4 pb-2 font-mono text-[11px] tracking-[.16em] uppercase text-text-mute border-b border-line-soft"
    >
      <slot name="header">{{ title }}</slot>
    </div>
    <div :class="styles.body()"><slot /></div>
  </div>
</template>
