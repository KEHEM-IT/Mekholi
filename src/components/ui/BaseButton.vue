<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false },
)
</script>

<template>
  <button :type="type" :disabled="disabled" :class="['btn', `btn--${variant}`]">
    <slot />
  </button>
</template>
