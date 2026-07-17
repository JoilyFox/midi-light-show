<script setup lang="ts">
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue';
import { Radio, Trash2 } from '@lucide/vue';
import type { Fixture, Group, Mapping } from '@/types';
import { useShow } from '@/lib/store';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import TextInput from '@/components/ui/TextInput.vue';
import Select from '@/components/ui/Select.vue';
import Toggle from '@/components/ui/Toggle.vue';

const props = defineProps<{
  open: boolean;
  mapping: Mapping | null;
  fixtures: Fixture[];
  groups: Group[];
}>();
const emit = defineEmits<{ close: []; save: [Mapping]; remove: [string] }>();

const show = useShow();
const learning = ref(false);
const confirmDelete = ref(false);

// A fully-populated edit model — every field required (no casts needed in v-model targets).
// Enum-ish fields are typed as string for friction-free <Select>; the boundary cast is in save().
interface EditModel {
  id: string;
  enabled: boolean;
  label: string;
  match: { kind: string; channel: number | null; number: number | null };
  fixture: string;
  action: string;
  trigger: string;
  direction: string;
  targetSource: string;
  target: number;
  durationSource: string;
  durationCc: number;
  durationFixedValue: number;
  msPerUnit: number;
  curve: string;
  attackMs: number;
  releaseMs: number;
  colorMode: string;
  fixedColor: { r: number; g: number; b: number };
  min: number;
  max: number;
}

function blank(): EditModel {
  return {
    id: 'map_' + Date.now().toString(36),
    enabled: true,
    label: '',
    match: { kind: 'noteOn', channel: null, number: null },
    fixture: '*',
    action: 'pulse',
    trigger: 'press',
    direction: 'in',
    targetSource: 'velocity',
    target: 100,
    durationSource: 'fixed',
    durationCc: 0,
    durationFixedValue: 100,
    msPerUnit: 10,
    curve: 'easeOut',
    attackMs: 40,
    releaseMs: 800,
    colorMode: 'hueFromValue',
    fixedColor: { r: 255, g: 178, b: 92 },
    min: 0,
    max: 100,
  };
}

const m = reactive<EditModel>(blank());

watch(
  () => props.open,
  (open) => {
    if (!open) {
      learning.value = false;
      return;
    }
    confirmDelete.value = false;
    Object.assign(m, blank(), props.mapping ? structuredClone(props.mapping) : {});
    if (m.action === 'temp' && props.mapping && props.mapping.min == null) {
      m.min = 2200;
      m.max = 6500;
    }
  },
);

// ---- MIDI-Learn: capture the next incoming event into the match ----
watch(
  () => show.lastMidi,
  (ev) => {
    if (!learning.value || !ev) return;
    m.match.kind = ev.kind;
    m.match.channel = ev.channel;
    m.match.number = ev.number;
    learning.value = false;
  },
);
onBeforeUnmount(() => (learning.value = false));

