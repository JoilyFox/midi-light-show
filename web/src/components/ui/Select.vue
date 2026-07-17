<script setup lang="ts" generic="T extends string | number">
import { ChevronDown } from '@lucide/vue';
import Icon from './Icon.vue';

// Labelled native select, Filament-styled. Options are {value,label} or plain strings.
const props = defineProps<{
  modelValue: T;
  options: Array<{ value: T; label: string } | T>;
  label?: string;
  mono?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [T] }>();

function norm(o: { value: T; label: string } | T) {
  return typeof o === 'object' ? o : { value: o, label: String(o) };
}
function onChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value;
  const first = props.options.length ? norm(props.options[0]).value : raw;
  emit('update:modelValue', (typeof first === 'number' ? Number(raw) : raw) as T);
}
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span v-if="label" class="font-mono text-[10.5px] tracking-[.14em] uppercase text-text-mute">{{
      label
    }}</span>
    <div class="relative">
      <select
        :value="modelValue"
        :class="[
          'w-full h-10 pl-3 pr-9 rounded-[9px] bg-ink-2 border border-line text-text appearance-none cursor-pointer',
          'focus:border-filament focus:outline-none',
          mono && 'font-mono tabular-nums',
        ]"
        @change="onChange"
      >
        <option v-for="o in options" :key="String(norm(o).value)" :value="norm(o).value">
          {{ norm(o).label }}
        </option>
      </select>
      <Icon
        :icon="ChevronDown"
        :size="16"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
      />
    </div>
  </label>
</template>
