<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Generic catch-all for runtime/application errors (as opposed to
// NotFoundView, which handles unmatched routes). Reached either by
// navigating here directly or via the global app.config.errorHandler in
// main.ts, which forwards a message/details pair as query params.
const route = useRoute()
const router = useRouter()

const code = computed(() => (route.query.code as string) || '500')
const message = computed(
  () =>
    (route.query.message as string) ||
    "Something went wrong on our end. Please try again, and contact support if the problem continues.",
)
const details = computed(() => route.query.details as string | undefined)
</script>

<template>
  <section class="error-shell error-shell--danger">
    <div class="error-card">
      <div class="error-icon">
        <i class="fa-duotone fa-triangle-exclamation" />
      </div>
      <p class="error-code">{{ code }}</p>
      <h1 class="error-title">Something Went Wrong</h1>
      <p class="error-message">{{ message }}</p>
      <pre v-if="details" class="error-details">{{ details }}</pre>
      <div class="error-actions">
        <button type="button" class="btn btn--secondary" @click="router.go(0)">
          <i class="fa-duotone fa-rotate-right" />
          <span>Reload</span>
        </button>
        <RouterLink :to="{ name: 'home' }" class="btn btn--primary">
          <i class="fa-duotone fa-house" />
          <span>Go Home</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
