<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTranslator } from "@/Translator";
import { useAuth } from "@/composables/useAuth";
import { useSidebar } from "@/composables/useSidebar";
import { useShortcutKeySet } from "@/composables/shortcut_key_set";
import { slugify } from "@/utils";
import { APP_NAME } from "@/utils/constants";
import type { NavigationMap, NavMenu, NavSubMenu } from "@/types";
import navigationJson from "@/assets/navigation/shikkha_erp_navigation.json";

const navigation = navigationJson.shikkha_erp_navigation as unknown as NavigationMap;

const { user } = useAuth();
const { isCollapsed, isMobileOpen, toggleCollapsed, closeMobile } = useSidebar();
const { localized } = useTranslator();
const router = useRouter();
const route = useRoute();

// Accordion / flyout submenu state — one open sub-menu at a time.
// Declared BEFORE the route watcher below (which opens the parent menu of
// the current route immediately on setup); a `const` below it would hit the
// temporal dead zone and throw "Cannot access 'openMenu' before
// initialization" from the immediate watcher callback.
const openMenu = ref<string | null>(null);

// Active-route tracking — highlight the submenu that matches the current
// route, and keep its parent menu open after navigation.
const activeRouteName = computed(() => route.name as string | undefined);

/** True when a submenu's route is the current route. */
function isSubActive(sub: NavSubMenu): boolean {
  const routeName = SUBMENU_ROUTES[sub.name];
  return !!routeName && routeName === activeRouteName.value;
}

/** True when any submenu of a menu matches the current route. */
function isMenuActive(item: NavMenu): boolean {
  return (item.sub_menus ?? []).some(isSubActive);
}

function menuLabel(item: NavMenu) {
  return localized(item, "menu");
}

function subLabel(sub: NavSubMenu) {
  return localized(sub, "name");
}

// Sub-menu items are mostly placeholders (Core + Plugin blueprint - most
// modules aren't built yet), so only the sub-menus with a real page behind
// them navigate; keyed by the sub-menu's stable English name from the nav
// JSON. Everything else just closes the sidebar, same as before.
const SUBMENU_ROUTES: Record<string, string> = {
  "Language & Theme (Bilingual)": "settings-language-theme",
  // Institute Setup
  "Institute Dashboard": "institute-setup",
  "Institute Profile": "institute-profile",
  "Branches/Campus": "institute-setup-branches",
  "Academic Year": "institute-setup-academic-year",
  "Class/Section/Group/Shift": "institute-setup-classes",
  "Holidays & Working Days": "institute-setup-holidays",
  "Grading Scheme": "institute-setup-grading",
  "Board & Regulatory Setup": "institute-setup-boards",
  "Subjects & Curriculum": "institute-setup-subjects",
  "Exam Terms & Types": "institute-setup-exam-terms",
  "Classrooms / Rooms / Buildings": "institute-setup-rooms",
  "Academic Sessions & Terms": "institute-setup-sessions",
};

function onSubmenuClick(sub: NavSubMenu) {
  const routeName = SUBMENU_ROUTES[sub.name];
  if (!routeName) return;
  router.push({ name: routeName });
  // Keep the parent menu open so the user sees where they are.
  const parent = menus.value.find((m) => (m.sub_menus ?? []).some((x) => x.name === sub.name));
  if (parent && parent.menu !== "Dashboard") openMenu.value = parent.menu;
  closeMobile();
  clearHoverCloseTimer();
}

const menus = computed<NavMenu[]>(() => (user.value ? (navigation[user.value.role] ?? []) : []));

// Sidebar skeleton — shown briefly while the user/menus initialize.
const isSidebarLoading = ref(true);
const SIDEBAR_SKELETON_MS = 2000;

onMounted(() => {
  setTimeout(() => {
    isSidebarLoading.value = false;
  }, SIDEBAR_SKELETON_MS);
});

// Auto-open the parent menu of the current route (deep links / reloads).
watch(
  [menus, activeRouteName],
  () => {
    if (isCollapsed.value) return; // collapsed rail uses hover flyouts
    const parent = menus.value.find((m) => (m.sub_menus ?? []).some(isSubActive));
    if (parent && parent.menu !== "Dashboard") openMenu.value = parent.menu;
  },
  { immediate: true },
);

// --- Search ---------------------------------------------------------------

const searchQuery = ref("");
const searchInputRef = ref<HTMLInputElement | null>(null);
const isSearching = computed(() => searchQuery.value.trim().length > 0);

