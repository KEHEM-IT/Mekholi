<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger'
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

<style scoped>
.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
.btn--primary {
  background: #4f46e5;
  color: #fff;
}
.btn--secondary {
  background: #e5e7eb;
  color: #111827;
}
.btn--danger {
  background: #dc2626;
  color: #fff;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
