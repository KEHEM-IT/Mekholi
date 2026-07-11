<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import BaseButton from '@/components/ui/BaseButton.vue'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const { login } = useAuth()
const router = useRouter()
const route = useRoute()

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <h1>Sign in</h1>
    <label>
      Email
      <input v-model="email" type="email" required />
    </label>
    <label>
      Password
      <input v-model="password" type="password" required />
    </label>
    <p v-if="error" class="error">{{ error }}</p>
    <BaseButton type="submit" :disabled="loading">Sign in</BaseButton>
  </form>
</template>

<style scoped>
form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}
input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}
.error {
  color: #dc2626;
  font-size: 0.85rem;
}
</style>
