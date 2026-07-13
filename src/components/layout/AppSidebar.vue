<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useSidebar } from "@/composables/useSidebar";
import { slugify } from "@/utils";
import { APP_NAME } from "@/utils/constants";
import type { NavigationMap, NavMenu } from "@/types";
import navigationJson from "@/assets/navigation/shikkha_erp_navigation.json";

const navigation = navigationJson.shikkha_erp_navigation as unknown as NavigationMap;

const { user } = useAuth();
const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();

const menus = computed<NavMenu[]>(() => (user.value ? (navigation[user.value.role] ?? []) : []));

// --- Search ---------------------------------------------------------------

const searchQuery = ref("");
const isSearching = computed(() => searchQuery.value.trim().length > 0);

const filteredMenus = computed<NavMenu[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return menus.value;

  const result: NavMenu[] = [];
  for (const item of menus.value) {
    const menuMatches = item.menu.toLowerCase().includes(q);
    const matchedSubs = item.sub_menus?.filter((sub) => sub.name.toLowerCase().includes(q)) ?? [];

    if (menuMatches || matchedSubs.length) {
      result.push(menuMatches ? item : { ...item, sub_menus: matchedSubs });
    }
  }
  return result;
});

function clearSearch() {
  searchQuery.value = "";
}

// --- Accordion / flyout submenu -------------------------------------------
// One open sub-menu at a time. Expanded sidebar: inline accordion.
// Collapsed sidebar (desktop): flyout panel to the right of the icon,
// positioned via JS (fixed) so it can escape the sidebar's overflow clipping
// instead of being invisibly cut off at the sidebar's edge.
const openMenu = ref<string | null>(null);
const flyoutPos = ref<{ top: number; left: number } | null>(null);
const sidebarRef = ref<HTMLElement | null>(null);
const navRef = ref<HTMLElement | null>(null);

function isMenuOpen(menu: string) {
  // Search auto-expands matches, but only for the inline accordion (expanded
  // sidebar) - collapsed flyouts only ever open from an explicit click,
  // since that's what gives us a button rect to position the flyout from.
  if (isCollapsed.value) return openMenu.value === menu;
  return isSearching.value ? true : openMenu.value === menu;
}

function toggleMenu(menu: string, event?: MouseEvent) {
  const wasOpen = openMenu.value === menu;
  openMenu.value = wasOpen ? null : menu;

  if (!wasOpen && isCollapsed.value && event) {
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    flyoutPos.value = { top: rect.top, left: rect.right + 8 };
  } else {
    flyoutPos.value = null;
  }
}

// Collapsed sidebar only turns into an icon rail at the lg breakpoint
// (must match $breakpoint-lg in _variables.scss) - below that, "collapsed"
// still renders as a full drawer, so hover-to-open shouldn't apply there.
function isDesktopViewport() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

// --- Hover-to-open (collapsed desktop) -------------------------------------
// Click still works (keyboard/accessibility), but on the collapsed desktop
// rail, hovering the icon opens its flyout directly. A short close delay
// lets the pointer cross the gap between the icon and the flyout panel
// without the flyout closing first.
const HOVER_CLOSE_DELAY = 150;
let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

function clearHoverCloseTimer() {
  if (hoverCloseTimer !== null) {
    clearTimeout(hoverCloseTimer);
    hoverCloseTimer = null;
  }
}

function onGroupMouseEnter(item: NavMenu, event: MouseEvent) {
  if (item.menu === "Dashboard" || !isCollapsed.value || !isDesktopViewport()) return;
  clearHoverCloseTimer();

  const groupEl = event.currentTarget as HTMLElement;
  const headEl = groupEl.querySelector(".nav-head") as HTMLElement | null;
  const rect = (headEl ?? groupEl).getBoundingClientRect();

  flyoutPos.value = { top: rect.top, left: rect.right + 8 };
  openMenu.value = item.menu;
}

function onGroupMouseLeave(item: NavMenu) {
  if (!isCollapsed.value) return;
  clearHoverCloseTimer();
  hoverCloseTimer = setTimeout(() => {
    if (openMenu.value === item.menu) {
      openMenu.value = null;
      flyoutPos.value = null;
    }
  }, HOVER_CLOSE_DELAY);
}

function onNavigate() {
  closeMobile();
  openMenu.value = null;
  flyoutPos.value = null;
  clearHoverCloseTimer();
}

function onDocumentClick(e: MouseEvent) {
  if (!openMenu.value) return;
  if (sidebarRef.value && !sidebarRef.value.contains(e.target as Node)) {
    openMenu.value = null;
    flyoutPos.value = null;
  }
}

// The flyout's position is computed once at click time; it goes stale on
// scroll/resize, so just close it rather than tracking it live.
function closeFlyoutIfCollapsed() {
  if (isCollapsed.value && openMenu.value) {
    openMenu.value = null;
    flyoutPos.value = null;
  }
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  window.addEventListener("resize", closeFlyoutIfCollapsed);
  navRef.value?.addEventListener("scroll", closeFlyoutIfCollapsed, { passive: true });
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  window.removeEventListener("resize", closeFlyoutIfCollapsed);
  navRef.value?.removeEventListener("scroll", closeFlyoutIfCollapsed);
  clearHoverCloseTimer();
});
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

    <div class="sidebar-search">
      <i class="fa-duotone fa-magnifying-glass search-icon" />
      <input
        v-model="searchQuery"
        type="search"
        class="search-input"
        placeholder="Search menu..."
        aria-label="Search menu"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="search-clear"
        aria-label="Clear search"
        @click="clearSearch"
      >
        <i class="fa-duotone fa-xmark" />
      </button>
    </div>

    <nav ref="navRef" class="sidebar-nav" aria-label="Primary">
      <template v-if="filteredMenus.length">
        <div
          v-for="item in filteredMenus"
          :key="item.menu"
          class="nav-group"
          @mouseenter="onGroupMouseEnter(item, $event)"
          @mouseleave="onGroupMouseLeave(item)"
        >
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
            :class="{ 'is-open': isMenuOpen(item.menu) }"
            :aria-expanded="isMenuOpen(item.menu)"
            :aria-controls="`submenu-${slugify(item.menu)}`"
            :title="item.menu"
            @click="toggleMenu(item.menu, $event)"
          >
            <i :class="['nav-icon', item.icon]" />
            <span class="nav-label">{{ item.menu }}</span>
            <i class="nav-chevron fa-duotone fa-chevron-down" />
          </button>

          <div
            v-if="item.menu !== 'Dashboard'"
            :id="`submenu-${slugify(item.menu)}`"
            class="submenu-wrapper"
            :class="{ 'is-open': isMenuOpen(item.menu) }"
            :style="
              isCollapsed && openMenu === item.menu && flyoutPos
                ? { top: flyoutPos.top + 'px', left: flyoutPos.left + 'px' }
                : undefined
            "
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

      <p v-else-if="isSearching" class="nav-empty">No menus match "{{ searchQuery }}".</p>
      <p v-else class="nav-empty">Sign in to see your menu.</p>
    </nav>
  </aside>
</template>
