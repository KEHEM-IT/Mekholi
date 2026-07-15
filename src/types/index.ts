export type UserRole = 'super_admin' | 'institute_admin' | 'teacher' | 'accountant' | 'student_parent_portal'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface Pagination {
  page: number
  perPage: number
  total: number
}

// Used by HomeView's feature-card grid (label + route)
export interface NavItem {
  label: string
  to: string
}

// Shape of src/assets/navigation/shikkha_erp_navigation.json
export interface NavSubMenu {
  name: string
  name_bn: string
  icon: string
}

export interface NavMenu {
  menu: string
  menu_bn: string
  icon: string
  sub_menus: NavSubMenu[]
}

export type NavigationMap = Record<UserRole, NavMenu[]>

export interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  icon: string
}

// --- Language & Theme settings (Plugins & Settings > Language & Theme) ----

export type UILanguage = 'en' | 'bn'

export type AccentTheme = 'indigo' | 'emerald' | 'amber' | 'crimson' | 'sky' | 'violet'

export type DateCalendar = 'gregorian' | 'bangla'

export type DocumentLanguage = 'en' | 'bn' | 'both'

export type SettingsDensity = 'comfortable' | 'compact'

// English UI font (Language & Theme > Typography). 'system' (the OS font
// stack) is the default; the rest are common ERP/SaaS dashboard faces.
export type EnglishFont = 'system' | 'inter' | 'roboto' | 'open-sans' | 'lato' | 'ibm-plex-sans'

// Bengali UI font (Language & Theme > Typography). Hind Siliguri is the
// recommended default; Kalpurush and Noto Sans Bengali are offered as
// alternatives.
export type BengaliFont = 'hind-siliguri' | 'kalpurush' | 'noto-sans-bengali'

// Base interface font-size scale (Language & Theme > Typography)
export type FontSizeScale = 'small' | 'medium' | 'large'

export interface DocumentLanguagePrefs {
  admitCard: DocumentLanguage
  idCard: DocumentLanguage
  certificate: DocumentLanguage
  markSheet: DocumentLanguage
}

export interface AppPreferences {
  uiLanguage: UILanguage
  accentTheme: AccentTheme
  banglaNumerals: boolean
  dateCalendar: DateCalendar
  density: SettingsDensity
  englishFont: EnglishFont
  bengaliFont: BengaliFont
  fontSize: FontSizeScale
  documentLanguage: DocumentLanguagePrefs
}
