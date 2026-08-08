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
        component: () => import('@/pages/Institute_Setup/Index.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/profile',
        name: 'institute-profile',
        component: () => import('@/pages/Institute_Setup/Profile/ProfileView.vue'),
        beforeEnter: requireAuth,
      },
      // Institute Setup sub-menus — routed to the shared placeholder until
      // real pages are built (following the Institute Profile pattern).
      {
        path: 'institute-setup/branches',
        name: 'institute-setup-branches',
        component: () => import('@/pages/Institute_Setup/Branches/BranchesView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/academic-year',
        name: 'institute-setup-academic-year',
        component: () => import('@/pages/Institute_Setup/AcademicYears/AcademicYearsView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/classes',
        name: 'institute-setup-classes',
        component: () => import('@/pages/Institute_Setup/Classes/ClassesView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/holidays',
        name: 'institute-setup-holidays',
        component: () => import('@/pages/Institute_Setup/Holidays/HolidaysView.vue'),
        meta: { title: 'Holidays & Working Days', titleBn: 'ছুটি ও কর্মদিবস' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/grading',
        name: 'institute-setup-grading',
        component: () => import('@/pages/Institute_Setup/Grading/GradingView.vue'),
        meta: { title: 'Grading Scheme', titleBn: 'গ্রেডিং পদ্ধতি' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/boards',
        name: 'institute-setup-boards',
        component: () => import('@/pages/Institute_Setup/Boards/BoardsView.vue'),
        meta: { title: 'Board & Regulatory Setup', titleBn: 'বোর্ড ও নিয়ন্ত্রক সেটআপ' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/subjects',
        name: 'institute-setup-subjects',
        component: () => import('@/pages/Institute_Setup/Subjects/SubjectsView.vue'),
        meta: { title: 'Subjects & Curriculum', titleBn: 'বিষয় ও কারিকুলাম' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/exam-terms',
        name: 'institute-setup-exam-terms',
        component: () => import('@/pages/Institute_Setup/ExamTerms/ExamTermsView.vue'),
        meta: { title: 'Exam Terms & Types', titleBn: 'পরীক্ষার শর্ত ও ধরন' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/rooms',
        name: 'institute-setup-rooms',
        component: () => import('@/pages/Institute_Setup/Rooms/RoomsView.vue'),
        meta: { title: 'Classrooms / Rooms / Buildings', titleBn: 'ক্লাসরুম / কক্ষ / ভবন' },
        beforeEnter: requireAuth,
      },
      {
        path: 'institute-setup/sessions',
        name: 'institute-setup-sessions',
        component: () => import('@/pages/Institute_Setup/AcademicSessions/AcademicSessionsView.vue'),
        meta: { title: 'Academic Sessions & Terms', titleBn: 'একাডেমিক সেশন ও টার্ম' },
        beforeEnter: requireAuth,
      },
      // Admission sub-menus
      {
        path: 'admission/enquiries',
        name: 'admission-enquiries',
        component: () => import('@/pages/Admission/Enquiries/EnquiriesView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/form-builder',
        name: 'admission-form-builder',
        component: () => import('@/pages/Admission/FormBuilder/FormBuilderView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/applications',
        name: 'admission-applications',
        component: () => import('@/pages/Admission/Applications/ApplicationsView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/tests',
        name: 'admission-tests',
        component: () => import('@/pages/Admission/Tests/TestsView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/digital-lottery',
        name: 'admission-digital-lottery',
        component: () => import('@/pages/Admission/DigitalLottery/DigitalLotteryView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/merit-list',
        name: 'admission-merit-list',
        component: () => import('@/pages/Admission/MeritList/MeritListView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/waiting-list',
        name: 'admission-waiting-list',
        component: () => import('@/pages/ComingSoonView.vue'),
        meta: { title: 'Waiting List', titleBn: 'অপেক্ষমান তালিকা', icon: 'fa-duotone fa-user-clock', module: 'Admission' },
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/document-verification',
        name: 'admission-document-verification',
        component: () => import('@/pages/ComingSoonView.vue'),
        meta: { title: 'Document Verification', titleBn: 'ডকুমেন্ট যাচাই', icon: 'fa-duotone fa-file-circle-check', module: 'Admission' },
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/seat-quota',
        name: 'admission-seat-quota',
        component: () => import('@/pages/ComingSoonView.vue'),
        meta: { title: 'Seat/Quota', titleBn: 'আসন/কোটা', icon: 'fa-duotone fa-chair', module: 'Admission' },
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/settings',
        name: 'admission-settings',
        component: () => import('@/pages/ComingSoonView.vue'),
        meta: { title: 'Admission Settings', titleBn: 'ভর্তি সেটিংস', icon: 'fa-duotone fa-sliders', module: 'Admission' },
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
