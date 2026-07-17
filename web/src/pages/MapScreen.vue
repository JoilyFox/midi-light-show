<script setup lang="ts">
// Placeholder — MIDI mapping editor lands in Phase 6.
import { Cable } from '@lucide/vue';
import ScreenHeader from '@/components/console/ScreenHeader.vue';
import Icon from '@/components/ui/Icon.vue';
</script>

<template>
  <div class="mx-auto max-w-[1180px] px-6 py-8">
    <ScreenHeader title="Map" subtitle="MIDI → light mappings, MIDI-Learn" />
    <div
      class="rounded-[14px] border border-dashed border-line py-16 flex flex-col items-center gap-3 text-text-mute"
    >
      <Icon :icon="Cable" :size="30" />
      <p class="text-text-dim">The mapping editor arrives in Phase 6.</p>
    </div>
  </div>
</template>
