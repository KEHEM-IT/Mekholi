import { reactive, watch } from 'vue'
import { INSTITUTE_PROFILE_KEY } from '@/utils/constants'
import type { InstituteProfile } from '@/types'

// Module-level (singleton) reactive state, same pattern as
// useAppPreferences - the Profile & EIIN page (and anything else that
// later reads the institute's name/EIIN, e.g. print letterheads) shares
// one object instead of re-reading storage per component.
const DEFAULT_PROFILE: InstituteProfile = {
  // Identity
  code: '',
  slug: '',
  nameEn: '',
  nameBn: '',
  shortName: '',
  eiin: '',
  emisCode: '',
  registrationCode: '',

  // Classification
  institutionType: 'bangla_medium_private',
  institutionLevel: 'secondary',
  management: 'private',
  mpoStatus: false,
  academicVersion: 'bangla',
  studyType: 'co_education',
  shift: 'day',
  establishedYear: '',
  recognitionDate: '',
  educationBoard: 'dhaka',

  // Location
  division: '',
  district: '',
  upazila: '',
  union: '',
  postOffice: '',
  mouza: '',
  village: '',
  postCode: '',
  addressEn: '',
  addressBn: '',
  latitude: '',
  longitude: '',

  // Contact
  phone: '',
  alternatePhone: '',
  emergencyPhone: '',
  fax: '',
  email: '',
  officialEmail: '',
  website: '',

  // Social
  facebook: '',
  youtube: '',
  linkedin: '',

  // Leadership
  headName: '',
  headDesignation: '',
  headPhone: '',
  headEmail: '',
  principalName: '',
  principalDesignation: '',
  principalPhone: '',
  principalEmail: '',
  vicePrincipalName: '',
  vicePrincipalPhone: '',
  officeSuperName: '',
  officeSuperPhone: '',

  // Branding
  logoDataUrl: null,
  letterheadDataUrl: null,
  sealImage: null,
  schoolColor: '#0F766E',
  secondaryColor: '#F59E0B',

  // Infrastructure & capacity
  campusArea: '',
  numberOfBuildings: '',
  numberOfClassrooms: '',
  numberOfLaboratories: '',
  numberOfLibraries: '',
  numberOfPlaygrounds: '',
  studentCapacity: '',
  teacherCapacity: '',
  staffCapacity: '',

  // Timings & working days
  officeStartTime: '',
  officeEndTime: '',
  classStartTime: '',
  classEndTime: '',
  workingDays: [],

  // Academic offering
  academicGroups: [],
  mediums: [],

  // Facilities
  facilities: {
    library: false,
    scienceLab: false,
    computerLab: false,
    ictLab: false,
    languageLab: false,
    auditorium: false,
    mosque: false,
    canteen: false,
    hostel: false,
    transport: false,
    medicalRoom: false,
    cctv: false,
    wifi: false,
  },

  // Bank & payments
  bankInfo: {
    bankName: '',
    branch: '',
    accountName: '',
    accountNumber: '',
  },
  paymentMethods: [],

  // Status
  status: 'active',
  verified: false,
  featured: false,
}

function loadProfile(): InstituteProfile {
  try {
    const raw = localStorage.getItem(INSTITUTE_PROFILE_KEY)
    if (!raw) return { ...DEFAULT_PROFILE }
    const parsed = JSON.parse(raw) as Partial<InstituteProfile>
    return { ...DEFAULT_PROFILE, ...parsed }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

const profile = reactive<InstituteProfile>(loadProfile())

watch(
  profile,
  (value) => {
    localStorage.setItem(INSTITUTE_PROFILE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

export function useInstituteProfile() {
  function resetToDefaults() {
    Object.assign(profile, { ...DEFAULT_PROFILE })
  }

  return {
    profile,
    resetToDefaults,
  }
}
