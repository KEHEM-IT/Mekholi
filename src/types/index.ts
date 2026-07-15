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

// --- Institute Profile & EIIN (Institute Setup > Profile & EIIN) ----------
// Modeled on the blueprint's Institution entity (Section 8) and the
// institution-type / education-board tables (Section 2.1 / 2.2).

export type InstitutionType =
  | 'government_mpo'
  | 'bangla_medium_private'
  | 'english_version'
  | 'english_medium'
  | 'madrasa_aliya'
  | 'madrasa_qawmi_hifz'
  | 'college_hsc'
  | 'technical_vocational'
  | 'multi_campus_group'

export type EducationBoard =
  | 'dhaka'
  | 'rajshahi'
  | 'chattogram'
  | 'barishal'
  | 'sylhet'
  | 'mymensingh'
  | 'jashore'
  | 'dinajpur'
  | 'cumilla'
  | 'bmeb'
  | 'bteb'
  | 'not_applicable'

export type InstitutionLevel =
  | 'primary'
  | 'secondary'
  | 'higher_secondary'
  | 'dakhil'
  | 'alim'
  | 'fazil'
  | 'kamil'
  | 'diploma'
  | 'undergraduate'

export type ManagementType = 'government' | 'private' | 'ngo' | 'trust'

export type AcademicVersion = 'bangla' | 'english_version' | 'english_medium'

export type StudyType = 'co_education' | 'boys' | 'girls'

export type InstituteShift = 'day' | 'morning' | 'day_evening' | 'two_shift'

export type ProfileStatus = 'active' | 'inactive' | 'pending' | 'suspended'

export interface InstituteFacilities {
  library: boolean
  scienceLab: boolean
  computerLab: boolean
  ictLab: boolean
  languageLab: boolean
  auditorium: boolean
  mosque: boolean
  canteen: boolean
  hostel: boolean
  transport: boolean
  medicalRoom: boolean
  cctv: boolean
  wifi: boolean
}

export interface InstituteBankInfo {
  bankName: string
  branch: string
  accountName: string
  accountNumber: string
}

export interface InstituteProfile {
  // Identity
  code: string
  slug: string
  nameEn: string
  nameBn: string
  shortName: string
  eiin: string
  emisCode: string
  registrationCode: string

  // Classification
  institutionType: InstitutionType
  institutionLevel: InstitutionLevel
  management: ManagementType
  mpoStatus: boolean
  academicVersion: AcademicVersion
  studyType: StudyType
  shift: InstituteShift
  establishedYear: string
  recognitionDate: string
  educationBoard: EducationBoard

  // Location
  division: string
  district: string
  upazila: string
  union: string
  postOffice: string
  mouza: string
  village: string
  postCode: string
  addressEn: string
  addressBn: string
  latitude: string
  longitude: string

  // Contact
  phone: string
  alternatePhone: string
  emergencyPhone: string
  fax: string
  email: string
  officialEmail: string
  website: string

  // Social
  facebook: string
  youtube: string
  linkedin: string

  // Leadership
  headName: string
  headDesignation: string
  headPhone: string
  headEmail: string
  principalName: string
  principalDesignation: string
  principalPhone: string
  principalEmail: string
  vicePrincipalName: string
  vicePrincipalPhone: string
  officeSuperName: string
  officeSuperPhone: string

  // Branding
  logoDataUrl: string | null
  letterheadDataUrl: string | null
  sealImage: string | null
  schoolColor: string
  secondaryColor: string

  // Infrastructure & capacity
  campusArea: string
  numberOfBuildings: string
  numberOfClassrooms: string
  numberOfLaboratories: string
  numberOfLibraries: string
  numberOfPlaygrounds: string
  studentCapacity: string
  teacherCapacity: string
  staffCapacity: string

  // Timings & working days
  officeStartTime: string
  officeEndTime: string
  classStartTime: string
  classEndTime: string
  workingDays: string[]

  // Academic offering
  academicGroups: string[]
  mediums: string[]

  // Facilities
  facilities: InstituteFacilities

  // Bank & payments
  bankInfo: InstituteBankInfo
  paymentMethods: string[]

  // Status
  status: ProfileStatus
  verified: boolean
  featured: boolean
}

// --- Institute Setup > Command Center -------------------------------------

export interface AcademicYearState {
  label: string
  startDate: string
  endDate: string
  isConfigured: boolean
}

export interface AcademicStructureState {
  classes: number
  sections: number
  groups: number
  shifts: number
}

export type GradingSchemeType = 'nctb_gpa' | 'percentage_letter' | 'hifz_para_sipara'

export interface GradingSchemeState {
  type: GradingSchemeType
  isConfigured: boolean
}

export interface HolidaysState {
  count: number
  isConfigured: boolean
}

export interface SetupChecklistItem {
  key: string
  label: string
  label_bn: string
  icon: string
  routeName?: string
  isComplete: boolean
}
