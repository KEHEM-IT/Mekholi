<template>
  <div class="auth-shell">
    <div class="auth-card">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background-soft, #f4f4f5);
}
.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
</style>
