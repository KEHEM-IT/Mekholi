export const APP_NAME = 'Mekholi'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const TOKEN_KEY = 'mekholi_auth_token'

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  INSTITUTE_ADMIN: 'institute_admin',
  TEACHER: 'teacher',
  ACCOUNTANT: 'accountant',
  STUDENT_PARENT_PORTAL: 'student_parent_portal',
} as const

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  institute_admin: 'Institute Admin',
  teacher: 'Teacher',
  accountant: 'Accountant',
  student_parent_portal: 'Student / Parent',
}

export const SIDEBAR_COLLAPSED_KEY = 'mekholi_sidebar_collapsed'
