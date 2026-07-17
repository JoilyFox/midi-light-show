<script setup lang="ts">
import { computed } from 'vue';
import { LayoutGrid, SlidersHorizontal, Cable, Activity, Palette, Power } from '@lucide/vue';
import { useRoute, navigate, type Route } from '@/lib/router';
import { useShow, targetsOf } from '@/lib/store';
import { api } from '@/lib/api';
import { toastOk, toastError } from '@/lib/toast';
import NavButton from '@/components/ui/NavButton.vue';
import StatusDot from '@/components/ui/StatusDot.vue';
import Chip from '@/components/ui/Chip.vue';
import Button from '@/components/ui/Button.vue';

const { route } = useRoute();
const show = useShow();

const nav: { id: Route; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'rig', label: 'RIG', icon: LayoutGrid },
  { id: 'play', label: 'PLAY', icon: SlidersHorizontal },
  { id: 'map', label: 'MAP', icon: Cable },
  { id: 'log', label: 'LOG', icon: Activity },
];

const routeLabel = computed(
  () =>
    nav.find((n) => n.id === route.value)?.label ??
    (route.value === 'components' ? 'COMPONENTS' : ''),
);

async function blackout() {
  try {
    const ips = [...new Set(targetsOf('*').map((f) => f.ip))];
    await Promise.all(ips.map((ip) => api.setState(ip, { on: false })));
    toastOk(`Blackout — ${ips.length} fixture${ips.length === 1 ? '' : 's'} off`);
  } catch (e) {
    toastError((e as Error).message);
  }
}
</script>

<template>
  <div class="flex h-full min-h-0">
    <!-- left rail -->
    <nav
      class="w-[68px] shrink-0 flex flex-col items-center gap-1 py-4 border-r border-line bg-ink-2/60"
    >
      <div
        class="w-9 h-9 mb-3 rounded-[11px] grid place-items-center bg-gradient-to-b from-filament to-filament-deep shadow-[0_6px_18px_-6px_rgba(255,178,92,.6)]"
        title="MIDI Light Show"
      >
        <span class="text-[18px] leading-none">💡</span>
      </div>
      <NavButton
        v-for="n in nav"
        :key="n.id"
        :icon="n.icon"
        :label="n.label"
        :active="route === n.id"
        @click="navigate(n.id)"
      />
      <div class="mt-auto">
        <NavButton
          :icon="Palette"
          label="UI"
          :active="route === 'components'"
          @click="navigate('components')"
        />
      </div>
    </nav>

    <!-- main column -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- global status bar -->
      <header
        class="h-13 shrink-0 flex items-center gap-3 px-5 border-b border-line bg-panel/40 backdrop-blur"
      >
        <span class="font-mono text-[11px] tracking-[.24em] text-filament">{{ routeLabel }}</span>
        <div class="ml-auto flex items-center gap-3">
          <span class="hidden sm:flex items-center gap-2 text-[12px] text-text-dim">
            <StatusDot :state="show.connected ? 'online' : 'offline'" />
            {{ show.connected ? 'engine live' : 'engine offline' }}
          </span>
          <Chip :tone="show.midiCurrent ? 'filament' : 'default'" size="sm">
            {{ show.midiCurrent ?? 'no MIDI' }}
          </Chip>
          <Button variant="danger" size="sm" :icon="Power" @click="blackout">Blackout</Button>
        </div>
      </header>

      <!-- screen content -->
      <main class="flex-1 min-h-0 overflow-y-auto"><slot /></main>
    </div>
  </div>
</template>

<style scoped>
.h-13 {
  height: 52px;
}
</style>
