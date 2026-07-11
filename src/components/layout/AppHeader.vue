<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { user, logout } = useAuth()
</script>

<template>
  <header class="app-header">
    <span class="title">Madol ERP</span>
    <div class="actions">
      <span v-if="user">{{ user.name }}</span>
      <button v-if="user" @click="logout">Logout</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
</style>
