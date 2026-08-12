// Optimized composable for ID card generation — fetches only the fields
// needed (institute_name_en, institute_logo) instead of the full profile.
//
// The full useInstituteProfile loads classifications, committee members,
// facilities, bank details, etc. — all unnecessary weight when all we
// need is the card header block.

import { ref } from 'vue'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface CardInfo {
  institute_name_en: string
  institute_logo: string
}

// Cached result — the institute name/logo rarely changes during a session
let cachedCardInfo: CardInfo | null = null

/**
 * Fetch only the institute name and logo for ID card generation.
 * Returns cached result on subsequent calls to avoid redundant API hits.
 */
export async function fetchCardInfo(): Promise<CardInfo> {
  if (cachedCardInfo) return cachedCardInfo

  try {
    const res = await fetch(`${API_BASE}/api/profile/card-info?eiin=130430`)
    if (!res.ok) throw new Error('Card info fetch failed')
    const data = await res.json()
    cachedCardInfo = {
      institute_name_en: String(data.institute_name_en ?? ''),
      institute_logo: String(data.institute_logo ?? ''),
    }
    return cachedCardInfo
  } catch {
    // Return empty defaults on failure — card still renders
    return { institute_name_en: '', institute_logo: '' }
  }
}

/**
 * Composable for accessing card info in Vue components.
 * Returns reactive refs that update once the data is fetched.
 */
export function useCardInfo() {
  const instituteNameEn = ref('')
  const instituteLogo = ref('')
  const isLoaded = ref(false)

  async function load() {
    const info = await fetchCardInfo()
    instituteNameEn.value = info.institute_name_en
    instituteLogo.value = info.institute_logo
    isLoaded.value = true
  }

  return {
    instituteNameEn,
    instituteLogo,
    isLoaded,
    load,
  }
}
