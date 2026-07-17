<script setup lang="ts">
// Placeholder — manual per-fixture / per-group control lands in Phase 5.
import { SlidersHorizontal } from '@lucide/vue';
import ScreenHeader from '@/components/console/ScreenHeader.vue';
import Icon from '@/components/ui/Icon.vue';
</script>

<template>
  <div class="mx-auto max-w-[1180px] px-6 py-8">
    <ScreenHeader title="Play" subtitle="Manual control — fixtures, groups, color, brightness" />
    <div
      class="rounded-[14px] border border-dashed border-line py-16 flex flex-col items-center gap-3 text-text-mute"
    >
      <Icon :icon="SlidersHorizontal" :size="30" />
      <p class="text-text-dim">Manual control arrives in Phase 5.</p>
    </div>
  </div>
</template>
