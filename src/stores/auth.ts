import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { TOKEN_KEY } from '@/utils/constants'
import { http } from '@/services/http'

// Dev-only stand-in so the app (sidebar, role-based menus, guards) is
// usable before a real backend/login flow exists. Never runs in a
// production build — import.meta.env.DEV is false once built.
const DEV_USER: User = {
  id: 'dev-super-admin',
  name: 'Dev Super Admin',
  email: 'dev@mekholi.local',
  role: 'super_admin',
}
const DEV_TOKEN = 'dev-token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

  if (import.meta.env.DEV) {
    user.value = DEV_USER
    if (!token.value) {
      token.value = DEV_TOKEN
      localStorage.setItem(TOKEN_KEY, DEV_TOKEN)
    }
  }

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await http.post<{ token: string; user: User }>('/auth/login', { email, password }, { auth: false })
    token.value = res.token
    user.value = res.user
    localStorage.setItem(TOKEN_KEY, res.token)
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

  return { user, token, isAuthenticated, login, logout, fetchProfile }
})
