<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useSidebar } from '@/composables/useSidebar'
import { slugify } from '@/utils'
import { APP_NAME } from '@/utils/constants'
import type { NavigationMap, NavMenu } from '@/types'
import navigationJson from '@/assets/navigation/shikkha_erp_navigation.json'

const navigation = navigationJson.shikkha_erp_navigation as unknown as NavigationMap

const { user } = useAuth()
const { isCollapsed, isMobileOpen, closeMobile } = useSidebar()

const menus = computed<NavMenu[]>(() => (user.value ? (navigation[user.value.role] ?? []) : []))

// Accordion: one open sub-menu at a time.
const openMenu = ref<string | null>(null)

function toggleMenu(menu: string) {
  openMenu.value = openMenu.value === menu ? null : menu
}

function onNavigate() {
  closeMobile()
}
</script>

<template>
  <Transition name="fade">
    <div v-if="isMobileOpen" class="sidebar-backdrop" @click="closeMobile" />
  </Transition>

  <aside
    class="app-sidebar"
    :class="{ 'is-collapsed': isCollapsed, 'is-mobile-open': isMobileOpen }"
  >
    <div class="sidebar-brand">
      <span class="brand-mark"><i class="fa-duotone fa-graduation-cap" /></span>
      <span class="brand-name">{{ APP_NAME }}</span>
    </div>

    <nav class="sidebar-nav" aria-label="Primary">
      <template v-if="menus.length">
        <div v-for="item in menus" :key="item.menu" class="nav-group">
          <RouterLink
            v-if="item.menu === 'Dashboard'"
            to="/dashboard"
            class="nav-head"
            active-class="is-active"
            :title="item.menu"
            @click="onNavigate"
          >
            <i :class="['nav-icon', item.icon]" />
            <span class="nav-label">{{ item.menu }}</span>
          </RouterLink>

