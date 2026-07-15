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

// Institute Profile & EIIN (Institute Setup > Profile & EIIN)
export const INSTITUTE_PROFILE_KEY = 'mekholi_institute_profile'

// Institution types, per blueprint Section 2.1 (institution types the ERP
// must support).
export const INSTITUTION_TYPES: {
  value: import('@/types').InstitutionType
  label: string
  label_bn: string
}[] = [
  { value: 'government_mpo', label: 'Government / MPO', label_bn: 'সরকারি / এমপিও' },
  {
    value: 'bangla_medium_private',
    label: 'Bangla Medium (Non-MPO/Private)',
    label_bn: 'বাংলা মাধ্যম (বেসরকারি)',
  },
  { value: 'english_version', label: 'English Version', label_bn: 'ইংরেজি ভার্সন' },
  {
    value: 'english_medium',
    label: 'English Medium (Cambridge/Edexcel)',
    label_bn: 'ইংরেজি মাধ্যম (ক্যামব্রিজ/এডেক্সেল)',
  },
  { value: 'madrasa_aliya', label: 'Madrasa - Aliya (Dakhil/Alim/Fazil)', label_bn: 'মাদ্রাসা - আলিয়া' },
  { value: 'madrasa_qawmi_hifz', label: 'Madrasa - Qawmi / Hifz', label_bn: 'মাদ্রাসা - কওমি / হিফজ' },
  { value: 'college_hsc', label: 'College / Intermediate (HSC)', label_bn: 'কলেজ / উচ্চ মাধ্যমিক' },
  { value: 'technical_vocational', label: 'Technical & Vocational', label_bn: 'কারিগরি ও বৃত্তিমূলক' },
  { value: 'multi_campus_group', label: 'Multi-campus Group', label_bn: 'বহু-ক্যাম্পাস গ্রুপ' },
]

// Education boards, per blueprint Section 2.2 (9 general boards plus
// Madrasah/BMEB and Technical/BTEB).
export const EDUCATION_BOARDS: {
  value: import('@/types').EducationBoard
  label: string
  label_bn: string
}[] = [
  { value: 'dhaka', label: 'Dhaka', label_bn: 'ঢাকা' },
  { value: 'rajshahi', label: 'Rajshahi', label_bn: 'রাজশাহী' },
  { value: 'chattogram', label: 'Chattogram', label_bn: 'চট্টগ্রাম' },
  { value: 'barishal', label: 'Barishal', label_bn: 'বরিশাল' },
  { value: 'sylhet', label: 'Sylhet', label_bn: 'সিলেট' },
  { value: 'mymensingh', label: 'Mymensingh', label_bn: 'ময়মনসিংহ' },
  { value: 'jashore', label: 'Jashore', label_bn: 'যশোর' },
  { value: 'dinajpur', label: 'Dinajpur', label_bn: 'দিনাজপুর' },
  { value: 'cumilla', label: 'Cumilla', label_bn: 'কুমিল্লা' },
  { value: 'bmeb', label: 'Madrasah Board (BMEB)', label_bn: 'মাদ্রাসা বোর্ড (বিএমইবি)' },
  { value: 'bteb', label: 'Technical Board (BTEB)', label_bn: 'কারিগরি বোর্ড (বিটিইবি)' },
  { value: 'not_applicable', label: 'Not Applicable', label_bn: 'প্রযোজ্য নয়' },
]
