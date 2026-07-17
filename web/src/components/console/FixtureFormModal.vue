<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Trash2 } from '@lucide/vue';
import type { Fixture, Group } from '@/types';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import TextInput from '@/components/ui/TextInput.vue';

// Add or edit a fixture. Emits the collected values + the desired group membership;
// the parent (RigScreen) performs the API calls so it can reconcile groups in one place.
const props = defineProps<{
  open: boolean;
  fixture: Fixture | null;
  groups: Group[];
  nextNumber: number;
}>();
const emit = defineEmits<{
  close: [];
  save: [{ id: string | null; name: string; ip: string; number: number; groupIds: string[] }];
  remove: [string];
}>();

const name = ref('');
const ip = ref('');
const number = ref(1);
const groupIds = ref<string[]>([]);
const confirmDelete = ref(false);

const isEdit = computed(() => !!props.fixture);
const title = computed(() => (isEdit.value ? 'Edit fixture' : 'Add fixture'));
const valid = computed(() => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip.value.trim()));

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    confirmDelete.value = false;
    if (props.fixture) {
      name.value = props.fixture.name;
      ip.value = props.fixture.ip;
      number.value = props.fixture.number;
      groupIds.value = props.groups
        .filter((g) => g.fixtureIds.includes(props.fixture!.id))
        .map((g) => g.id);
    } else {
      name.value = '';
      ip.value = '';
      number.value = props.nextNumber;
      groupIds.value = [];
    }
  },
);

function toggleGroup(id: string) {
  groupIds.value = groupIds.value.includes(id)
    ? groupIds.value.filter((g) => g !== id)
    : [...groupIds.value, id];
}

function save() {
  if (!valid.value) return;
  emit('save', {
    id: props.fixture?.id ?? null,
    name: name.value.trim(),
    ip: ip.value.trim(),
    number: number.value,
    groupIds: groupIds.value,
  });
}
</script>

<template>
  <Modal :open="open" :title="title" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <TextInput v-model="name" label="Name" placeholder="e.g. Stage Left" />
      <div class="grid grid-cols-[1fr_96px] gap-3">
        <TextInput v-model="ip" label="IP address" placeholder="192.168.0.200" mono />
        <TextInput v-model.number="number" label="No." type="number" :min="1" mono />
      </div>
      <p v-if="ip && !valid" class="text-[12px] text-danger -mt-2">Enter a valid IPv4 address.</p>

      <div v-if="groups.length" class="flex flex-col gap-1.5">
        <span class="font-mono text-[10.5px] tracking-[.14em] uppercase text-text-mute"
          >Groups</span
        >
        <div class="flex flex-wrap gap-2">
          <button
            v-for="g in groups"
            :key="g.id"
            type="button"
            class="px-3 py-1.5 rounded-full border text-[12.5px] transition-colors cursor-pointer"
            :class="
              groupIds.includes(g.id)
                ? 'bg-[rgba(255,178,92,.12)] border-[color:rgba(255,178,92,.35)] text-filament'
                : 'bg-panel border-line text-text-dim hover:text-text'
            "
            @click="toggleGroup(g.id)"
          >
            {{ g.name }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <Button
        v-if="isEdit"
        :variant="confirmDelete ? 'danger' : 'ghost'"
        size="sm"
        :icon="Trash2"
        class="mr-auto"
        @click="confirmDelete ? emit('remove', fixture!.id) : (confirmDelete = true)"
      >
        {{ confirmDelete ? 'Confirm delete' : 'Delete' }}
      </Button>
      <Button variant="ghost" @click="emit('close')">Cancel</Button>
      <Button variant="primary" :disabled="!valid" @click="save">{{
        isEdit ? 'Save' : 'Add'
      }}</Button>
    </template>
  </Modal>
</template>
