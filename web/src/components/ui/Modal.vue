<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue';
import { X } from '@lucide/vue';
import Button from './Button.vue';

// A centered dialog on a dimmed scrim. Closes on backdrop click or Esc.
const props = defineProps<{ open: boolean; title?: string; width?: number }>();
const emit = defineEmits<{ close: [] }>();

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}
watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKey);
    else window.removeEventListener('keydown', onKey);
  },
);
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          class="w-full bg-panel border border-line rounded-[15px] shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)] overflow-hidden"
          :style="{ maxWidth: (width ?? 460) + 'px' }"
          role="dialog"
          aria-modal="true"
        >
          <header class="flex items-center justify-between px-5 h-14 border-b border-line-soft">
            <h2 class="text-[15px] font-semibold tracking-[-.01em]">{{ title }}</h2>
            <Button
              variant="ghost"
              size="sm"
              icon-only
              :icon="X"
              aria-label="Close"
              @click="emit('close')"
            />
          </header>
          <div class="p-5"><slot /></div>
          <footer
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 px-5 py-4 border-t border-line-soft bg-ink-2/40"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active {
    transition: none;
  }
}
</style>
