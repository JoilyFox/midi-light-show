<script setup lang="ts">
// On/off switch. Amber when on (armed/enabled), graphite when off.
const props = defineProps<{ modelValue: boolean; label?: string }>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    class="inline-flex items-center gap-2 cursor-pointer select-none"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="relative w-9 h-5 rounded-full transition-colors border"
      :class="props.modelValue ? 'bg-filament/30 border-filament/50' : 'bg-ink-2 border-line'"
    >
      <span
        class="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-transform"
        :class="props.modelValue ? 'translate-x-4 bg-filament' : 'bg-text-mute'"
      />
    </span>
    <span v-if="label" class="text-[13px] text-text-dim">{{ label }}</span>
  </button>
</template>
