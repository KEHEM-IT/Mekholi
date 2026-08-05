<script setup lang="ts">
// Bangladesh-style date field: displays and accepts DD/MM/YYYY but stores
// ISO YYYY-MM-DD (the format used by the SQLite backend + v-model), so
// existing saved data keeps working unchanged.
//
//  - Typing auto-inserts the "/" separators (digits only, max 8)
//  - Completing a valid 10-char date emits the ISO value immediately
//  - Clearing the field emits ""
//  - Invalid dates (31/02/2026, 29/02/2025…) show the .has-error state
//    (red border via the global form styles) and never emit a bad ISO
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: 'DD/MM/YYYY',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const draft = ref('')
const isFocused = ref(false)
const showError = ref(false)

/** ISO YYYY-MM-DD -> DD/MM/YYYY ('' when not an ISO date). */
function isoToDmy(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** DD/MM/YYYY -> ISO YYYY-MM-DD, or '' when incomplete/invalid. */
function dmyToIso(dmy: string): string {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const d = new Date(year, month - 1, day)
  const real =
    d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
  if (!real) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// While focused show what the user is typing; otherwise show the stored
// value reformatted to DD/MM/YYYY.
const shownValue = computed(() =>
  isFocused.value ? draft.value : isoToDmy(props.modelValue ?? ''),
)

function onFocus() {
  isFocused.value = true
  showError.value = false
  draft.value = isoToDmy(props.modelValue ?? '')
}

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 8)
  let out = digits
  if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`
  draft.value = out

  if (out.length === 10) {
    showError.value = dmyToIso(out) === ''
    const iso = dmyToIso(out)
    if (iso) emit('update:modelValue', iso)
  } else if (out.length === 0) {
    showError.value = false
    emit('update:modelValue', '')
  } else {
    showError.value = false
  }
}

function onBlur() {
  isFocused.value = false
  // Flag incomplete-but-not-empty drafts as errors; complete valid dates
  // were already emitted on input.
  if (draft.value.length > 0 && draft.value.length < 10) showError.value = true
  draft.value = ''
}
</script>

<template>
  <input
    type="text"
    inputmode="numeric"
    :value="shownValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="{ 'has-error': showError }"
    maxlength="10"
    autocomplete="off"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>
