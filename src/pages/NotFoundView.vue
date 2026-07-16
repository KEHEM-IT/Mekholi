<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'home' })
  }
}
</script>

<template>
  <section class="error-shell">
    <div class="error-card">
      <div class="error-icon">
        <i class="fa-duotone fa-signs-post" />
      </div>
      <p class="error-code">404</p>
      <h1 class="error-title">Page Not Found</h1>
      <p class="error-message">
        The page you're looking for doesn't exist, may have been moved, or the
        web address was typed incorrectly.
      </p>
      <div class="error-actions">
        <button type="button" class="btn btn--secondary" @click="goBack">
          <i class="fa-duotone fa-arrow-left" />
          <span>Go Back</span>
        </button>
        <RouterLink :to="{ name: 'home' }" class="btn btn--primary">
          <i class="fa-duotone fa-house" />
          <span>Go Home</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
