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
      // Students sub-menus
      {
        path: 'students',
        name: 'students-dashboard',
        component: () => import('@/pages/Students/Dashboard/DashboardView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'students/student-list',
        name: 'student-list',
        component: () => import('@/pages/Students/StudentList/StudentListView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'students/add-import',
        name: 'student-bulk-import',
        component: () => import('@/pages/Students/BulkImport/BulkImportView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'students/stipend',
        name: 'student-stipend',
        component: () => import('@/pages/Students/Stipends/StipendsView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'students/promote-transfer',
        name: 'student-promote-transfer',
        component: () => import('@/pages/Students/PromoteTransfer/PromoteTransferView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'students/uid-sync',
        name: 'student-unique-id-sync',
        component: () => import('@/pages/Students/UniqueIdSync/UniqueIdSyncView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'students/id-cards',
        name: 'student-id-cards',
        component: () => import('@/pages/Students/IDCards/IDCardsView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'students/certificates',
        name: 'student-certificates',
        component: () => import('@/pages/Students/Certificates/CertificatesView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'students/behavior-logs',
        name: 'student-behavior-logs',
        component: () => import('@/pages/Students/BehaviorLogs/BehaviorLogsView.vue'),
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
        path: 'admission',
        name: 'admission-dashboard',
        component: () => import('@/pages/Admission/Dashboard/DashboardView.vue'),
        beforeEnter: requireAuth,
      },
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
        component: () => import('@/pages/Admission/WaitingList/WaitingListView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/document-verification',
        name: 'admission-document-verification',
        component: () => import('@/pages/Admission/DocumentVerification/DocumentVerificationView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/seat-quota',
        name: 'admission-seat-quota',
        component: () => import('@/pages/Admission/SeatQuota/SeatQuotaView.vue'),
        beforeEnter: requireAuth,
      },
      {
        path: 'admission/settings',
        name: 'admission-settings',
        component: () => import('@/pages/Admission/Settings/AdmissionSettingsView.vue'),
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