// Ctrl+K focuses (and selects) the sidebar search input, from anywhere in
// the app - including while typing in another field, hence allowInInputs.
// If the desktop rail is collapsed to icons-only, expand it first so the
// search field actually exists to be focused; nextTick waits for that
// reactive class change to apply before the focus() call runs.
//
// Escape clears the search box, but only when it's the field that's
// actually focused - a bare "Escape" key match would otherwise fire this
// binding (and swallow the keystroke) no matter where focus is on the page.
useShortcutKeySet([
  {
    key: "k",
    ctrl: true,
    allowInInputs: true,
    handler: () => {
      if (isCollapsed.value) toggleCollapsed();
      nextTick(() => {
        searchInputRef.value?.focus();
        searchInputRef.value?.select();
      });
    },
  },
  {
    key: "Escape",
    allowInInputs: true,
    handler: () => {
      if (document.activeElement !== searchInputRef.value) return;
      clearSearch();
    },
  },
]);

// A label matches when the query is found in ANY language variant
// (English or Bengali today; future languages just add more fields).
function labelMatches(label: string, labelBn: string, q: string): boolean {
  return label.toLowerCase().includes(q) || labelBn.toLowerCase().includes(q);
}

const filteredMenus = computed<NavMenu[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return menus.value;

  const result: NavMenu[] = [];
  for (const item of menus.value) {
    const menuMatches = labelMatches(item.menu, item.menu_bn, q);
    const matchedSubs =
      item.sub_menus?.filter((sub) => labelMatches(sub.name, sub.name_bn, q)) ?? [];

    if (menuMatches || matchedSubs.length) {
      result.push(menuMatches ? item : { ...item, sub_menus: matchedSubs });
    }
  }
  return result;
});

function clearSearch() {
  searchQuery.value = "";
}

// Wraps the portion of `text` matching the current search query in a
// <mark>, HTML-escaped so menu/sub-menu labels (rendered via v-html below)
// can't inject markup. Matching mirrors filteredMenus above: plain
// case-insensitive substring, first occurrence only.
const HTML_ESCAPES: Record<"&" | "<" | ">" | '"' | "'", string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char as keyof typeof HTML_ESCAPES]);
}

function highlightMatch(text: string) {
  const q = searchQuery.value.trim();
  if (!q) return escapeHtml(text);

  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) {
    // Query typed in another language — the label may be the opposite
    // language's variant. Highlight nothing rather than force a match.
    return escapeHtml(text);
  }
  if (idx === -1) return escapeHtml(text);

  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length));
  return `${before}<mark class="search-highlight">${match}</mark>${after}`;
}

// --- Accordion / flyout submenu -------------------------------------------
// One open sub-menu at a time. Expanded sidebar: inline accordion.
// Collapsed sidebar (desktop): flyout panel to the right of the icon,
// positioned via JS (fixed) so it can escape the sidebar's overflow clipping
// instead of being invisibly cut off at the sidebar's edge.
// (openMenu itself is declared at the top of the script — see above.)
// Last known flyout position per menu, keyed by menu name. Deliberately
// never deleted on close - the panel fades out via the `is-open` class
// instead, and if an entry vanished the instant its menu closed, the
// inline top/left would disappear mid-fade and the panel would visibly
// snap to its CSS fallback position (top: 0, left: 0) before fading out.
//
// This is keyed per-menu rather than a single shared "current position"
// because hovering from menu A to menu B before A's close transition
// finishes reassigns the "current" menu to B - with a shared position, A's
// entry would be overwritten with B's coordinates mid-fade, producing the
// exact same jump-to-corner glitch for A instead of fixing it.
const flyoutPositions = ref<Record<string, { top: number; left: number }>>({});
const sidebarRef = ref<HTMLElement | null>(null);
const navRef = ref<HTMLElement | null>(null);

function isMenuOpen(menu: string) {
  // Search auto-expands matches, but only for the inline accordion (expanded
  // sidebar) - collapsed flyouts only ever open from an explicit click,
  // since that's what gives us a button rect to position the flyout from.
  if (isCollapsed.value) return openMenu.value === menu;
  return isSearching.value ? true : openMenu.value === menu;
}

// Places the flyout next to the anchor, then nudges it up if it would run
// off the bottom of the screen (e.g. for menus near the end of the list).
// Measured after the DOM updates since the panel's real height depends on
// its (variable) list of sub-menu items.
const FLYOUT_MARGIN = 8;

function setFlyoutPosition(menu: string, top: number, left: number) {
  flyoutPositions.value = { ...flyoutPositions.value, [menu]: { top, left } };
}

// Style for a menu's flyout wrapper, read directly from the per-menu
// position map. Because entries survive close (see flyoutPositions above),
// this keeps returning the last good coordinates while a closing panel
// fades out, instead of falling through to `undefined` and letting the
// CSS fallback (top: 0, left: 0) show through mid-transition.
function flyoutStyle(menu: string) {
  const pos = flyoutPositions.value[menu];
  if (!isCollapsed.value || !pos) return undefined;
  return { top: `${pos.top}px`, left: `${pos.left}px` };
}

