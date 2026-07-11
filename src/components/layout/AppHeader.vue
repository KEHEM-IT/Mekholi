<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { user, logout } = useAuth()
</script>

<template>
  <header class="app-header">
    <span class="title">Mekholi ERP</span>
    <div class="actions">
      <span v-if="user" class="user-name">{{ user.name }}</span>
      <button v-if="user" class="btn btn--ghost" @click="logout">Logout</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.title {
  font-weight: 700;
  color: var(--color-text);
}

.user-name {
  color: var(--color-text-secondary);
  margin-right: 0.75rem;
}
</style>
