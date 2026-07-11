<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { user } = useAuth()
</script>

<template>
  <section>
    <h1>Dashboard</h1>
    <p v-if="user">Welcome back, {{ user.name }}.</p>
  </section>
</template>
