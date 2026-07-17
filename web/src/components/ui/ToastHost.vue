<script setup lang="ts">
import { CheckCircle2, AlertTriangle, Info } from '@lucide/vue';
import { useToasts } from '@/lib/toast';
import Icon from './Icon.vue';

const toasts = useToasts();
const icon = { ok: CheckCircle2, error: AlertTriangle, info: Info } as const;
const tone = {
  ok: 'text-online border-[color:rgba(87,217,163,.35)]',
  error: 'text-danger border-[color:rgba(255,107,107,.35)]',
  info: 'text-text-dim border-line',
} as const;
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 items-end">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="[
            'flex items-center gap-2.5 pl-3 pr-4 h-11 rounded-[10px] bg-panel-2 border shadow-[0_12px_30px_-12px_rgba(0,0,0,.7)] text-[13.5px]',
            tone[t.kind],
          ]"
        >
          <Icon :icon="icon[t.kind]" :size="16" />
          <span class="text-text">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>
