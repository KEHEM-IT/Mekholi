<script setup lang="ts">
// Smooth bulb-style on/off switch with a sliding thumb (left = off,
// right = on). Used for Yes/No toggles like MPO Status.
import { useTranslator } from '@/Translator'

const { t } = useTranslator()

defineProps<{
  modelValue?: boolean
  disabled?: boolean
  yesLabel?: string
  noLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <button
    type="button"
    class="base-toggle"
    :class="{ 'is-on': modelValue }"
    :disabled="disabled"
    role="switch"
    :aria-checked="!!modelValue"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="base-toggle__track">
      <span class="base-toggle__thumb" />
    </span>
    <span class="base-toggle__label">{{ modelValue ? yesLabel || t('Yes') : noLabel || t('No') }}</span>
  </button>
</template>
