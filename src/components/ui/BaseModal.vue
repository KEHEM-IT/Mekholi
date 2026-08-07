<script setup lang="ts">
// Reusable modal shell — teleports to <body>, locks body scroll while
// open, closes on Esc / overlay click / close button.
//
// Props: title (optional), wide (adds a wider panel), closable (shows the
//   ✕ button + allows Esc), closeOnOverlay (clicking the dimmed backdrop
//   closes the modal — set false to force the ✕ button only, e.g. for
//   forms where accidental dismissal would lose data)
// Events: close
// Slot: default (panel body)
import { onBeforeUnmount, onMounted } from 'vue'
import { useTranslator } from '@/Translator'

const props = withDefaults(
  defineProps<{
    title?: string
    wide?: boolean
    closable?: boolean
    closeOnOverlay?: boolean
  }>(),
  {
    title: '',
    wide: false,
    closable: true,
    closeOnOverlay: true,
  },
)

const { t } = useTranslator()

const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closable) emit('close')
}

function onClickOverlay(event: MouseEvent) {
  if (event.target === event.currentTarget && props.closable && props.closeOnOverlay) emit('close')
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
    <div class="modal-overlay" @mousedown.self="onClickOverlay">
      <div class="modal-panel" :class="{ 'modal-panel--wide': wide }" role="dialog" aria-modal="true">
        <header class="modal-panel__head">
          <h3 class="modal-panel__title">
            <slot name="title">{{ title }}</slot>
          </h3>
          <button
            v-if="closable"
            type="button"
            class="modal-panel__close"
            :aria-label="t('Close')"
            @click="emit('close')"
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
