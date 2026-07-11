<script setup lang="ts">
import type { NavItem } from '@/types'

const items: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Inventory', to: '/inventory' },
  { label: 'Orders', to: '/orders' },
  { label: 'Reports', to: '/reports' },
]
</script>

<template>
  <aside class="app-sidebar">
    <nav>
      <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="nav-link">
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 220px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: 1rem;
}

.nav-link {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background-color var(--transition-fast);
}

.nav-link:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.nav-link.router-link-active {
  background: var(--color-primary-muted);
  color: var(--color-primary);
  font-weight: 600;
}
</style>
