import type { RouteRecordRaw } from 'vue-router'
import { requireAuth } from '@/middleware/auth'
import { requireGuest } from '@/middleware/guest'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomeView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/DashboardView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'inventory',
        name: 'inventory',
        component: () => import('@/pages/InventoryView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/pages/OrdersView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/pages/ReportsView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'settings/language-theme',
        name: 'settings-language-theme',
        component: () => import('@/pages/LanguageThemeSettingsView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup',
        name: 'institute-setup',
        component: () => import('@/pages/Institute_Setup/InstituteProfileView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/profile',
        name: 'institute-profile',
        component: () => import('@/pages/Institute_Setup/InstituteProfileView.vue'),
        beforeEnter: requireAuth,
      },
      { path: 'forbidden', name: 'forbidden', component: () => import('@/pages/ForbiddenView.vue') },
    ],
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/pages/LoginView.vue'),
        beforeEnter: requireGuest,
      },
    ],
  },
  { path: '/error', name: 'error', component: () => import('@/pages/ErrorView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFoundView.vue') },
]
