<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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

// One open sub-menu at a time. Expanded sidebar: inline accordion.
// Collapsed sidebar (desktop): flyout panel to the right of the icon.
const openMenu = ref<string | null>(null)
const sidebarRef = ref<HTMLElement | null>(null)

function toggleMenu(menu: string) {
  openMenu.value = openMenu.value === menu ? null : menu
}

function onNavigate() {
  closeMobile()
  openMenu.value = null
}

function onDocumentClick(e: MouseEvent) {
  if (!openMenu.value) return
  if (sidebarRef.value && !sidebarRef.value.contains(e.target as Node)) {
    openMenu.value = null
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <Transition name="fade">
    <div v-if="isMobileOpen" class="sidebar-backdrop" @click="closeMobile" />
  </Transition>

  <aside
    ref="sidebarRef"
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

.app-sidebar {
  --sidebar-width: 264px;
  --sidebar-width-collapsed: 76px;

  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width $transition-base;

  // Mobile: fixed off-canvas drawer.
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  transform: translateX(-100%);
  transition:
    transform $transition-base,
    width $transition-base;

  &.is-mobile-open {
    transform: translateX(0);
    box-shadow: var(--shadow-card);
  }

  @include respond-to(lg) {
    position: sticky;
    top: 0;
    height: 100vh;
    transform: none;
    z-index: auto;
  }

  &.is-collapsed {
    @include respond-to(lg) {
      width: var(--sidebar-width-collapsed);
    }
  }
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4 $space-4;
  min-height: 64px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  background: var(--color-primary-muted);
  color: var(--color-primary);
  font-size: 1.05rem;
  flex-shrink: 0;
}

.brand-name {
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  letter-spacing: 0.01em;

  .is-collapsed & {
    @include respond-to(lg) {
      display: none;
    }
  }
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: $space-3;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border-strong);
    border-radius: $radius-sm;
  }
}

.nav-empty {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  padding: $space-3;
}

.nav-head {
  display: flex;
  align-items: center;
  gap: $space-3;
  width: 100%;
  padding: $space-3;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: $radius-md;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  text-align: left;
  text-decoration: none;
  transition:
    background-color $transition-fast,
    color $transition-fast;

  &:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  &.is-active {
    background: var(--color-primary-muted);
    color: var(--color-primary);
  }

  &.is-open {
    color: var(--color-text);
  }
}

.nav-icon {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  font-size: 1rem;
}

.nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .is-collapsed & {
    @include respond-to(lg) {
      display: none;
    }
  }
}

.nav-chevron {
  flex-shrink: 0;
  font-size: 0.75rem;
  transition: transform $transition-fast;

  .is-open & {
    transform: rotate(180deg);
  }

  .is-collapsed & {
    @include respond-to(lg) {
      display: none;
    }
  }
}

.nav-group {
  position: relative;
}

// CSS grid-rows trick: animates height without knowing content size.
// Expanded sidebar: inline accordion below the icon.
// Collapsed sidebar (desktop): flyout panel to the right of the icon.
.submenu-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows $transition-base;

  &.is-open {
    grid-template-rows: 1fr;
  }

  .is-collapsed & {
    @include respond-to(lg) {
      display: block;
      position: absolute;
      top: 0;
      left: calc(100% + #{$space-2});
      width: max-content;
      min-width: 190px;
      max-width: 260px;
      max-height: 0;
      opacity: 0;
      visibility: hidden;
      overflow: hidden;
      pointer-events: none;
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      box-shadow: var(--shadow-card);
      padding: $space-2;
      z-index: 60;
      transition:
        opacity $transition-fast,
        visibility $transition-fast,
        max-height $transition-base;
    }
  }

  .is-collapsed &.is-open {
    @include respond-to(lg) {
      max-height: 70vh;
      opacity: 1;
      visibility: visible;
      overflow-y: auto;
      pointer-events: auto;
    }
  }
}

.submenu {
  overflow: hidden;
  min-height: 0;
  list-style: none;
  margin: 2px 0 0;
  padding: 0 0 0 $space-4;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-left: 1px solid var(--color-border);
  margin-left: $space-4;

  .is-collapsed & {
    @include respond-to(lg) {
      border-left: none;
      margin: 0;
      padding: 0;
    }
  }
}

.submenu-link {
  display: flex;
  align-items: center;
  gap: $space-2;
  width: 100%;
  padding: $space-2 $space-3;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: $radius-sm;
  cursor: pointer;
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  transition:
    background-color $transition-fast,
    color $transition-fast;

  &:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
}

.submenu-icon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>
