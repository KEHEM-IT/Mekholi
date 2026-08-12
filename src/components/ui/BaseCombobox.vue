<script setup lang="ts">
// Generic searchable dropdown ("combobox") for picking one item out of a
// flat option list — built for the BD geolocation cascades (Division /
// District / Upazila / Union, each ~50-500 rows and shown via their
// LookupText column) but written against plain `optionValue`/`optionLabel`
// keys so any array of records can be dropped in.
//
// `multiple` switches to multi-select: modelValue becomes an array, the
// control shows selected items as removable chips, and clicking an option
// toggles it while keeping the panel open.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useTranslator } from '@/Translator'

type ComboboxOption = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null | Array<string | number>
    options?: ComboboxOption[]
    optionValue?: string
    optionLabel?: string
    placeholder?: string
    searchPlaceholder?: string
    disabled?: boolean
    clearable?: boolean
    emptyText?: string
    multiple?: boolean
    invalid?: boolean
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
    multiple: false,
    invalid: false,
  },
)

const { t } = useTranslator()

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null | Array<string | number>]
  change: [option: ComboboxOption | null]
}>()

const listboxId = useId()
const root = ref<HTMLElement | null>(null)
const controlEl = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const displayPlaceholder = computed(() => props.placeholder || t('Select…'))
const displaySearchPlaceholder = computed(() => props.searchPlaceholder || t('Search…'))
const displayEmptyText = computed(() => props.emptyText || t('No results found'))

const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(-1)

/** Raw model value coerced to an array (works for single + multiple). */
const modelArray = computed<Array<string | number>>(() => {
  if (props.multiple) return (props.modelValue as Array<string | number> | null | undefined) ?? []
  const v = props.modelValue as string | number | null | undefined
  return v == null || v === '' ? [] : [v]
})

const selectedOptions = computed<ComboboxOption[]>(
  () =>
    props.options.filter(
      (opt) => modelArray.value.includes(opt[props.optionValue] as string | number),
    ) ?? [],
)

const selectedOption = computed<ComboboxOption | null>(() => selectedOptions.value[0] ?? null)

const truncatedSelectedText = computed<string>(() => {
  if (!selectedOption.value) return displayPlaceholder.value
  const label = String(selectedOption.value[props.optionLabel] ?? '')
  if (label.length > 20) {
    return label.substring(0, 20) + '...'
  }
  return label
})

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((opt) =>
    String(opt[props.optionLabel] ?? '')
      .toLowerCase()
      .includes(q),
  )
})

function isSelected(opt: ComboboxOption): boolean {
  return modelArray.value.includes(opt[props.optionValue] as string | number)
}

function open() {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  query.value = ''
  const selectedIdx = selectedOption.value
    ? props.options.findIndex((opt) => opt[props.optionValue] === modelArray.value[0])
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
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

function selectOption(opt: ComboboxOption) {
  const value = opt[props.optionValue] as string | number
  if (props.multiple) {
    // Toggle the option, keep the panel open for further picks.
    const next = modelArray.value.includes(value)
      ? modelArray.value.filter((v) => v !== value)
      : [...modelArray.value, value]
    emit('update:modelValue', next)
    emit('change', opt)
    searchInput.value?.focus()
    return
  }
  emit('update:modelValue', value)
  emit('change', opt)
  close(true)
}

function removeChip(value: string | number, event: Event) {
  event.stopPropagation()
  if (!props.multiple) return
  emit('update:modelValue', modelArray.value.filter((v) => v !== value))
}

function clearSelection(event: Event) {
  event.stopPropagation()
  emit('update:modelValue', props.multiple ? [] : null)
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
    case 'Enter': {
      event.preventDefault()
      const opt = filteredOptions.value[activeIndex.value]
      if (activeIndex.value >= 0 && opt) {
        selectOption(opt)
      }
      break
    }
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
  <div ref="root" class="combobox" :class="{ 'is-open': isOpen, 'is-disabled': disabled, 'is-error': invalid }">
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
      <span class="combobox__value" :class="{ 'is-placeholder': !selectedOptions.length }">
        <!-- Multi-select: show removable chips -->
        <template v-if="multiple">
          <span
            v-for="chip in selectedOptions"
            :key="String(chip[optionValue])"
            class="combobox__chip"
            :title="String(chip[optionLabel] ?? '')"
          >
            {{ String(chip[optionLabel] ?? '') }}
            <span
              class="combobox__chip-x"
              role="button"
              tabindex="-1"
              :aria-label="'Remove ' + String(chip[optionLabel] ?? '')"
              @click="removeChip(chip[optionValue] as string | number, $event)"
            >
              &#10005;
            </span>
          </span>
          <span v-if="!selectedOptions.length" class="combobox__chip-placeholder">{{
            displayPlaceholder
          }}</span>
        </template>
        <!-- Single select -->
        <template v-else>
          {{ truncatedSelectedText }}
        </template>
      </span>
      <span class="combobox__actions">
        <span
          v-if="clearable && selectedOptions.length && !disabled"
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
          :placeholder="displaySearchPlaceholder"
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
          :aria-selected="isSelected(opt)"
          class="combobox__option"
          :class="{ 'is-active': index === activeIndex, 'is-selected': isSelected(opt) }"
          @mousedown.prevent="selectOption(opt)"
          @mouseenter="activeIndex = index"
        >
          <span
            v-if="multiple"
            class="combobox__check"
            :class="{ 'is-checked': isSelected(opt) }"
          >
            <i v-if="isSelected(opt)" class="fa-solid fa-check" />
          </span>
          <span class="combobox__option-text" :title="String(opt[optionLabel])">{{ opt[optionLabel] }}</span>
        </li>
        <li v-if="!filteredOptions.length" class="combobox__empty">{{ displayEmptyText }}</li>
      </ul>
    </div>
  </div>
</template>
