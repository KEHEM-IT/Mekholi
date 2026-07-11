import type { NavigationGuardWithThis } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const requireGuest: NavigationGuardWithThis<undefined> = () => {
  const store = useAuthStore()
  if (store.isAuthenticated) {
    return { name: 'dashboard' }
  }
}