const channelSel = computed<number>({
  get: () => m.match.channel ?? -1,
  set: (v) => (m.match.channel = v < 0 ? null : v),
});
const numberModel = computed<number>({
  get: () => m.match.number ?? 0,
  set: (v) => (m.match.number = Number(v)),
});
const anyNumber = computed<boolean>({
  get: () => m.match.number == null,
  set: (v) => (m.match.number = v ? null : 0),
});
const fixedHex = computed<string>({
  get: () =>
    '#' +
    [m.fixedColor.r, m.fixedColor.g, m.fixedColor.b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join(''),
  set: (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    m.fixedColor = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
});

const kindOptions = [
  { value: 'noteOn', label: 'Note On' },
  { value: 'noteOff', label: 'Note Off' },
  { value: 'cc', label: 'Control Change (CC)' },
];
const channelOptions = [
  { value: -1, label: 'Any' },
  ...Array.from({ length: 16 }, (_, i) => ({ value: i, label: `Ch ${i + 1}` })),
];
const actionOptions = [
  { value: 'pulse', label: 'Pulse (flash + decay)' },
  { value: 'fade', label: 'Fade' },
  { value: 'toggle', label: 'Toggle on/off' },
  { value: 'brightness', label: 'Brightness (from value)' },
  { value: 'color', label: 'Color' },
  { value: 'temp', label: 'White temp (from value)' },
];
const triggerOptions = computed(() =>
  m.match.kind === 'cc'
    ? [
        { value: 'press', label: 'Press (value ≥ 64)' },
        { value: 'release', label: 'Release (value < 64)' },
        { value: 'change', label: 'On any change' },
      ]
    : [
        { value: 'press', label: 'On note press' },
        { value: 'release', label: 'On note release' },
      ],
);
const curveOptions = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease in' },
  { value: 'easeOut', label: 'Ease out' },
];
const targetOptions = computed(() => [
  { value: '*', label: 'All fixtures' },
  ...props.groups.map((g) => ({ value: g.id, label: `Group · ${g.name}` })),
  ...[...props.fixtures]
    .sort((a, b) => a.number - b.number)
    .map((f) => ({ value: f.id, label: `${f.number} · ${f.name}` })),
]);
const srcVelFixed = [
  { value: 'fixed', label: 'Fixed %' },
  { value: 'velocity', label: 'Note velocity' },
];
const durationOptions = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'value', label: 'This event value' },
  { value: 'cc', label: 'Another CC' },
];

const numberLabel = computed(() => (m.match.kind === 'cc' ? 'CC number' : 'Note number'));
const title = computed(() => (props.mapping ? 'Edit mapping' : 'New mapping'));

function save() {
  emit('save', JSON.parse(JSON.stringify(m)) as Mapping);
}
</script>

