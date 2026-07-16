<script setup lang="ts">
import type { FunctionalComponent } from 'vue';

// Thin wrapper over @lucide/vue icons for consistent sizing/stroke across the app.
defineProps<{ icon: FunctionalComponent; size?: number; strokeWidth?: number }>();
</script>

<template>
  <component :is="icon" :size="size ?? 16" :stroke-width="strokeWidth ?? 1.8" />
</template>
