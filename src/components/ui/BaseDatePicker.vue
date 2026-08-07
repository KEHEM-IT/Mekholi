<script setup lang="ts">
// Bangladesh-style date picker: shows a calendar popup for picking a date.
// Displays the chosen date as DD/MM/YYYY but stores ISO YYYY-MM-DD (the
// format used by the SQLite backend + v-model), so existing saved data
// keeps working unchanged.
//
// - Click the field to open the calendar; click a day to pick it
// - Header shows clickable Month / Year fields (no arrow buttons):
//     • click the month name → month grid to pick a month
//     • click the year number → scrollable year grid to pick a year
//     • picking a year returns to the month grid; picking a month returns
//       to the day grid
// - Today / Clear footer actions; × clear button on the control
// - Click-outside and Esc close the panel; min/max bound selectable days
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    placeholder?: string
    disabled?: boolean
    min?: string
    max?: string
    todayLabel?: string
    clearLabel?: string
  }>(),
  {
    modelValue: '',
    placeholder: 'DD/MM/YYYY',
    disabled: false,
    min: '',
    max: '',
    todayLabel: 'Today',
    clearLabel: 'Clear',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
// Bangladesh week starts on Sunday (রবিবার).
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const { t } = useTranslator()

const root = ref<HTMLElement | null>(null)
const yearGridEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const mode = ref<'day' | 'month' | 'year'>('day')
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

interface ParsedDate { y: number; m: number; d: number }

function parseIso(iso: string): ParsedDate | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d
    ? { y, m: mo, d }
    : null
}

const selected = computed<ParsedDate | null>(() =>
  props.modelValue ? parseIso(props.modelValue) : null,
)

const displayText = computed(() => {
  const s = selected.value
  return s
    ? `${String(s.d).padStart(2, '0')}/${String(s.m + 1).padStart(2, '0')}/${s.y}`
    : ''
})

// ── Editable input support ─────────────────────────────────────────────
// While focused the field shows what the user typed (masked DD/MM/YYYY);
// on blur an incomplete/invalid draft is rolled back to the stored value.

const draft = ref('')
const isFocused = ref(false)
const showInputError = ref(false)

