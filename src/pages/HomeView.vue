<script setup lang="ts">
import type { NavItem } from '@/types'

const features: (NavItem & { icon: string; description: string })[] = [
  {
    label: 'Student Records',
    to: '/dashboard',
    icon: 'fa-solid fa-user-graduate',
    description: 'Manage enrollment, profiles, and academic history.',
  },
  {
    label: 'Attendance',
    to: '/dashboard',
    icon: 'fa-solid fa-calendar-check',
    description: 'Track daily attendance across classes and staff.',
  },
  {
    label: 'Inventory',
    to: '/inventory',
    icon: 'fa-solid fa-boxes-stacked',
    description: 'Monitor school assets, supplies, and stock levels.',
  },
  {
    label: 'Orders',
    to: '/orders',
    icon: 'fa-solid fa-file-invoice',
    description: 'Handle procurement and purchase orders.',
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: 'fa-solid fa-chart-line',
    description: 'Generate academic, financial, and operational reports.',
  },
]
</script>

<template>
  <section class="home">
    <div class="home-header">
      <i class="fa-solid fa-school home-icon"></i>
      <div>
        <h1>Welcome to Madol</h1>
        <p>Your school management ERP starting point.</p>
      </div>
    </div>

    <div class="feature-grid">
      <RouterLink v-for="feature in features" :key="feature.label" :to="feature.to" class="feature-card">
        <i :class="feature.icon" class="feature-icon"></i>
        <h3>{{ feature.label }}</h3>
        <p>{{ feature.description }}</p>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.home-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.home-icon {
  font-size: 2rem;
  color: var(--color-primary);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-text);
  text-decoration: none;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.feature-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.feature-icon {
  font-size: 1.5rem;
  color: var(--color-primary);
}

.feature-card h3 {
  font-size: 1rem;
}

.feature-card p {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}
</style>
