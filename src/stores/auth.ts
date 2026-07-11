import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from '@/types'
import { TOKEN_KEY } from '@/utils/constants'
import { http } from '@/services/http'
import devUsersJson from '@/assets/auth/dev_users.json'

// Dev-only demo accounts, one per role — power the role-picker on the
// login page (loginAsDev) so you can preview each role's menu/permissions
// before a real backend/login flow exists. Never used in production.
const devUsers = devUsersJson as User[]
const DEV_TOKEN_PREFIX = 'dev-token-'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

  // Clear the old flat 'dev-token' left over from a previous dev seed —
  // it has no role encoded in it, so it can't be rehydrated below.
  if (token.value === 'dev-token') {
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  // Rehydrate the demo user on page refresh (only the token string is
  // persisted, not the user object).
  if (token.value?.startsWith(DEV_TOKEN_PREFIX)) {
    const role = token.value.slice(DEV_TOKEN_PREFIX.length) as UserRole
    user.value = devUsers.find((u) => u.role === role) ?? null
  }

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await http.post<{ token: string; user: User }>('/auth/login', { email, password }, { auth: false })
    token.value = res.token
    user.value = res.user
    localStorage.setItem(TOKEN_KEY, res.token)
  }

  // Dev-only: instantly sign in as one of the demo role accounts —
  // called by the login page's role-picker.
  function loginAsDev(role: UserRole) {
    const demoUser = devUsers.find((u) => u.role === role)
    if (!demoUser) return
    const devToken = `${DEV_TOKEN_PREFIX}${role}`
    user.value = demoUser
    token.value = devToken
    localStorage.setItem(TOKEN_KEY, devToken)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  async function fetchProfile() {
    if (!token.value) return
    user.value = await http.get<User>('/auth/me')
  }

  return { user, token, isAuthenticated, login, loginAsDev, logout, fetchProfile }
})
