<script setup lang="ts">
// Global toast viewport — renders the shared toast queue from useToast().
// Mount once in App.vue so any page/composable can show toasts.
// Markup per toast:
//   .toast.toast--success|--error|--info|--warning
//     .toast__icon (fa-duotone) + .toast__message (+ .toast__action Undo)
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const TYPE_ICONS: Record<string, string> = {
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
  warning: 'fa-triangle-exclamation',
  info: 'fa-circle-info',
}

function runAction(toast: (typeof toasts.value)[number]) {
  if (toast.action) {
    toast.action.onClick()
    dismiss(toast.id)
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-viewport" aria-live="polite" role="status">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
        >
          <i class="fa-duotone toast__icon" :class="TYPE_ICONS[toast.type] ?? 'fa-circle-info'" />
          <span class="toast__message">{{ toast.message }}</span>
          <button
            v-if="toast.action"
            type="button"
            class="toast__action"
            @click="runAction(toast)"
          >
            <i class="fa-duotone fa-rotate-left" />
            {{ toast.action.label }}
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
