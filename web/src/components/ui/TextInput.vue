<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/cn';

// Labelled text/number input, Filament-styled. v-model compatible.
const props = defineProps<{
  modelValue: string | number;
  label?: string;
  type?: 'text' | 'number';
  placeholder?: string;
  mono?: boolean;
  min?: number;
  max?: number;
  class?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [string | number] }>();

function onInput(e: Event) {
  const t = e.target as HTMLInputElement;
  emit('update:modelValue', props.type === 'number' ? t.valueAsNumber : t.value);
}
const inputClass = computed(() =>
  cn(
    'w-full h-10 px-3 rounded-[9px] bg-ink-2 border border-line text-text placeholder:text-text-mute',
    'transition-colors focus:border-filament focus:outline-none tabular-nums',
    props.mono && 'font-mono',
    props.class,
  ),
);
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span v-if="label" class="font-mono text-[10.5px] tracking-[.14em] uppercase text-text-mute">{{
      label
    }}</span>
    <input
      :type="type ?? 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :class="inputClass"
      @input="onInput"
    />
  </label>
</template>
