<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus, Trash2, Check } from '@lucide/vue';
import type { Group } from '@/types';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import TextInput from '@/components/ui/TextInput.vue';

// Create / rename / delete groups. Membership is edited per-fixture in the fixture modal.
const props = defineProps<{ open: boolean; groups: Group[] }>();
const emit = defineEmits<{
  close: [];
  create: [string];
  rename: [{ id: string; name: string }];
  remove: [string];
}>();

const newName = ref('');
const drafts = ref<Record<string, string>>({});
const confirmId = ref<string | null>(null);

watch(
  () => props.open,
  (open) => {
    if (open) {
      newName.value = '';
      confirmId.value = null;
      drafts.value = Object.fromEntries(props.groups.map((g) => [g.id, g.name]));
    }
  },
);
// keep drafts in sync when the list changes while open
watch(
  () => props.groups.map((g) => g.id + g.name).join(),
  () => {
    for (const g of props.groups) if (!(g.id in drafts.value)) drafts.value[g.id] = g.name;
  },
);

function create() {
  const n = newName.value.trim();
  if (n) {
    emit('create', n);
    newName.value = '';
  }
}
</script>

<template>
  <Modal :open="open" title="Manage groups" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <div class="flex items-end gap-2">
        <TextInput
          v-model="newName"
          label="New group"
          placeholder="e.g. Front wash"
          class="flex-1"
          @keyup.enter="create"
        />
        <Button variant="primary" :icon="Plus" :disabled="!newName.trim()" @click="create"
          >Add</Button
        >
      </div>

      <div v-if="groups.length" class="flex flex-col gap-2">
        <div v-for="g in groups" :key="g.id" class="flex items-center gap-2">
          <input
            v-model="drafts[g.id]"
            class="flex-1 h-9 px-3 rounded-[8px] bg-ink-2 border border-line text-text focus:border-filament focus:outline-none text-[13.5px]"
          />
          <span class="font-mono text-[11px] text-text-mute tabular-nums w-14 text-right"
            >{{ g.fixtureIds.length }} fix</span
          >
          <Button
            variant="ghost"
            size="sm"
            icon-only
            :icon="Check"
            aria-label="Rename"
            :disabled="drafts[g.id]?.trim() === g.name || !drafts[g.id]?.trim()"
            @click="emit('rename', { id: g.id, name: drafts[g.id].trim() })"
          />
          <Button
            :variant="confirmId === g.id ? 'danger' : 'ghost'"
            size="sm"
            :icon-only="confirmId !== g.id"
            :icon="Trash2"
            aria-label="Delete"
            @click="confirmId === g.id ? emit('remove', g.id) : (confirmId = g.id)"
          >
            <template v-if="confirmId === g.id">Sure?</template>
          </Button>
        </div>
      </div>
      <p v-else class="text-[13px] text-text-mute">No groups yet.</p>
    </div>
  </Modal>
</template>
