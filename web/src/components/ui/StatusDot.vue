<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/cn';

// Reachability indicator. State is encoded in fill (not color alone) — a11y-friendly.
const props = defineProps<{ state?: 'online' | 'offline'; class?: string }>();
const classes = computed(() =>
  cn(
    'inline-block w-2 h-2 rounded-full',
    props.state === 'offline' ? 'bg-offline' : 'bg-online shadow-[0_0_8px_rgba(87,217,163,.7)]',
    props.class,
  ),
);
</script>

<template>
  <span :class="classes" :aria-label="state === 'offline' ? 'offline' : 'online'" role="img" />
</template>
