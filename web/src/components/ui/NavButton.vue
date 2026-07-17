<script setup lang="ts">
import { computed, type FunctionalComponent } from 'vue';
import { cn } from '@/lib/cn';
import Icon from './Icon.vue';

// A left-rail navigation item (icon + tiny label).
const props = defineProps<{
  icon: FunctionalComponent;
  label: string;
  active?: boolean;
  class?: string;
}>();
const classes = computed(() =>
  cn(
    'w-12 h-12 flex flex-col items-center justify-center gap-0.5 rounded-[11px] bg-transparent border-0 cursor-pointer transition-colors text-[9px] tracking-wide',
    props.active
      ? 'text-filament bg-[rgba(255,178,92,.10)]'
      : 'text-text-mute hover:text-text-dim hover:bg-panel',
    props.class,
  ),
);
</script>

<template>
  <button :class="classes" :aria-current="active ? 'page' : undefined">
    <Icon :icon="icon" :size="20" />
    <span>{{ label }}</span>
  </button>
</template>
