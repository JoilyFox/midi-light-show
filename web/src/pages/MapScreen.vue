<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Plus, Pencil, Copy } from '@lucide/vue';
import { useShow, loadInventory, loadMappings, loadMidiPorts } from '@/lib/store';
import { api } from '@/lib/api';
import { toastOk, toastError } from '@/lib/toast';
import type { Mapping } from '@/types';
import ScreenHeader from '@/components/console/ScreenHeader.vue';
import MappingEditor from '@/components/console/MappingEditor.vue';
import Button from '@/components/ui/Button.vue';
import Chip from '@/components/ui/Chip.vue';
import Toggle from '@/components/ui/Toggle.vue';
import Icon from '@/components/ui/Icon.vue';

const show = useShow();
const editorOpen = ref(false);
const editing = ref<Mapping | null>(null);
const flashId = ref<string | null>(null);

// flash a row when its mapping fires
watch(
  () => show.appliedTick,
  () => {
    flashId.value = show.lastAppliedId;
    window.setTimeout(() => (flashId.value = null), 220);
  },
);

const actionTone: Record<string, string> = {
  pulse: 'text-filament border-[color:rgba(255,178,92,.35)] bg-[rgba(255,178,92,.1)]',
  fade: 'text-online border-[color:rgba(87,217,163,.3)] bg-[rgba(87,217,163,.08)]',
  toggle: 'text-text border-line bg-panel-3',
  brightness: 'text-text border-line bg-panel-3',
  color: 'text-[#E85CC4] border-[color:rgba(232,92,196,.3)] bg-[rgba(232,92,196,.08)]',
  temp: 'text-[#35D0E0] border-[color:rgba(53,208,224,.3)] bg-[rgba(53,208,224,.08)]',
};

function matchLabel(m: Mapping): string {
  const tag = m.match.kind === 'cc' ? 'CC' : m.match.kind === 'noteOff' ? 'N↑' : 'N';
  const num = m.match.number == null ? 'any' : m.match.number;
  const ch = m.match.channel == null ? 'any ch' : `ch${m.match.channel + 1}`;
  return `${tag}${num} · ${ch}`;
}
function targetName(ref: string): string {
  if (!ref || ref === '*') return 'All fixtures';
  if (ref.startsWith('grp_')) return show.groups.find((g) => g.id === ref)?.name ?? 'group';
  const f = show.fixtures.find((x) => x.id === ref);
  if (f) return `${f.number} · ${f.name}`;
  return ref; // raw IP fallback
}

const sorted = computed(() => show.mappings);

async function persist(mappings: Mapping[]) {
  try {
    await api.putMappings(mappings);
    await loadMappings();
  } catch (e) {
    toastError((e as Error).message);
  }
}

function openAdd() {
  editing.value = null;
  editorOpen.value = true;
}
function openEdit(m: Mapping) {
  editing.value = m;
  editorOpen.value = true;
}
async function toggleEnabled(m: Mapping, enabled: boolean) {
  await persist(show.mappings.map((x) => (x.id === m.id ? { ...x, enabled } : x)));
}
async function duplicate(m: Mapping) {
  const copy: Mapping = {
    ...structuredClone(m),
    id: 'map_' + Date.now().toString(36),
    label: (m.label ?? '') + ' copy',
  };
  await persist([...show.mappings, copy]);
  toastOk('Mapping duplicated');
}
async function onSave(m: Mapping) {
  const exists = show.mappings.some((x) => x.id === m.id);
  const next = exists ? show.mappings.map((x) => (x.id === m.id ? m : x)) : [...show.mappings, m];
  await persist(next);
  editorOpen.value = false;
  toastOk(exists ? 'Mapping saved' : 'Mapping added');
}
async function onRemove(id: string) {
  await persist(show.mappings.filter((x) => x.id !== id));
  editorOpen.value = false;
  toastOk('Mapping removed');
}

onMounted(async () => {
  try {
    await Promise.all([loadInventory(), loadMappings(), loadMidiPorts()]);
  } catch (e) {
    toastError((e as Error).message);
  }
});
</script>

<template>
  <div class="mx-auto max-w-[1180px] px-6 py-8">
    <ScreenHeader
      title="Map"
      :subtitle="`${show.mappings.length} mapping${show.mappings.length === 1 ? '' : 's'} · MIDI → light`"
    >
      <template #actions>
        <Button variant="primary" :icon="Plus" @click="openAdd">Add mapping</Button>
      </template>
    </ScreenHeader>

    <div v-if="sorted.length" class="flex flex-col gap-2.5">
      <div
        v-for="m in sorted"
        :key="m.id"
        class="flex items-center gap-3 px-4 py-3 rounded-[12px] border bg-panel transition-colors"
        :class="[
          flashId === m.id
            ? 'border-filament shadow-[0_0_0_1px_rgba(255,178,92,.5)]'
            : 'border-line',
          !m.enabled && 'opacity-55',
        ]"
      >
        <Toggle :model-value="m.enabled" @update:model-value="(v) => toggleEnabled(m, v)" />
        <div class="min-w-0 flex-1">
          <div class="text-[14px] font-medium truncate">{{ m.label || 'Untitled mapping' }}</div>
          <div class="mt-1 flex flex-wrap items-center gap-1.5">
            <Chip size="sm">{{ matchLabel(m) }}</Chip>
            <span class="text-text-mute text-[12px]">→</span>
            <span class="text-[12.5px] text-text-dim truncate">{{ targetName(m.fixture) }}</span>
          </div>
        </div>
        <span
          class="shrink-0 px-2 py-0.5 rounded-[6px] border text-[10.5px] font-mono uppercase tracking-wide"
          :class="actionTone[m.action]"
        >
          {{ m.action }}
        </span>
        <div class="shrink-0 flex items-center gap-1">
          <button
            class="w-8 h-8 grid place-items-center rounded-[8px] text-text-mute hover:text-text hover:bg-panel-3"
            title="Duplicate"
            @click="duplicate(m)"
          >
            <Icon :icon="Copy" :size="15" />
          </button>
          <button
            class="w-8 h-8 grid place-items-center rounded-[8px] text-text-mute hover:text-filament hover:bg-panel-3"
            title="Edit"
            @click="openEdit(m)"
          >
            <Icon :icon="Pencil" :size="15" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-[14px] border border-dashed border-line py-16 flex flex-col items-center gap-3 text-center text-text-mute"
    >
      <p class="text-text-dim">No mappings yet — connect a MIDI control to a fixture.</p>
      <Button variant="primary" :icon="Plus" @click="openAdd">Add your first mapping</Button>
    </div>

    <MappingEditor
      :open="editorOpen"
      :mapping="editing"
      :fixtures="show.fixtures"
      :groups="show.groups"
      @close="editorOpen = false"
      @save="onSave"
      @remove="onRemove"
    />
  </div>
</template>
