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

// Institution levels (blueprint 2.1) - the highest class level offered.
export const INSTITUTION_LEVELS: {
  value: import('@/types').InstitutionLevel
  label: string
  label_bn: string
}[] = [
  { value: 'primary', label: 'Primary', label_bn: 'প্রাথমিক' },
  { value: 'secondary', label: 'Secondary (SSC)', label_bn: 'মাধ্যমিক (এসএসসি)' },
  { value: 'higher_secondary', label: 'Higher Secondary (HSC)', label_bn: 'উচ্চ মাধ্যমিক (এইচএসসি)' },
  { value: 'dakhil', label: 'Dakhil (Madrasa)', label_bn: 'দাখিল (মাদ্রাসা)' },
  { value: 'alim', label: 'Alim (Madrasa)', label_bn: 'আলিম (মাদ্রাসা)' },
  { value: 'fazil', label: 'Fazil (Madrasa)', label_bn: 'ফাজিল (মাদ্রাসা)' },
  { value: 'kamil', label: 'Kamil (Madrasa)', label_bn: 'কামিল (মাদ্রাসা)' },
  { value: 'diploma', label: 'Diploma / Technical', label_bn: 'ডিপ্লোমা / কারিগরি' },
  { value: 'undergraduate', label: 'Undergraduate / Degree', label_bn: 'স্নাতক / ডিগ্রি' },
]

export const MANAGEMENT_TYPES: {
  value: import('@/types').ManagementType
  label: string
  label_bn: string
}[] = [
  { value: 'government', label: 'Government', label_bn: 'সরকারি' },
  { value: 'private', label: 'Private', label_bn: 'বেসরকারি' },
  { value: 'ngo', label: 'NGO-run', label_bn: 'এনজিও পরিচালিত' },
  { value: 'trust', label: 'Trust / Foundation', label_bn: 'ট্রাস্ট / ফাউন্ডেশন' },
]

export const ACADEMIC_VERSIONS: {
  value: import('@/types').AcademicVersion
  label: string
  label_bn: string
}[] = [
  { value: 'bangla', label: 'Bangla Version', label_bn: 'বাংলা ভার্সন' },
  { value: 'english_version', label: 'English Version', label_bn: 'ইংরেজি ভার্সন' },
  { value: 'english_medium', label: 'English Medium', label_bn: 'ইংরেজি মাধ্যম' },
]

export const STUDY_TYPES: {
  value: import('@/types').StudyType
  label: string
  label_bn: string
}[] = [
  { value: 'co_education', label: 'Co-education', label_bn: 'সহ-শিক্ষা' },
  { value: 'boys', label: "Boys' institution", label_bn: 'বালক প্রতিষ্ঠান' },
  { value: 'girls', label: "Girls' institution", label_bn: 'বালিকা প্রতিষ্ঠান' },
]

export const INSTITUTE_SHIFTS: {
  value: import('@/types').InstituteShift
  label: string
  label_bn: string
}[] = [
  { value: 'day', label: 'Day shift', label_bn: 'দিবা শিফট' },
  { value: 'morning', label: 'Morning shift', label_bn: 'প্রাতঃ শিফট' },
  { value: 'day_evening', label: 'Day & Evening', label_bn: 'দিবা ও সান্ধ্য' },
  { value: 'two_shift', label: 'Two shifts', label_bn: 'দুই শিফট' },
]

export const PROFILE_STATUSES: {
  value: import('@/types').ProfileStatus
  label: string
  label_bn: string
}[] = [
  { value: 'active', label: 'Active', label_bn: 'সক্রিয়' },
  { value: 'inactive', label: 'Inactive', label_bn: 'নিষ্ক্রিয়' },
  { value: 'pending', label: 'Pending', label_bn: 'অপেক্ষমান' },
  { value: 'suspended', label: 'Suspended', label_bn: 'স্থগিত' },
]

// Bangladesh's 8 administrative divisions - used for the Location section's
// Division dropdown (blueprint Section 8, address block).
export const BD_DIVISIONS: string[] = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
]

export const WORKING_DAY_OPTIONS: { value: string; label: string; label_bn: string }[] = [
  { value: 'Sunday', label: 'Sunday', label_bn: 'রবিবার' },
  { value: 'Monday', label: 'Monday', label_bn: 'সোমবার' },
  { value: 'Tuesday', label: 'Tuesday', label_bn: 'মঙ্গলবার' },
  { value: 'Wednesday', label: 'Wednesday', label_bn: 'বুধবার' },
  { value: 'Thursday', label: 'Thursday', label_bn: 'বৃহস্পতিবার' },
  { value: 'Friday', label: 'Friday', label_bn: 'শুক্রবার' },
  { value: 'Saturday', label: 'Saturday', label_bn: 'শনিবার' },
]

