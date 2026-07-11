import type { NavigationGuardWithThis } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const requireAuth: NavigationGuardWithThis<undefined> = (to) => {
  const store = useAuthStore()
  if (!store.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
}
