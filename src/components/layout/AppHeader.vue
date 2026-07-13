<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useSidebar } from '@/composables/useSidebar'
import { useShortcutKeySet } from '@/composables/shortcut_key_set'
import { getInitials } from '@/utils'
import { ROLE_LABELS } from '@/utils/constants'
import type { NotificationItem } from '@/types'

const { user, logout } = useAuth()
const { toggleCollapsed, toggleMobile } = useSidebar()

function toggleSidebar() {
  if (window.matchMedia('(min-width: 1024px)').matches) {
    toggleCollapsed()
  } else {
    toggleMobile()
  }
}

// Ctrl+M collapses/expands the sidebar (or opens/closes the mobile drawer
// below the lg breakpoint) from anywhere in the app, mirroring the header
// toggle button.
useShortcutKeySet([{ key: 'm', ctrl: true, handler: () => toggleSidebar() }])

const roleLabel = computed(() => (user.value ? (ROLE_LABELS[user.value.role] ?? user.value.role) : ''))

// --- Notifications ---------------------------------------------------
const notifications = ref<NotificationItem[]>([
  {
    id: '1',
    title: 'Fee payment received',
    description: 'bKash payment confirmed for Student ID 10231',
    time: '5m ago',
    read: false,
    icon: 'fa-duotone fa-money-bill-trend-up',
  },
  {
    id: '2',
    title: 'Result published',
    description: 'Half-yearly exam result is live for Class 9',
    time: '1h ago',
    read: false,
    icon: 'fa-duotone fa-bullhorn',
  },
  {
    id: '3',
    title: 'Leave request pending',
    description: 'A staff leave request needs your approval',
    time: 'Yesterday',
    read: true,
    icon: 'fa-duotone fa-plane-departure',
  },
])

const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

function markAllRead() {
  notifications.value = notifications.value.map((n) => ({ ...n, read: true }))
}

// --- Dropdown open/close ---------------------------------------------
const isNotifOpen = ref(false)
const isProfileOpen = ref(false)
const notifRef = ref<HTMLElement | null>(null)
const profileRef = ref<HTMLElement | null>(null)

function toggleNotif() {
  isNotifOpen.value = !isNotifOpen.value
  isProfileOpen.value = false
}

function toggleProfile() {
  isProfileOpen.value = !isProfileOpen.value
  isNotifOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (notifRef.value && !notifRef.value.contains(target)) isNotifOpen.value = false
  if (profileRef.value && !profileRef.value.contains(target)) isProfileOpen.value = false
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isNotifOpen.value = false
    isProfileOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onEscape)
})
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <button type="button" class="icon-btn" aria-label="Toggle menu" @click="toggleSidebar">
        <i class="fa-duotone fa-bars" />
      </button>
    </div>

    <div class="header-right">
      <!-- Notifications -->
      <div ref="notifRef" class="dropdown-anchor">
        <button
          type="button"
          class="icon-btn"
          aria-label="Notifications"
          :aria-expanded="isNotifOpen"
          @click="toggleNotif"
        >
          <i class="fa-duotone fa-bell" />
          <span v-if="unreadCount" class="badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>

        <Transition name="pop">
          <div v-if="isNotifOpen" class="dropdown-panel notif-panel">
            <div class="panel-header">
              <span>Notifications</span>
              <button v-if="unreadCount" type="button" class="link-btn" @click="markAllRead">
                Mark all read
              </button>
            </div>
            <ul v-if="notifications.length" class="notif-list">
              <li v-for="n in notifications" :key="n.id" class="notif-item" :class="{ 'is-unread': !n.read }">
                <i :class="['notif-icon', n.icon]" />
                <div class="notif-body">
                  <p class="notif-title">{{ n.title }}</p>
                  <p class="notif-desc">{{ n.description }}</p>
                  <span class="notif-time">{{ n.time }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="panel-empty">You're all caught up.</p>
          </div>
        </Transition>
      </div>

      <!-- Profile -->
      <div ref="profileRef" class="dropdown-anchor">
        <button
          type="button"
          class="profile-btn"
          :aria-expanded="isProfileOpen"
          @click="toggleProfile"
        >
          <span class="avatar">{{ user ? getInitials(user.name) : '' }}</span>
          <span class="profile-meta">
            <span class="profile-name">{{ user?.name }}</span>
            <span class="profile-role">{{ roleLabel }}</span>
          </span>
          <i class="fa-duotone fa-chevron-down profile-chevron" :class="{ 'is-open': isProfileOpen }" />
        </button>

        <Transition name="pop">
          <div v-if="isProfileOpen" class="dropdown-panel profile-panel">
            <div class="profile-panel-header">
              <span class="avatar avatar--lg">{{ user ? getInitials(user.name) : '' }}</span>
              <div class="profile-panel-info">
                <p class="profile-panel-name">{{ user?.name }}</p>
                <p class="profile-panel-email">{{ user?.email }}</p>
              </div>
            </div>

            <ul class="profile-menu">
              <li>
                <button type="button" class="profile-menu-item">
                  <i class="fa-duotone fa-user" />
                  <span>View Profile</span>
                </button>
              </li>
              <li>
                <button type="button" class="profile-menu-item">
                  <i class="fa-duotone fa-gear" />
                  <span>Account Settings</span>
                </button>
              </li>
            </ul>

            <div class="profile-panel-divider" />

            <button type="button" class="profile-menu-item profile-menu-item--danger" @click="logout">
              <i class="fa-duotone fa-arrow-right-from-bracket" />
              <span>Log out</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