<template>
  <Modal :open="open" :title="title" :width="560" @close="emit('close')">
    <div class="flex flex-col gap-5">
      <TextInput v-model="m.label" label="Label" placeholder="e.g. Kick → flash Drum Riser" />

      <!-- trigger / match -->
      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10.5px] tracking-[.16em] uppercase text-text-mute"
            >When this MIDI arrives</span
          >
          <Button
            :variant="learning ? 'primary' : 'ghost'"
            size="sm"
            :icon="Radio"
            @click="learning = !learning"
          >
            {{ learning ? 'Listening…' : 'Learn' }}
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Select v-model="m.match.kind" :options="kindOptions" label="Type" />
          <Select v-model="channelSel" :options="channelOptions" label="Channel" mono />
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-3 items-end">
          <TextInput
            v-if="!anyNumber"
            v-model="numberModel"
            :label="numberLabel"
            type="number"
            :min="0"
            :max="127"
            mono
          />
          <div v-else class="text-[13px] text-text-mute pb-2.5">
            Matches any {{ m.match.kind === 'cc' ? 'CC' : 'note' }} number
          </div>
          <label class="flex items-center gap-2 pb-2.5 text-[12.5px] text-text-dim"
            ><Toggle v-model="anyNumber" /> Any</label
          >
        </div>
        <Select v-model="m.trigger" :options="triggerOptions" label="Fire on" />
      </section>

      <Select v-model="m.fixture" :options="targetOptions" label="Target" />
      <Select v-model="m.action" :options="actionOptions" label="Action" />

      <!-- per-action options -->
      <section class="rounded-[11px] border border-line-soft bg-ink-2/40 p-4 flex flex-col gap-3">
        <template v-if="m.action === 'pulse'">
          <Select
            v-model="m.targetSource"
            label="Peak from"
            :options="[
              { value: 'velocity', label: 'Note velocity' },
              { value: 'fixed', label: 'Fixed %' },
            ]"
          />
          <TextInput
            v-if="m.targetSource === 'fixed'"
            v-model="m.target"
            label="Peak %"
            type="number"
            :min="0"
            :max="100"
            mono
          />
          <div class="grid grid-cols-2 gap-3">
            <TextInput v-model="m.attackMs" label="Attack ms" type="number" :min="0" mono />
            <TextInput v-model="m.releaseMs" label="Release ms" type="number" :min="0" mono />
          </div>
          <Select v-model="m.curve" :options="curveOptions" label="Release curve" />
        </template>

        <template v-else-if="m.action === 'fade'">
          <Select
            v-model="m.direction"
            label="Direction"
            :options="[
              { value: 'in', label: 'Fade in' },
              { value: 'out', label: 'Fade out' },
            ]"
          />
          <template v-if="m.direction !== 'out'">
            <Select v-model="m.targetSource" label="Target from" :options="srcVelFixed" />
            <TextInput
              v-if="m.targetSource !== 'velocity'"
              v-model="m.target"
              label="Target %"
              type="number"
              :min="0"
              :max="100"
              mono
            />
          </template>
          <Select v-model="m.durationSource" label="Duration from" :options="durationOptions" />
          <div class="grid grid-cols-2 gap-3">
            <TextInput v-model="m.msPerUnit" label="ms / unit" type="number" :min="1" mono />
            <TextInput
              v-if="m.durationSource === 'fixed'"
              v-model="m.durationFixedValue"
              label="Value (0–127)"
              type="number"
              :min="0"
              :max="127"
              mono
            />
            <TextInput
              v-else-if="m.durationSource === 'cc'"
              v-model="m.durationCc"
              label="Duration CC #"
              type="number"
              :min="0"
              :max="127"
              mono
            />
          </div>
          <Select v-model="m.curve" :options="curveOptions" label="Curve" />
        </template>

        <template v-else-if="m.action === 'toggle'">
          <Select v-model="m.targetSource" label="On-level from" :options="srcVelFixed" />
          <TextInput
            v-if="m.targetSource !== 'velocity'"
            v-model="m.target"
            label="On %"
            type="number"
            :min="0"
            :max="100"
            mono
          />
          <TextInput v-model="m.msPerUnit" label="ms / unit" type="number" :min="1" mono />
        </template>

        <template v-else-if="m.action === 'brightness'">
          <div class="grid grid-cols-2 gap-3">
            <TextInput v-model="m.min" label="Min %" type="number" :min="0" :max="100" mono />
            <TextInput v-model="m.max" label="Max %" type="number" :min="0" :max="100" mono />
          </div>
          <p class="text-[12px] text-text-mute">
            MIDI value 0–127 maps into this brightness range.
          </p>
        </template>

        <template v-else-if="m.action === 'temp'">
          <div class="grid grid-cols-2 gap-3">
            <TextInput v-model="m.min" label="Min K" type="number" :min="2200" :max="6500" mono />
            <TextInput v-model="m.max" label="Max K" type="number" :min="2200" :max="6500" mono />
          </div>
        </template>

        <template v-else-if="m.action === 'color'">
          <Select
            v-model="m.colorMode"
            label="Color from"
            :options="[
              { value: 'hueFromValue', label: 'Hue from MIDI value' },
              { value: 'fixed', label: 'Fixed color' },
            ]"
          />
          <label v-if="m.colorMode === 'fixed'" class="flex items-center gap-3">
            <input
              type="color"
              v-model="fixedHex"
              class="w-12 h-10 rounded-[9px] bg-transparent border border-line cursor-pointer p-0"
            />
            <span class="font-mono text-[13px] text-text-dim">{{ fixedHex }}</span>
          </label>
        </template>
      </section>
    </div>

    <template #footer>
      <Button
        v-if="mapping"
        :variant="confirmDelete ? 'danger' : 'ghost'"
        size="sm"
        :icon="Trash2"
        class="mr-auto"
        @click="confirmDelete ? emit('remove', mapping.id) : (confirmDelete = true)"
      >
        {{ confirmDelete ? 'Confirm delete' : 'Delete' }}
      </Button>
      <Button variant="ghost" @click="emit('close')">Cancel</Button>
      <Button variant="primary" @click="save">{{ mapping ? 'Save' : 'Add mapping' }}</Button>
    </template>
  </Modal>
</template>
