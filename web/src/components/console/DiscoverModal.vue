<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Radar, ScanLine, Plus, Check, RefreshCw } from '@lucide/vue';
import type { DiscoveredBulb, Fixture } from '@/types';
import { api } from '@/lib/api';
import { toastOk, toastError } from '@/lib/toast';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';

// Scan the LAN for WiZ bulbs and let the user blink + add each one — without
// manually guessing IPs. `existing` marks which are already in the inventory.
const props = defineProps<{ open: boolean; existing: Fixture[] }>();
const emit = defineEmits<{ close: []; added: [] }>();

const scanning = ref(false);
const bulbs = ref<DiscoveredBulb[]>([]);
const busyIdentify = ref<Set<string>>(new Set());
const busyAdd = ref<Set<string>>(new Set());

watch(
  () => props.open,
  (open) => {
    if (open) void scan();
    else bulbs.value = [];
  },
);

async function scan() {
  scanning.value = true;
  try {
    bulbs.value = (await api.scan()).bulbs;
  } catch (e) {
    toastError((e as Error).message);
  } finally {
    scanning.value = false;
  }
}

function addedFixture(b: DiscoveredBulb): Fixture | undefined {
  return props.existing.find((f) => (b.mac && f.mac === b.mac) || f.ip === b.ip);
}
const newCount = computed(() => bulbs.value.filter((b) => !addedFixture(b)).length);

function dotColor(b: DiscoveredBulb): string {
  const p = b.pilot;
  if (!p || !p.on) return '#2a2e37';
  if (p.color) return `rgb(${p.color.r},${p.color.g},${p.color.b})`;
  return p.temp && p.temp < 3500 ? '#FFD9A0' : '#EAF2FF'; // warm vs cool white
}
function stateLabel(b: DiscoveredBulb): string {
  const p = b.pilot;
  if (!p) return '—';
  if (!p.on) return 'off';
  return `on · ${Math.round(p.brightness)}%`;
}

async function identify(b: DiscoveredBulb) {
  busyIdentify.value = new Set(busyIdentify.value).add(b.ip);
  try {
    await api.identifyIp(b.ip);
    toastOk(`Blinking ${b.ip}`);
  } catch (e) {
    toastError((e as Error).message);
  } finally {
    const s = new Set(busyIdentify.value);
    s.delete(b.ip);
    busyIdentify.value = s;
  }
}

async function add(b: DiscoveredBulb) {
  busyAdd.value = new Set(busyAdd.value).add(b.ip);
  try {
    await api.addFixture({ ip: b.ip, name: b.name });
    emit('added'); // parent reloads inventory → addedFixture() flips to "Added"
    toastOk(`Added ${b.name ?? b.ip}`);
  } catch (e) {
    toastError((e as Error).message);
  } finally {
    const s = new Set(busyAdd.value);
    s.delete(b.ip);
    busyAdd.value = s;
  }
}

async function addAll() {
  for (const b of bulbs.value) if (!addedFixture(b)) await add(b);
}
</script>

<template>
  <Modal :open="open" title="Discover bulbs on your network" :width="600" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <!-- toolbar -->
      <div class="flex items-center gap-3">
        <div class="text-[13px] text-text-dim">
          <template v-if="scanning">Scanning the local network…</template>
          <template v-else>
            {{ bulbs.length }} WiZ bulb{{ bulbs.length === 1 ? '' : 's' }} found
            <span v-if="bulbs.length" class="text-text-mute">· {{ newCount }} new</span>
          </template>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" :icon="RefreshCw" :loading="scanning" @click="scan"
            >Rescan</Button
          >
          <Button v-if="newCount > 1" variant="secondary" size="sm" :icon="Plus" @click="addAll"
            >Add all new</Button
          >
        </div>
      </div>

      <!-- scanning skeleton -->
      <div
        v-if="scanning && !bulbs.length"
        class="py-12 flex flex-col items-center gap-3 text-text-mute"
      >
        <Icon :icon="Radar" :size="30" class="animate-pulse" />
        <p class="text-text-dim text-[13px]">Sweeping every address on your subnet for bulbs…</p>
      </div>

      <!-- results -->
      <div v-else-if="bulbs.length" class="flex flex-col gap-2 max-h-[52vh] overflow-y-auto pr-1">
        <div
          v-for="b in bulbs"
          :key="b.ip"
          class="flex items-center gap-3 px-3 py-2.5 rounded-[11px] border border-line bg-panel-2"
        >
          <span
            class="w-8 h-8 rounded-full shrink-0 border border-black/30"
            :style="{
              background: dotColor(b),
              boxShadow: b.pilot?.on ? `0 0 12px ${dotColor(b)}` : 'none',
            }"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-[14px] font-semibold tabular-nums">{{ b.ip }}</span>
              <span class="font-mono text-[11px] text-text-mute">{{ stateLabel(b) }}</span>
            </div>
            <div class="text-[12px] text-text-dim truncate">
              {{ b.module ?? 'WiZ device'
              }}<span v-if="b.mac" class="text-text-mute font-mono"> · {{ b.mac }}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            :icon="ScanLine"
            :loading="busyIdentify.has(b.ip)"
            @click="identify(b)"
          >
            Blink
          </Button>

          <span
            v-if="addedFixture(b)"
            class="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-[7px] text-[11.5px] text-online border border-[color:rgba(87,217,163,.3)] bg-[rgba(87,217,163,.08)]"
          >
            <Icon :icon="Check" :size="13" /> Added
          </span>
          <Button
            v-else
            variant="primary"
            size="sm"
            :icon="Plus"
            :loading="busyAdd.has(b.ip)"
            @click="add(b)"
          >
            Add
          </Button>
        </div>
      </div>

      <!-- empty -->
      <div v-else class="py-12 flex flex-col items-center gap-3 text-text-mute">
        <Icon :icon="Radar" :size="30" />
        <p class="text-text-dim text-[13px]">
          No bulbs answered. Check they're powered and on the same WiFi.
        </p>
        <Button variant="secondary" size="sm" :icon="RefreshCw" @click="scan">Scan again</Button>
      </div>

      <p class="text-[12px] text-text-mute leading-relaxed">
        <strong class="text-text-dim">Blink</strong> flashes a bulb white three times (then restores
        it) so you can see which physical lamp it is before adding — no need to add-and-guess.
      </p>
    </div>
  </Modal>
</template>
