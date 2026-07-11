import { ref } from 'vue'
import { SIDEBAR_COLLAPSED_KEY } from '@/utils/constants'

// Module-level (singleton) state so AppHeader and AppSidebar share
// the exact same collapse/drawer state without prop-drilling or a store.
const isCollapsed = ref(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
const isMobileOpen = ref(false)

export function useSidebar() {
  function toggleCollapsed() {
    isCollapsed.value = !isCollapsed.value
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed.value ? '1' : '0')
  }

  function toggleMobile() {
    isMobileOpen.value = !isMobileOpen.value
  }

  function closeMobile() {
    isMobileOpen.value = false
  }

  return {
    isCollapsed,
    isMobileOpen,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  }
}
