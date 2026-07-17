<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Trash2, Radio } from '@lucide/vue';
import { useShow, loadMidiPorts, clearMidiLog } from '@/lib/store';
import { api } from '@/lib/api';
import { toastOk, toastError } from '@/lib/toast';
import ScreenHeader from '@/components/console/ScreenHeader.vue';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Select from '@/components/ui/Select.vue';
import StatusDot from '@/components/ui/StatusDot.vue';

const show = useShow();

const portOptions = computed(() => [
  { value: -1, label: show.midiPorts.length ? 'Select a MIDI port…' : 'No MIDI ports found' },
  ...show.midiPorts.map((p, i) => ({ value: i, label: p })),
]);
const currentIndex = computed(() => show.midiPorts.indexOf(show.midiCurrent ?? ''));

async function onSelectPort(index: number) {
  if (index < 0) return;
  try {
    await api.selectMidiPort(index);
    await loadMidiPorts();
    toastOk(`Listening on ${show.midiCurrent}`);
  } catch (e) {
    toastError((e as Error).message);
  }
}

const badge = {
  noteOn: {
    label: 'NOTE ON',
    cls: 'text-filament border-[color:rgba(255,178,92,.35)] bg-[rgba(255,178,92,.1)]',
  },
  noteOff: { label: 'NOTE OFF', cls: 'text-text-mute border-line bg-ink-2' },
  cc: {
    label: 'CC',
    cls: 'text-online border-[color:rgba(87,217,163,.3)] bg-[rgba(87,217,163,.08)]',
  },
} as const;

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('en-GB', { hour12: false }) +
  '.' +
  String(t % 1000).padStart(3, '0');

onMounted(() => void loadMidiPorts());
</script>

<template>
  <div class="mx-auto max-w-[1180px] px-6 py-8">
    <ScreenHeader
      title="Log"
      subtitle="Live MIDI monitor — pick the port your DAW sends to (macOS IAC)"
    >
      <template #actions>
        <Button
          variant="ghost"
          size="sm"
          :icon="Trash2"
          :disabled="!show.midiLog.length"
          @click="clearMidiLog"
        >
          Clear
        </Button>
      </template>
    </ScreenHeader>

    <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
      <Card title="MIDI input">
        <div class="flex flex-col gap-4">
          <Select
            :model-value="currentIndex"
            :options="portOptions"
            label="Port"
            @update:model-value="onSelectPort"
          />
          <div class="flex items-center gap-2 text-[13px] text-text-dim">
            <StatusDot :state="show.connected ? 'online' : 'offline'" />
            {{ show.connected ? 'stream connected' : 'stream offline' }}
          </div>
          <p class="text-[12.5px] text-text-mute leading-relaxed">
            Enable the <span class="text-text-dim">IAC Driver</span> in Audio MIDI Setup, point your
            DAW's MIDI output at it, then pick it here. Events appear live on the right.
          </p>
        </div>
      </Card>

      <Card title="Monitor" padding="none">
        <div v-if="show.midiLog.length" class="max-h-[62vh] overflow-y-auto">
          <table class="w-full text-[13px]">
            <thead class="sticky top-0 bg-panel/95 backdrop-blur text-text-mute">
              <tr class="text-left font-mono text-[10.5px] tracking-[.12em] uppercase">
                <th class="px-4 py-2 font-medium">Time</th>
                <th class="px-2 py-2 font-medium">Type</th>
                <th class="px-2 py-2 font-medium text-right">Ch</th>
                <th class="px-2 py-2 font-medium text-right">No.</th>
                <th class="px-2 py-2 font-medium text-right">Val</th>
                <th class="px-4 py-2 font-medium w-[30%]">Level</th>
              </tr>
            </thead>
            <tbody class="font-mono tabular-nums">
              <tr v-for="e in show.midiLog" :key="e.seq" class="border-t border-line-soft">
                <td class="px-4 py-1.5 text-text-mute text-[11.5px]">{{ fmtTime(e.t) }}</td>
                <td class="px-2 py-1.5">
                  <span
                    class="inline-block px-1.5 py-0.5 rounded-[5px] border text-[10px]"
                    :class="badge[e.kind].cls"
                  >
                    {{ badge[e.kind].label }}
                  </span>
                </td>
                <td class="px-2 py-1.5 text-right text-text-dim">{{ e.channel + 1 }}</td>
                <td class="px-2 py-1.5 text-right text-text">{{ e.number }}</td>
                <td class="px-2 py-1.5 text-right text-text">{{ e.value }}</td>
                <td class="px-4 py-1.5">
                  <span class="block h-1.5 rounded-full bg-line overflow-hidden">
                    <span
                      class="block h-full bg-filament"
                      :style="{ width: (e.value / 127) * 100 + '%' }"
                    />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-16 flex flex-col items-center gap-3 text-text-mute">
          <Radio :size="28" />
          <p class="text-text-dim">Waiting for MIDI… play a note or move a control in your DAW.</p>
        </div>
      </Card>
    </div>
  </div>
</template>