export const ACADEMIC_GROUP_OPTIONS: { value: string; label: string; label_bn: string }[] = [
  { value: 'Science', label: 'Science', label_bn: 'বিজ্ঞান' },
  { value: 'Business Studies', label: 'Business Studies', label_bn: 'ব্যবসায় শিক্ষা' },
  { value: 'Humanities', label: 'Humanities', label_bn: 'মানবিক' },
  { value: 'General', label: 'General (Primary)', label_bn: 'সাধারণ (প্রাথমিক)' },
]

export const MEDIUM_OPTIONS: { value: string; label: string; label_bn: string }[] = [
  { value: 'Bangla', label: 'Bangla', label_bn: 'বাংলা' },
  { value: 'English Version', label: 'English Version', label_bn: 'ইংরেজি ভার্সন' },
  { value: 'English Medium', label: 'English Medium', label_bn: 'ইংরেজি মাধ্যম' },
]

// Facility checklist (blueprint Section 8) - each key matches
// InstituteFacilities in types/index.ts.
export const FACILITY_OPTIONS: {
  key: keyof import('@/types').InstituteFacilities
  label: string
  label_bn: string
  icon: string
}[] = [
  { key: 'library', label: 'Library', label_bn: 'লাইব্রেরি', icon: 'fa-books' },
  { key: 'scienceLab', label: 'Science Lab', label_bn: 'বিজ্ঞান ল্যাব', icon: 'fa-flask' },
  { key: 'computerLab', label: 'Computer Lab', label_bn: 'কম্পিউটার ল্যাব', icon: 'fa-computer' },
  { key: 'ictLab', label: 'ICT Lab', label_bn: 'আইসিটি ল্যাব', icon: 'fa-display' },
  { key: 'languageLab', label: 'Language Lab', label_bn: 'ভাষা ল্যাব', icon: 'fa-headphones' },
  { key: 'auditorium', label: 'Auditorium', label_bn: 'অডিটোরিয়াম', icon: 'fa-theater-masks' },
  { key: 'mosque', label: 'Mosque / Prayer room', label_bn: 'মসজিদ / নামাজ কক্ষ', icon: 'fa-mosque' },
  { key: 'canteen', label: 'Canteen', label_bn: 'ক্যান্টিন', icon: 'fa-utensils' },
  { key: 'hostel', label: 'Hostel', label_bn: 'হোস্টেল', icon: 'fa-bed' },
  { key: 'transport', label: 'Transport', label_bn: 'পরিবহন', icon: 'fa-bus' },
  { key: 'medicalRoom', label: 'Medical Room', label_bn: 'মেডিকেল কক্ষ', icon: 'fa-briefcase-medical' },
  { key: 'cctv', label: 'CCTV', label_bn: 'সিসিটিভি', icon: 'fa-video' },
  { key: 'wifi', label: 'Wi-Fi', label_bn: 'ওয়াইফাই', icon: 'fa-wifi' },
]

export const PAYMENT_METHOD_OPTIONS: { value: string; label: string; label_bn: string }[] = [
  { value: 'Cash', label: 'Cash', label_bn: 'নগদ (ক্যাশ)' },
  { value: 'bKash', label: 'bKash', label_bn: 'বিকাশ' },
  { value: 'Nagad', label: 'Nagad', label_bn: 'নগদ' },
  { value: 'Rocket', label: 'Rocket', label_bn: 'রকেট' },
  { value: 'Bank Transfer', label: 'Bank Transfer', label_bn: 'ব্যাংক ট্রান্সফার' },
  { value: 'Card', label: 'Debit / Credit Card', label_bn: 'ডেবিট / ক্রেডিট কার্ড' },
]

// Institute Setup > Command Center (Academic Year, Class/Section/Group/
// Shift, Holidays, Grading Scheme). Prototype state only, same
// localStorage-backed approach as INSTITUTE_PROFILE_KEY - no backend yet.
export const ACADEMIC_YEAR_KEY = 'mekholi_academic_year'
export const ACADEMIC_STRUCTURE_KEY = 'mekholi_academic_structure'
export const HOLIDAYS_KEY = 'mekholi_holidays'
export const GRADING_SCHEME_KEY = 'mekholi_grading_scheme'

// Grading scheme types, per blueprint - NCTB's 8-point GPA is the common
// mainstream-board scheme, Percentage-Letter covers English-medium/O-A
// Level style grading, and Hifz Para/Sipara covers Qawmi/Hifz madrasas
// where memorization progress (not marks) is what's graded.
export const GRADING_SCHEME_TYPES: {
  value: import('@/types').GradingSchemeType
  label: string
  label_bn: string
}[] = [
  { value: 'nctb_gpa', label: 'NCTB 8-point GPA', label_bn: 'এনসিটিবি ৮-পয়েন্ট জিপিএ' },
  { value: 'percentage_letter', label: 'Percentage - Letter Grade', label_bn: 'শতাংশ - লেটার গ্রেড' },
  { value: 'hifz_para_sipara', label: 'Hifz Para / Sipara', label_bn: 'হিফজ পারা / সিপারা' },
]
