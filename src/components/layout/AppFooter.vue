<template>
  <footer class="app-footer">
    <span>&copy; {{ new Date().getFullYear() }} Mekholi ERP</span>
  </footer>
</template>

<style scoped>
.app-footer {
  padding: 1rem 1.5rem;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
