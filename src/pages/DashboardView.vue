<script setup lang="ts">
// Main Dashboard — shows a smooth page-accurate skeleton for at least 2s
// on mount, then reveals the real content.
import { onMounted, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useTranslator } from '@/Translator'

const { user } = useAuth()
const { t } = useTranslator()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, MIN_SKELETON_MS))
  isPageLoading.value = false
})
</script>

<template>
  <!-- ── Skeleton (min 2s) — mirrors a real dashboard ─────────────────── -->
  <section v-if="isPageLoading" class="dash-skeleton" aria-busy="true" aria-label="Loading dashboard">
    <div class="dash-sk-header">
      <div class="dash-sk-titles">
        <span class="skeleton dash-sk-title" />
        <span class="skeleton dash-sk-subtitle" />
      </div>
      <div class="dash-sk-actions">
        <span class="skeleton dash-sk-pill" />
        <span class="skeleton dash-sk-pill" />
      </div>
    </div>

    <!-- Stat cards row -->
    <div class="dash-sk-stats">
      <div v-for="n in 4" :key="n" class="skeleton skeleton--card dash-sk-stat">
        <span class="skeleton dash-sk-stat-icon" />
        <div class="dash-sk-stat-body">
          <span class="skeleton dash-sk-stat-value" />
          <span class="skeleton dash-sk-stat-label" />
        </div>
      </div>
    </div>

    <!-- Chart area + side panel -->
    <div class="dash-sk-main">
      <div class="skeleton skeleton--card dash-sk-chart">
        <span class="skeleton dash-sk-chart-title" />
        <div class="dash-sk-chart-bars">
          <span v-for="h in [40, 65, 50, 80, 60, 90, 55, 75, 45, 70, 85, 60]" :key="h" class="dash-sk-bar" :style="{ height: h + '%' }" />
        </div>
      </div>
      <div class="skeleton skeleton--card dash-sk-side">
        <span class="skeleton dash-sk-side-title" />
        <div class="dash-sk-side-list">
          <div v-for="n in 5" :key="n" class="dash-sk-side-item">
            <span class="skeleton dash-sk-side-avatar" />
            <span class="skeleton dash-sk-side-line" />
          </div>
        </div>
      </div>
    </div>

    <!-- Activity list -->
    <div class="skeleton skeleton--card dash-sk-list">
      <span class="skeleton dash-sk-list-title" />
      <div v-for="n in 4" :key="n" class="dash-sk-list-item">
        <span class="skeleton dash-sk-list-avatar" />
        <div class="dash-sk-list-body">
          <span class="skeleton dash-sk-list-line" />
          <span class="skeleton dash-sk-list-line dash-sk-list-line--short" />
        </div>
      </div>
    </div>
  </section>

  <section v-else class="dash reveal-content">
    <h1>{{ t('Dashboard') }}</h1>
    <p v-if="user">{{ t('Welcome back, {name}!', { name: user.name }) }}</p>
  </section>
</template>
