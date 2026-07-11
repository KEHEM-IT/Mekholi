<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useSidebar } from '@/composables/useSidebar'
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