function positionFlyout(menu: string, anchorRect: DOMRect) {
  setFlyoutPosition(menu, anchorRect.top, anchorRect.right + 8);

  nextTick(() => {
    if (openMenu.value !== menu) return; // this menu closed (or another opened) before this ran

    const wrapperEl = document.getElementById(`submenu-${slugify(menu)}`);
    const listEl = wrapperEl?.querySelector(".submenu") as HTMLElement | null;
    if (!wrapperEl || !listEl) return;

    const { paddingTop, paddingBottom } = window.getComputedStyle(wrapperEl);
    const contentHeight = listEl.scrollHeight + parseFloat(paddingTop) + parseFloat(paddingBottom);
    const maxAllowedHeight = window.innerHeight * 0.7; // matches the CSS max-height: 70vh cap
    const height = Math.min(contentHeight, maxAllowedHeight);

    const maxTop = window.innerHeight - height - FLYOUT_MARGIN;
    const top = Math.max(FLYOUT_MARGIN, Math.min(anchorRect.top, maxTop));

    setFlyoutPosition(menu, top, anchorRect.right + 8);
  });
}

function toggleMenu(menu: string, event?: MouseEvent) {
  const wasOpen = openMenu.value === menu;
  openMenu.value = wasOpen ? null : menu;

  if (!wasOpen && isCollapsed.value && event) {
    const btn = event.currentTarget as HTMLElement;
    positionFlyout(menu, btn.getBoundingClientRect());
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
  positionFlyout(item.menu, (headEl ?? groupEl).getBoundingClientRect());
  openMenu.value = item.menu;
}

function onGroupMouseLeave(item: NavMenu) {
  if (!isCollapsed.value) return;
  clearHoverCloseTimer();
  hoverCloseTimer = setTimeout(() => {
    if (openMenu.value === item.menu) {
      openMenu.value = null;
    }
  }, HOVER_CLOSE_DELAY);
}

function onNavigate() {
  closeMobile();
  openMenu.value = null;
  clearHoverCloseTimer();
}

function onDocumentClick(e: MouseEvent) {
  if (!openMenu.value) return;
  if (sidebarRef.value && !sidebarRef.value.contains(e.target as Node)) {
    openMenu.value = null;
  }
}

// The flyout's position is computed once at click/hover time; it goes stale
// on scroll/resize, so just close it rather than tracking it live.
function closeFlyoutIfCollapsed() {
  if (isCollapsed.value && openMenu.value) {
    openMenu.value = null;
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
        ref="searchInputRef"
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
      <kbd v-else class="search-shortcut" aria-hidden="true">Ctrl K</kbd>
    </div>

    <!-- Sidebar skeleton (brief, while menus initialize) -->
    <nav v-if="isSidebarLoading" class="sidebar-nav sidebar-skeleton" aria-hidden="true">
      <div v-for="n in 20" :key="n" class="skeleton sidebar-sk-item">
        <span class="skeleton sidebar-sk-icon" />
        <span class="skeleton sidebar-sk-label" />
      </div>
    </nav>

    <nav v-else ref="navRef" class="sidebar-nav" aria-label="Primary">
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
            <span class="nav-label" v-html="highlightMatch(menuLabel(item))" />
          </RouterLink>

          <button
            v-else
            type="button"
            class="nav-head"
            :class="{ 'is-open': isMenuOpen(item.menu), 'is-active': isMenuActive(item) }"
            :aria-expanded="isMenuOpen(item.menu)"
            :aria-controls="`submenu-${slugify(item.menu)}`"
            :title="item.menu"
            @click="toggleMenu(item.menu, $event)"
          >
            <i :class="['nav-icon', item.icon]" />
            <span class="nav-label" v-html="highlightMatch(menuLabel(item))" />
            <i class="nav-chevron fa-duotone fa-chevron-down" />
          </button>

          <div
            v-if="item.menu !== 'Dashboard'"
            :id="`submenu-${slugify(item.menu)}`"
            class="submenu-wrapper"
            :class="{ 'is-open': isMenuOpen(item.menu) }"
            :style="flyoutStyle(item.menu)"
          >
            <ul class="submenu">
              <li v-for="sub in item.sub_menus" :key="sub.name">
                <button
                  type="button"
                  class="submenu-link"
                  :class="{ 'is-active': isSubActive(sub) }"
                  @click="onSubmenuClick(sub)"
                >
                  <i :class="['submenu-icon', sub.icon]" />
                  <span v-html="highlightMatch(subLabel(sub))" />
                  <i v-if="isSubActive(sub)" class="fa-solid fa-circle submenu-link__dot" />
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
