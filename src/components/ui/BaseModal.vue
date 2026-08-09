<script setup lang="ts">
// Reusable modal shell — teleports to <body>, locks body scroll while
// open, closes on Esc / overlay click / close button.
//
// Props: title (optional), wide (adds a wider panel), tall (adds a fixed
//   min-height panel — used by the tall form modals, e.g. Add Class/Section/
//   Group/Shift), closable (shows the ✕ button + allows Esc), closeOnOverlay
//   (clicking the dimmed backdrop closes the modal — set false to force the
//   ✕ button only, e.g. for forms where accidental dismissal would lose data)
// Events: close
// Slot: default (panel body)
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'

const props = withDefaults(
  defineProps<{
    title?: string
    wide?: boolean
    tall?: boolean
    /** Extra class(es) for the panel — lets a page scope its own modal sizing. */
    panelClass?: string
    closable?: boolean
    closeOnOverlay?: boolean
  }>(),
  {
    title: '',
    wide: false,
    tall: false,
    panelClass: '',
    closable: true,
    closeOnOverlay: true,
  },
)

const { t } = useTranslator()

const emit = defineEmits<{ close: [] }>()

const isClosing = ref(false)

function triggerClose() {
  if (isClosing.value) return
  isClosing.value = true
  setTimeout(() => {
    emit('close')
  }, 1000)
}

function onPanelClick(event: MouseEvent) {
  const btn = (event.target as HTMLElement).closest('button')
  if (btn) {
    const text = btn.textContent?.trim() || ''
    if (text === t('Cancel') || text === 'Cancel' || text === 'বাতিল' || btn.classList.contains('btn-cancel')) {
      event.preventDefault()
      event.stopPropagation()
      triggerClose()
    }
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closable) triggerClose()
}

function onClickOverlay(event: MouseEvent) {
  if (event.target === event.currentTarget && props.closable && props.closeOnOverlay) triggerClose()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" :class="{ 'is-closing': isClosing }" @mousedown.self="onClickOverlay">
      <div
        class="modal-panel"
        :class="[{ 'modal-panel--wide': wide, 'modal-panel--tall': tall, 'is-closing': isClosing }, panelClass]"
        role="dialog"
        aria-modal="true"
        @click.capture="onPanelClick"
      >
        <header class="modal-panel__head">
          <h3 class="modal-panel__title">
            <slot name="title">{{ title }}</slot>
          </h3>
          <button
            v-if="closable"
            type="button"
            class="modal-panel__close"
            :aria-label="t('Close')"
            @click="triggerClose"
          >
            <i class="fa-duotone fa-xmark" />
          </button>
        </header>
        <div class="modal-panel__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-panel__foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
