<script setup lang="ts">
// Editable time picker — Bangladesh-style: shows a quick AM/PM grid popup
// for picking a time, but the field is a fully editable text input.
//
// - Display format : HH:MM AM/PM (e.g. "09:30 AM")
// - 24-hour input  : also accepted ("21:30", "9:30") — anything without a
//                    meridiem is read as 24-hour time
// - Storage format : HH:MM (24-hour, e.g. "09:30", "21:30") — same as the
//                    backend expects, so saved data keeps working
// - Typing: "9:30", "9:30 AM", "09:30PM", "21:30", "9 AM" all parse;
//   invalid drafts show a red border and roll back on blur
// - Popup: hour grid (01–12) + minute grid (00–55) + AM/PM switch;
//   picking an hour keeps the panel open, picking minutes applies & closes
// - Now / Clear footer actions; × clear button; click-outside & Esc close
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'

const props = withDefaults(
  defineProps<{
    /** Stored value: HH:MM (24-hour). */
    modelValue?: string | null
    placeholder?: string
    disabled?: boolean
    nowLabel?: string
    clearLabel?: string
  }>(),
  {
    modelValue: '',
    placeholder: 'HH:MM AM/PM',
    disabled: false,
    nowLabel: '',
    clearLabel: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const { t } = useTranslator()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const isFocused = ref(false)
const showInputError = ref(false)
const draft = ref('')

// Draft state for the popup grids.
const pHour = ref(12)
const pMinute = ref(0)
const pMeridiem = ref<'AM' | 'PM'>('AM')

// ── Parsing / formatting ───────────────────────────────────────────────

const TIME_RE = /^(\d{2}):(\d{2})$/

/** Accepts "9:30", "09:30", "9:30 AM", "9:30AM", "21:30", "9 AM", "9PM"… → "HH:MM" 24h; null when invalid. */
function parseTime(raw: string): string | null {
  const s = raw.trim().toUpperCase()
  if (!s) return ''
  let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/)
  if (m) {
    let h = Number(m[1])
    const min = Number(m[2])
    const ap = m[3]
    if (min > 59) return null
    if (ap) {
      if (h < 1 || h > 12) return null
      h = ap === 'AM' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12
    } else {
      if (h > 23) return null
    }
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
  // Hour only with meridiem: "9 AM", "9PM"
  m = s.match(/^(\d{1,2})\s*(AM|PM)$/)
  if (m) {
    let h = Number(m[1])
    if (h < 1 || h > 12) return null
    h = m[2] === 'AM' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12
    return `${String(h).padStart(2, '0')}:00`
  }
  return null
}

/** "HH:MM" (24h) → "HH:MM AM/PM" display text; '' when not a time. */
function to12h(iso: string): string {
  const m = iso.match(TIME_RE)
  if (!m) return ''
  let h = Number(m[1])
  const min = m[2]
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${min} ${ap}`
}

const displayText = computed(() => (props.modelValue ? to12h(props.modelValue) : ''))

// ── Editable input ─────────────────────────────────────────────────────

/** Value shown in the input: live draft while typing, formatted value otherwise. */
const inputValue = computed(() => (isFocused.value ? draft.value : displayText.value))

function onInputFocus() {
  isFocused.value = true
  showInputError.value = false
  draft.value = displayText.value
}

function onInputChange(event: Event) {
  const el = event.target as HTMLInputElement
  draft.value = el.value
  const parsed = parseTime(el.value)
  if (parsed !== null) {
    showInputError.value = false
    if (parsed !== props.modelValue) {
      emit('update:modelValue', parsed)
      emit('change', parsed)
    }
  } else if (el.value.trim() === '') {
    showInputError.value = false
    if (props.modelValue) emit('update:modelValue', '')
  } else {
    showInputError.value = true
  }
}

function onInputBlur() {
  isFocused.value = false
  // Incomplete but non-empty → red flash; the stored value shows again.
  // (Does NOT close the popup — clicking a cell moves focus off the input,
  // and the panel must stay open while the user picks hour → minute.)
  if (draft.value && parseTime(draft.value) === null && draft.value.trim() !== '') {
    showInputError.value = true
  }
  draft.value = ''
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    const parsed = parseTime(draft.value)
    if (parsed !== null) {
      if (parsed !== props.modelValue) {
        emit('update:modelValue', parsed)
        emit('change', parsed)
      }
      close()
    }
  } else if (event.key === 'ArrowDown' && !isOpen.value) {
    event.preventDefault()
    open()
  }
}

// ── Popup grids ────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1) // 01..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 00,05..55

// Which edge of the field the panel aligns to. Defaults to the left edge;
// when the field sits near the right edge of the screen (e.g. the time
// fields in the right half of a form modal), a left-anchored 16.5rem panel
// would overflow past the viewport / modal edge and get clipped — in that
// case it flips to right-aligned so it opens into the space on the left.
const PANEL_WIDTH = 264 // 16.5rem
const panelAlign = ref<'left' | 'right'>('left')

/** Populate the popup draft from the stored value. */
function open() {
  if (props.disabled || isOpen.value) return
  if (root.value) {
    const rect = root.value.getBoundingClientRect()
    panelAlign.value = window.innerWidth - rect.right < PANEL_WIDTH + 8 ? 'right' : 'left'
  }
  const m = props.modelValue?.match(TIME_RE)
  if (m) {
    const h24 = Number(m[1])
    const min = Number(m[2])
    pHour.value = h24 % 12 || 12
    pMinute.value = min - (min % 5)
    pMeridiem.value = h24 >= 12 ? 'PM' : 'AM'
  } else {
    pHour.value = 12
    pMinute.value = 0
    pMeridiem.value = 'AM'
  }
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

/** Emit the current popup draft as HH:MM 24h. */
function commitDraft() {
  let h = pHour.value % 12
  if (pMeridiem.value === 'PM') h += 12
  const iso = `${String(h).padStart(2, '0')}:${String(pMinute.value).padStart(2, '0')}`
  if (iso !== props.modelValue) {
    emit('update:modelValue', iso)
    emit('change', iso)
  }
  // Keep the focused input in sync with what was just picked.
  if (isFocused.value) draft.value = to12h(iso)
}

function pickHour(h: number) {
  pHour.value = h
  // Stay open — user picks minutes next.
}

function pickMinute(min: number) {
  pMinute.value = min
  commitDraft()
  close()
}

function pickNow() {
  const now = new Date()
  const h = now.getHours()
  const min = now.getMinutes()
  const iso = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  emit('update:modelValue', iso)
  emit('change', iso)
  if (isFocused.value) draft.value = to12h(iso)
  close()
}

function clearTime(event: Event) {
  event.stopPropagation()
  emit('update:modelValue', '')
  emit('change', '')
  if (isFocused.value) draft.value = ''
  close()
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

function onClickOutside(event: MouseEvent) {
  if (isOpen.value && root.value && !root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

const preview = computed(() => {
  let h = pHour.value % 12
  if (pMeridiem.value === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${String(pMinute.value).padStart(2, '0')} ${pMeridiem.value}`
})
</script>

<template>
  <div ref="root" class="timepicker" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <div class="timepicker__control" :class="{ 'is-error': showInputError }" @click="open">
      <i class="fa-duotone fa-clock timepicker__clock-icon" aria-hidden="true" />
      <input
        type="text"
        inputmode="numeric"
        maxlength="8"
        autocomplete="off"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="timepicker__input"
        @focus="onInputFocus"
        @input="onInputChange"
        @blur="onInputBlur"
        @keydown="onInputKeydown"
      />
      <span class="timepicker__actions">
        <span
          v-if="displayText && !disabled"
          class="timepicker__clear"
          role="button"
          tabindex="-1"
          aria-label="Clear time"
          @click="clearTime"
        >
          &#10005;
        </span>
        <span class="timepicker__caret" aria-hidden="true" />
      </span>
    </div>

    <div
      v-if="isOpen"
      class="timepicker__panel"
      :class="{ 'is-right-aligned': panelAlign === 'right' }"
      role="dialog"
      @keydown="onPanelKeydown"
      @mousedown.prevent
    >
      <div class="timepicker__preview">{{ preview }}</div>

      <!-- AM / PM switch -->
      <div class="timepicker__meridiem">
        <button
          type="button"
          class="timepicker__meridiem-btn"
          :class="{ 'is-active': pMeridiem === 'AM' }"
          @click="pMeridiem = 'AM'"
        >
          AM
        </button>
        <button
          type="button"
          class="timepicker__meridiem-btn"
          :class="{ 'is-active': pMeridiem === 'PM' }"
          @click="pMeridiem = 'PM'"
        >
          PM
        </button>
      </div>

      <!-- Hour + minute grids -->
      <div class="timepicker__grids">
        <div class="timepicker__grid">
          <span class="timepicker__grid-label">{{ t('Hour') }}</span>
          <div class="timepicker__cells">
            <button
              v-for="h in HOURS"
              :key="h"
              type="button"
              class="timepicker__cell"
              :class="{ 'is-active': pHour === h }"
              @click="pickHour(h)"
            >
              {{ String(h).padStart(2, '0') }}
            </button>
          </div>
        </div>
        <div class="timepicker__grid">
          <span class="timepicker__grid-label">{{ t('Minute') }}</span>
          <div class="timepicker__cells">
            <button
              v-for="min in MINUTES"
              :key="min"
              type="button"
              class="timepicker__cell"
              :class="{ 'is-active': pMinute === min }"
              @click="pickMinute(min)"
            >
              {{ String(min).padStart(2, '0') }}
            </button>
          </div>
        </div>
      </div>

      <div class="timepicker__footer">
        <button type="button" class="timepicker__now" @click="pickNow">
          {{ nowLabel || t('Now') }}
        </button>
        <button type="button" class="timepicker__clearbtn" @click="clearTime">
          {{ clearLabel || t('Clear') }}
        </button>
      </div>
    </div>
  </div>
</template>
