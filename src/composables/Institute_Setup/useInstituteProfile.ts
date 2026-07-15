import { reactive, watch } from 'vue'
import { INSTITUTE_PROFILE_KEY } from '@/utils/constants'
import type { InstituteProfile } from '@/types'

// Module-level (singleton) reactive state, same pattern as
// useAppPreferences - the Profile & EIIN page (and anything else that
// later reads the institute's name/EIIN, e.g. print letterheads) shares
// one object instead of re-reading storage per component.
const DEFAULT_PROFILE: InstituteProfile = {
  nameEn: '',
  nameBn: '',
  eiin: '',
  establishedYear: '',
  institutionType: 'bangla_medium_private',
  educationBoard: 'dhaka',
  registrationCode: '',
  addressEn: '',
  addressBn: '',
  phone: '',
  email: '',
  website: '',
  headName: '',
  headDesignation: '',
  headPhone: '',
  logoDataUrl: null,
  letterheadDataUrl: null,
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
