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

          <button
            v-else
            type="button"
            class="nav-head"
            :class="{ 'is-open': openMenu === item.menu }"
            :aria-expanded="openMenu === item.menu"
            :aria-controls="`submenu-${slugify(item.menu)}`"
            :title="item.menu"
            @click="toggleMenu(item.menu)"
          >
            <i :class="['nav-icon', item.icon]" />
            <span class="nav-label">{{ item.menu }}</span>
            <i class="nav-chevron fa-duotone fa-chevron-down" />
          </button>

          <div
            v-if="item.menu !== 'Dashboard'"
            :id="`submenu-${slugify(item.menu)}`"
            class="submenu-wrapper"
            :class="{ 'is-open': openMenu === item.menu }"
          >
            <ul class="submenu">
              <li v-for="sub in item.sub_menus" :key="sub.name">
                <button type="button" class="submenu-link" @click="onNavigate">
                  <i :class="['submenu-icon', sub.icon]" />
                  <span>{{ sub.name }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <p v-else class="nav-empty">Sign in to see your menu.</p>
    </nav>
  </aside>
</template>

<style scoped lang="scss">
@use '../../styles/abstracts' as *;

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 40;

  @include respond-to(lg) {
    display: none;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-base;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

