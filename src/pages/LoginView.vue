<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { UserRole } from '@/types'
import devUsersJson from '@/assets/auth/dev_users.json'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const devLoadingRole = ref<UserRole | null>(null)

const { login, loginAsDev } = useAuth()
const router = useRouter()
const route = useRoute()

const devUsers = devUsersJson as { id: string; name: string; email: string; role: UserRole }[]

const roleMeta: Record<UserRole, { label: string; icon: string }> = {
  super_admin: { label: 'Super Admin', icon: 'fa-duotone fa-user-crown' },
  institute_admin: { label: 'Institute Admin', icon: 'fa-duotone fa-building-columns' },
  teacher: { label: 'Teacher', icon: 'fa-duotone fa-chalkboard-user' },
  accountant: { label: 'Accountant', icon: 'fa-duotone fa-calculator' },
  student_parent_portal: { label: 'Student / Parent', icon: 'fa-duotone fa-user-graduate' },
}

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await login(email.value, password.value)
    redirectAfterLogin()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function onDevLogin(role: UserRole) {
  devLoadingRole.value = role
  loginAsDev(role)
  redirectAfterLogin()
}

function redirectAfterLogin() {
  const redirect = (route.query.redirect as string) || '/dashboard'
  router.push(redirect)
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

  <div class="dev-login">
    <div class="dev-login__divider"><span>Dev quick login — preview a role</span></div>
    <div class="dev-login__grid">
      <button
        v-for="u in devUsers"
        :key="u.id"
        type="button"
        class="dev-login__card"
        :disabled="devLoadingRole !== null"
        @click="onDevLogin(u.role)"
      >
        <i :class="['dev-login__icon', roleMeta[u.role].icon]" />
        <span class="dev-login__label">{{ roleMeta[u.role].label }}</span>
        <span class="dev-login__email">{{ u.email }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../styles/abstracts' as *;

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dev-login {
  margin-top: $space-6;
  padding-top: $space-4;
  border-top: 1px dashed var(--color-border);
}

.dev-login__divider {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-bottom: $space-4;
}

.dev-login__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: $space-2;
}

.dev-login__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: $space-3;
  border: 1px solid var(--color-border);
  border-radius: $radius-md;
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    transform $transition-fast;

  &:hover:not(:disabled) {
    background: var(--color-surface-hover);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.dev-login__icon {
  font-size: 1.1rem;
  color: var(--color-primary);
}

.dev-login__label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text);
}

.dev-login__email {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
