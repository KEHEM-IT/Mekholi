import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { TOKEN_KEY } from '@/utils/constants'
import { http } from '@/services/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

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
