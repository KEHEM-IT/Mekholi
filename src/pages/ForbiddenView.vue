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
  <section class="error-shell error-shell--warning">
    <div class="error-card">
      <div class="error-icon">
        <i class="fa-duotone fa-lock" />
      </div>
      <p class="error-code">403</p>
      <h1 class="error-title">Forbidden</h1>
      <p class="error-message">
        You don't have permission to view this page. If you think this is a
        mistake, contact your institute administrator.
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
