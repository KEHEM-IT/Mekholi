<script setup lang="ts">
// Global toast viewport — renders the shared toast queue from useToast().
// Mount once in App.vue so any page/composable can show toasts.
// Markup per toast:
//   .toast.toast--success|--error|--info
//     .toast__icon (fa-duotone) + .toast__message
import { useToast } from '@/composables/useToast'

const { toasts } = useToast()

const TYPE_ICONS: Record<string, string> = {
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
  info: 'fa-circle-info',
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
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
