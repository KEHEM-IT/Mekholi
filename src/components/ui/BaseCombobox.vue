<script setup lang="ts">
// Generic searchable dropdown ("combobox") for picking one item out of a
// flat option list — built for the BD geolocation cascades (Division /
// District / Upazila / Union, each ~50-500 rows and shown via their
// LookupText column) but written against plain `optionValue`/`optionLabel`
// keys so any array of records can be dropped in.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

type ComboboxOption = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    options?: ComboboxOption[]
    optionValue?: string
    optionLabel?: string
    placeholder?: string
    searchPlaceholder?: string
    disabled?: boolean
    clearable?: boolean
    emptyText?: string
  }>(),
  {
    modelValue: null,
    options: () => [],
    optionValue: 'Id',
    optionLabel: 'LookupText',
    placeholder: 'Select…',
    searchPlaceholder: 'Search…',
    disabled: false,
    clearable: true,
    emptyText: 'No results found',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  change: [option: ComboboxOption | null]
}>()

const listboxId = useId()
const root = ref<HTMLElement | null>(null)
const controlEl = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(-1)

const selectedOption = computed<ComboboxOption | null>(
  () => props.options.find((opt) => opt[props.optionValue] === props.modelValue) ?? null,
)

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((opt) =>
    String(opt[props.optionLabel] ?? '')
      .toLowerCase()
      .includes(q),
  )
})

function open() {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  query.value = ''
  const selectedIdx = selectedOption.value
    ? props.options.findIndex((opt) => opt[props.optionValue] === props.modelValue)
    : -1
  activeIndex.value = selectedIdx
  nextTick(() => {
    searchInput.value?.focus()
    if (selectedIdx >= 0) scrollActiveIntoView()
  })
}

function close(refocusControl = false) {
  if (!isOpen.value) return
  isOpen.value = false
  activeIndex.value = -1
  if (refocusControl) controlEl.value?.focus()
}

function toggle() {
  isOpen.value ? close() : open()
}

function selectOption(opt: ComboboxOption) {
  const value = opt[props.optionValue] as string | number
  emit('update:modelValue', value)
  emit('change', opt)
  close(true)
}

function clearSelection(event: Event) {
  event.stopPropagation()
  emit('update:modelValue', null)
  emit('change', null)
  query.value = ''
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = root.value?.querySelector(`[data-index="${activeIndex.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

// Query resets the active row to the top match each time it changes so
// Enter always selects the best result while typing.
watch(query, () => {
  activeIndex.value = filteredOptions.value.length ? 0 : -1
})

function onControlKeydown(event: KeyboardEvent) {
  if (isOpen.value) return
  if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault()
    open()
  }
}

function onSearchKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      activeIndex.value = Math.min(activeIndex.value + 1, filteredOptions.value.length - 1)
      scrollActiveIntoView()
      break
    case 'ArrowUp':
      event.preventDefault()
      activeIndex.value = Math.max(activeIndex.value - 1, 0)
      scrollActiveIntoView()
      break
    case 'Enter':
      event.preventDefault()
      if (activeIndex.value >= 0 && filteredOptions.value[activeIndex.value]) {
        selectOption(filteredOptions.value[activeIndex.value])
      }
      break
    case 'Escape':
      event.preventDefault()
      close(true)
      break
    case 'Tab':
      close()
      break
  }
}

function onClickOutside(event: MouseEvent) {
  if (isOpen.value && root.value && !root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

</script>

<template>
  <div ref="root" class="combobox" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <button
      ref="controlEl"
      type="button"
      class="combobox__control"
      :disabled="disabled"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      @click="toggle"
      @keydown="onControlKeydown"
    >
      <span class="combobox__value" :class="{ 'is-placeholder': !selectedOption }">
        {{ selectedOption ? String(selectedOption[optionLabel]) : placeholder }}
      </span>
      <span class="combobox__actions">
        <span
          v-if="clearable && selectedOption && !disabled"
          class="combobox__clear"
          role="button"
          tabindex="-1"
          aria-label="Clear selection"
          @click="clearSelection"
        >
          &#10005;
        </span>
        <span class="combobox__caret" aria-hidden="true" />
      </span>
    </button>

    <div v-if="isOpen" class="combobox__panel">
      <div class="combobox__search">
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          @keydown="onSearchKeydown"
        />
      </div>
      <ul :id="listboxId" class="combobox__list" role="listbox">
        <li
          v-for="(opt, index) in filteredOptions"
          :key="String(opt[optionValue])"
          :data-index="index"
          role="option"
          :aria-selected="opt[optionValue] === modelValue"
          class="combobox__option"
          :class="{ 'is-active': index === activeIndex, 'is-selected': opt[optionValue] === modelValue }"
          @mousedown.prevent="selectOption(opt)"
          @mouseenter="activeIndex = index"
        >
          {{ opt[optionLabel] }}
        </li>
        <li v-if="!filteredOptions.length" class="combobox__empty">{{ emptyText }}</li>
      </ul>
    </div>
  </div>
</template>
