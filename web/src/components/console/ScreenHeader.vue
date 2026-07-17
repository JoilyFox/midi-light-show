<script setup lang="ts">
// Per-screen toolbar: big title + optional subtitle on the left, actions slot on the right.
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div>
      <h1 class="text-[26px] font-semibold tracking-[-.02em] leading-none">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1.5 text-[13.5px] text-text-dim">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-2"><slot name="actions" /></div>
  </div>
</template>