/** ISO → DD/MM/YYYY for the input ('' when not an ISO date). */
function isoToDmy(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** DD/MM/YYYY → ISO; '' when incomplete or not a real date. */
function dmyToIso(dmy: string): string {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Value shown in the input: live draft while typing, stored date otherwise. */
const inputValue = computed(() => (isFocused.value ? draft.value : displayText.value))

function onInputFocus() {
  isFocused.value = true
  showInputError.value = false
  draft.value = isoToDmy(props.modelValue ?? '')
}

function onInputChange(event: Event) {
  const el = event.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 8)
  let out = digits
  if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`
  draft.value = out
  if (out.length === 10) {
    const iso = dmyToIso(out)
    showInputError.value = !iso
    if (iso) emit('update:modelValue', iso)
  } else if (out.length === 0) {
    showInputError.value = false
    emit('update:modelValue', '')
  } else {
    showInputError.value = false
  }
}

function onInputBlur() {
  isFocused.value = false
  // Incomplete but non-empty → roll back to the stored value.
  if (draft.value.length > 0 && draft.value.length < 10) showInputError.value = true
  draft.value = ''
}

function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// 42-cell grid (6 weeks) so the calendar keeps a stable height.
const dayCells = computed<(number | null)[]>(() => {
  const firstWeekday = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length < 42) cells.push(null)
  return cells
})

// Year grid range: honours min/max bounds, otherwise a sensible 1900–current+1.
const yearOptions = computed<number[]>(() => {
  const minY = props.min ? (parseIso(props.min)?.y ?? 1900) : 1900
  const maxY = props.max
    ? (parseIso(props.max)?.y ?? new Date().getFullYear() + 1)
    : new Date().getFullYear() + 1
  const years: number[] = []
  for (let y = minY; y <= maxY; y++) years.push(y)
  return years
})

function isDisabledDay(day: number): boolean {
  const iso = isoOf(viewYear.value, viewMonth.value, day)
  if (props.min && iso < props.min) return true
  if (props.max && iso > props.max) return true
  return false
}

function isSelectedDay(day: number): boolean {
  const s = selected.value
  return !!s && s.y === viewYear.value && s.m === viewMonth.value && s.d === day
}

function isToday(day: number): boolean {
  const t = new Date()
  return (
    t.getFullYear() === viewYear.value &&
    t.getMonth() === viewMonth.value &&
    t.getDate() === day
  )
}

function open() {
  if (props.disabled || isOpen.value) return
  // Jump the calendar to the selected date, else to today.
  const s = selected.value
  const anchor = s ?? { y: new Date().getFullYear(), m: new Date().getMonth() }
  viewYear.value = anchor.y
  viewMonth.value = anchor.m
  mode.value = 'day'
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function selectDay(day: number) {
  if (isDisabledDay(day)) return
  emit('update:modelValue', isoOf(viewYear.value, viewMonth.value, day))
  close()
}

function selectMonth(m: number) {
  viewMonth.value = m
  mode.value = 'day'
}

function selectYear(y: number) {
  viewYear.value = y
  // Back to the month grid so the user can then choose a month.
  mode.value = 'month'
}

/** Open the year grid and scroll the current/active year into view. */
function openYearMode() {
  mode.value = 'year'
  nextTick(() => {
    const active = yearGridEl.value?.querySelector<HTMLElement>('.datepicker__yearcell.is-active')
    active?.scrollIntoView({ block: 'nearest' })
  })
}

function selectToday() {
  const t = new Date()
  emit('update:modelValue', isoOf(t.getFullYear(), t.getMonth(), t.getDate()))
  close()
}

function prevMonth() {
  viewMonth.value--
  if (viewMonth.value < 0) {
    viewMonth.value = 11
    viewYear.value--
  }
}

function nextMonth() {
  viewMonth.value++
  if (viewMonth.value > 11) {
    viewMonth.value = 0
    viewYear.value++
  }
}

function prevYear() {
  viewYear.value--
}

function nextYear() {
  viewYear.value++
}

function clearDate(event: Event) {
  event.stopPropagation()
  emit('update:modelValue', '')
  close()
}

function onControlKeydown(event: KeyboardEvent) {
  if (isOpen.value) return
  if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
    event.preventDefault()
    open()
  }
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

function onClickOutside(event: MouseEvent) {
  if (isOpen.value && root.value && !root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="root" class="datepicker" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <div class="datepicker__control" :class="{ 'is-error': showInputError }">
      <i class="fa-duotone fa-calendar datepicker__cal-icon" aria-hidden="true" />
      <input
        ref="inputEl"
        type="text"
        inputmode="numeric"
        maxlength="10"
        autocomplete="off"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="datepicker__input"
        @focus="onInputFocus"
        @input="onInputChange"
        @blur="onInputBlur"
        @click="open"
        @keydown="onControlKeydown"
      />
      <span class="datepicker__actions">
        <span
          v-if="displayText && !disabled"
          class="datepicker__clear"
          role="button"
          tabindex="-1"
          aria-label="Clear date"
          @click="clearDate"
        >
          &#10005;
        </span>
        <span class="datepicker__caret" aria-hidden="true" />
      </span>
    </div>

    <div v-if="isOpen" class="datepicker__panel" role="dialog" @keydown="onPanelKeydown">
      <!-- Header: arrows + clickable month/year fields -->
      <div class="datepicker__header">
        <div class="datepicker__seg">
          <button type="button" class="datepicker__nav" aria-label="Previous month" @click="prevMonth">
            <i class="fa-duotone fa-chevron-left" />
          </button>
          <button
            type="button"
            class="datepicker__header-btn"
            :class="{ 'is-active': mode === 'month' }"
            @click="mode = mode === 'month' ? 'day' : 'month'"
          >
            {{ MONTHS[viewMonth] }}
          </button>
          <button type="button" class="datepicker__nav" aria-label="Next month" @click="nextMonth">
            <i class="fa-duotone fa-chevron-right" />
          </button>
        </div>
        <div class="datepicker__seg">
          <button type="button" class="datepicker__nav" aria-label="Previous year" @click="prevYear">
            <i class="fa-duotone fa-chevron-left" />
          </button>
          <button
            type="button"
            class="datepicker__header-btn"
            :class="{ 'is-active': mode === 'year' }"
            @click="mode === 'year' ? (mode = 'day') : openYearMode()"
          >
            {{ viewYear }}
          </button>
          <button type="button" class="datepicker__nav" aria-label="Next year" @click="nextYear">
            <i class="fa-duotone fa-chevron-right" />
          </button>
        </div>
      </div>

      <!-- Month selection grid -->
      <div v-if="mode === 'month'" class="datepicker__monthgrid">
        <button
          v-for="(m, i) in MONTHS"
          :key="m"
          type="button"
          class="datepicker__monthcell"
          :class="{ 'is-active': i === viewMonth }"
          @click="selectMonth(i)"
        >
          {{ m.slice(0, 3) }}
        </button>
      </div>

      <!-- Year selection grid (scrollable) -->
      <div v-else-if="mode === 'year'" ref="yearGridEl" class="datepicker__yeargrid">
        <button
          v-for="y in yearOptions"
          :key="y"
          type="button"
          class="datepicker__yearcell"
          :class="{ 'is-active': y === viewYear }"
          @click="selectYear(y)"
        >
          {{ y }}
        </button>
      </div>

      <!-- Day grid -->
      <template v-else>
        <div class="datepicker__weekdays">
          <span v-for="wd in WEEKDAYS" :key="wd" class="datepicker__weekday">{{ wd }}</span>
        </div>
        <div class="datepicker__grid">
          <span
            v-for="(day, i) in dayCells"
            :key="i"
            class="datepicker__cell"
            :class="{
              'is-empty': !day,
              'is-selected': !!day && isSelectedDay(day),
              'is-today': !!day && isToday(day),
              'is-disabled': !!day && isDisabledDay(day),
            }"
            role="button"
            tabindex="0"
            @click="day && selectDay(day)"
            @keydown.enter="day && selectDay(day)"
            @keydown.space.prevent="day && selectDay(day)"
          >
            {{ day ?? '' }}
          </span>
        </div>
      </template>

      <div class="datepicker__footer">
        <button type="button" class="datepicker__today" @click="selectToday">
          {{ todayLabel || t('Today') }}
        </button>
        <button type="button" class="datepicker__clearbtn" @click="clearDate">
          {{ clearLabel || t('Clear') }}
        </button>
      </div>
    </div>
  </div>
</template>
