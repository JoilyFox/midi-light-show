<script setup lang="ts">
import { computed, type FunctionalComponent } from 'vue';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/lib/cn';
import Icon from './Icon.vue';

// Prop-driven button. Tailwind lives here; callers write <Button variant="primary" size="lg" :icon="Plus">.
const button = tv({
  base: 'inline-flex items-center justify-center gap-2 font-medium border cursor-pointer select-none transition-[background-color,border-color,filter,transform] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-filament disabled:opacity-50 disabled:pointer-events-none',
  variants: {
    variant: {
      primary:
        'bg-gradient-to-b from-filament to-filament-deep border-filament-deep text-[#241503] font-semibold shadow-[0_6px_20px_-8px_rgba(255,178,92,.6)] hover:brightness-105',
      secondary: 'bg-panel-2 border-line text-text hover:bg-panel-3 hover:border-[#3a404a]',
      ghost: 'bg-transparent border-line text-text hover:bg-panel-3 hover:border-[#3a404a]',
      danger:
        'bg-transparent text-danger border-[color:rgba(255,107,107,.3)] hover:bg-[rgba(255,107,107,.1)]',
    },
    size: {
      sm: 'h-8 px-3 gap-1.5 text-xs rounded-[8px]',
      md: 'h-9 px-3.5 text-sm rounded-[9px]',
      lg: 'h-11 px-4 text-[15px] rounded-[10px]',
    },
    iconOnly: { true: 'px-0 aspect-square', false: '' },
  },
  defaultVariants: { variant: 'secondary', size: 'md', iconOnly: false },
});

type ButtonVariants = VariantProps<typeof button>;

const props = defineProps<{
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  icon?: FunctionalComponent;
  iconOnly?: boolean;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  class?: string;
}>();

const classes = computed(() =>
  cn(button({ variant: props.variant, size: props.size, iconOnly: props.iconOnly }), props.class),
);
const iconPx = computed(() => (props.size === 'lg' ? 18 : props.size === 'sm' ? 14 : 16));
</script>

<template>
  <button :type="type ?? 'button'" :class="classes" :disabled="disabled || loading">
    <Icon v-if="icon" :icon="icon" :size="iconPx" />
    <slot />
  </button>
</template>
