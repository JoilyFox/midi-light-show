<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from '@/lib/router';
import { loadMidiPorts, connectStream, disconnectStream } from '@/lib/store';
import ConsoleShell from '@/components/console/ConsoleShell.vue';
import ToastHost from '@/components/ui/ToastHost.vue';
import RigScreen from '@/pages/RigScreen.vue';
import PlayScreen from '@/pages/PlayScreen.vue';
import MapScreen from '@/pages/MapScreen.vue';
import LogScreen from '@/pages/LogScreen.vue';
import Showcase from '@/pages/Showcase.vue';

const { route } = useRoute();
const screens = {
  rig: RigScreen,
  play: PlayScreen,
  map: MapScreen,
  log: LogScreen,
  components: Showcase,
} as const;
const current = computed(() => screens[route.value]);

onMounted(() => {
  void loadMidiPorts();
  connectStream();
});
onBeforeUnmount(() => disconnectStream());
</script>

<template>
  <ConsoleShell>
    <component :is="current" />
  </ConsoleShell>
  <ToastHost />
</template>
