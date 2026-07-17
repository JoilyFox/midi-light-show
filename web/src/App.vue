<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from '@/lib/router';
import {
  loadInventory,
  loadMappings,
  loadMidiPorts,
  loadLive,
  hydrateLive,
  startLivePolling,
  stopLivePolling,
  connectStream,
  disconnectStream,
} from '@/lib/store';
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
  connectStream(); // one SSE connection for the whole app
  // Warm the store so cross-screen actions (e.g. shell Blackout) work before visiting a screen.
  void loadInventory().then(() => hydrateLive()); // real on/off/colour + reachability
  void loadMappings();
  void loadMidiPorts();
  void loadLive();
  startLivePolling(); // keep tile status + reachability current
});
onBeforeUnmount(() => {
  disconnectStream();
  stopLivePolling();
});
</script>

<template>
  <ConsoleShell>
    <component :is="current" />
  </ConsoleShell>
  <ToastHost />
</template>
