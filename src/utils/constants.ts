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

export const APP_PREFERENCES_KEY = 'mekholi_app_preferences'

// Accent theme swatches for the Language & Theme settings page. Each key
// overrides --color-primary(-hover/-active/-muted) globally via
// styles/themes/_accents.scss ([data-accent="..."] on <html>).
export const ACCENT_THEMES: Record<
  import('@/types').AccentTheme,
  { label: string; label_bn: string; swatch: string }
> = {
  indigo: { label: 'Indigo', label_bn: 'ইন্ডিগো', swatch: '#6366f1' },
  emerald: { label: 'Emerald', label_bn: 'পান্না সবুজ', swatch: '#10b981' },
  amber: { label: 'Amber Gold', label_bn: 'সোনালী', swatch: '#f59e0b' },
  crimson: { label: 'Crimson', label_bn: 'লাল', swatch: '#e11d48' },
  sky: { label: 'Sky Blue', label_bn: 'আকাশী নীল', swatch: '#0ea5e9' },
  violet: { label: 'Violet', label_bn: 'বেগুনি', swatch: '#8b5cf6' },
}
