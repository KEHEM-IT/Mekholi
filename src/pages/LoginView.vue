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
