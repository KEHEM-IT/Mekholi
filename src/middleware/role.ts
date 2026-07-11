import type { NavigationGuardWithThis } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

export function requireRole(...roles: User['role'][]): NavigationGuardWithThis<undefined> {
  return () => {
    const store = useAuthStore()
    if (!store.user || !roles.includes(store.user.role)) {
      return { name: 'forbidden' }
    }
  }
}
