<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="app-main">
      <AppHeader />
      <main class="app-content">
        <RouterView />
      </main>
      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.app-content {
  flex: 1;
  padding: 1.5rem;
}
</style>
