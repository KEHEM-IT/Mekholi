import type { RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import { requireAuth } from '@/middleware/auth'
import { requireGuest } from '@/middleware/guest'

// Inline "under construction" placeholder used by Institute Setup sub-menus
// that don't have real pages yet. No separate .vue file needed — each route
// carries its bilingual title via meta, and the dashboard card routes here.
const InstituteSetupPlaceholder = defineComponent({
  name: 'InstituteSetupPlaceholder',
  setup() {
    const route = useRoute()
    return () =>
      h('section', { class: 'isp-placeholder' }, [
        h('div', { class: 'isp-placeholder__icon' }, [h('i', { class: 'fa-duotone fa-hammer' })]),
        h('h2', String(route.meta.title ?? 'Coming Soon')),
        h('p', String(route.meta.titleBn ?? 'এই মডিউলটি নির্মাণাধীন')),
        h('p', { class: 'isp-placeholder__hint' }, 'This module is under construction — it will be built following the Institute Profile pattern.'),
      ])
  },
})

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
        component: () => import('@/pages/Institute_Setup/Index.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/profile',
        name: 'institute-profile',
        component: () => import('@/pages/Institute_Setup/InstituteProfileView.vue'),
        beforeEnter: requireAuth,
      },
      // Institute Setup sub-menus — routed to the shared placeholder until
      // real pages are built (following the Institute Profile pattern).
      {
        path: 'institute-setup/branches',
        name: 'institute-setup-branches',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Branches / Campus', titleBn: 'শাখা/ক্যাম্পাস' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/academic-year',
        name: 'institute-setup-academic-year',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Academic Year', titleBn: 'শিক্ষাবর্ষ' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/classes',
        name: 'institute-setup-classes',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Class / Section / Group / Shift', titleBn: 'শ্রেণি/শাখা/গ্রুপ/শিফট' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/holidays',
        name: 'institute-setup-holidays',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Holidays & Working Days', titleBn: 'ছুটি ও কর্মদিবস' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/grading',
        name: 'institute-setup-grading',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Grading Scheme', titleBn: 'গ্রেডিং পদ্ধতি' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/boards',
        name: 'institute-setup-boards',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Board & Regulatory Setup', titleBn: 'বোর্ড ও নিয়ন্ত্রক সেটআপ' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/subjects',
        name: 'institute-setup-subjects',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Subjects & Curriculum', titleBn: 'বিষয় ও কারিকুলাম' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/exam-terms',
        name: 'institute-setup-exam-terms',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Exam Terms & Types', titleBn: 'পরীক্ষার শর্ত ও ধরন' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/rooms',
        name: 'institute-setup-rooms',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Classrooms / Rooms / Buildings', titleBn: 'ক্লাসরুম / কক্ষ / ভবন' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/sessions',
        name: 'institute-setup-sessions',
        component: InstituteSetupPlaceholder,
        meta: { title: 'Academic Sessions & Terms', titleBn: 'একাডেমিক সেশন ও টার্ম' },
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
