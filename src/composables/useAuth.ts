import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const store = useAuthStore()
  const { user, isAuthenticated } = storeToRefs(store)

  return {
    user,
    isAuthenticated,
    login: store.login,
    logout: store.logout,
    fetchProfile: store.fetchProfile,
  }
}
