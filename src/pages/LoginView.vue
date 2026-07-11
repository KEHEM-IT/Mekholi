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
  <form class="login-form" @submit.prevent="onSubmit">
    <h1>Sign in</h1>
    <div class="form-field">
      <label for="email">Email</label>
      <input id="email" v-model="email" type="email" required />
    </div>
    <div class="form-field">
      <label for="password">Password</label>
      <input id="password" v-model="password" type="password" required />
    </div>
    <p v-if="error" class="form-error">{{ error }}</p>
    <BaseButton type="submit" :disabled="loading">Sign in</BaseButton>
  </form>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
