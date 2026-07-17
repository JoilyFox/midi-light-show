// Minimal global toast queue — transient feedback ("Fixture added", "Discovery found 2").
// A single shared reactive list; <ToastHost> renders it.

import { ref } from 'vue';

export type ToastKind = 'ok' | 'error' | 'info';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const toasts = ref<Toast[]>([]);
let seq = 0;

export function useToasts() {
  return toasts;
}

export function toast(message: string, kind: ToastKind = 'info', ttlMs = 3200): void {
  const id = ++seq;
  toasts.value.push({ id, kind, message });
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, ttlMs);
}

export const toastOk = (m: string) => toast(m, 'ok');
export const toastError = (m: string) => toast(m, 'error', 5000);
