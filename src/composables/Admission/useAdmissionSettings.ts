// Admission Settings API helpers — shared config via local Python backend
//
//   GET    /api/admission-settings           → { admission_settings: {...} }
//   POST   /api/admission-settings           → save → { ok }

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface AdmissionSettingsConfig {
  id?: number
  academic_year_id: number | null
  open_date: string
  close_date: string
  application_fee: number
  age_limits: Record<string, { min: number | null; max: number | null }>
  payment_credentials: Record<string, string>
  terms_en: string
  terms_bn: string
  is_active: boolean
}

export function emptySettings(): AdmissionSettingsConfig {
  return {
    academic_year_id: null,
    open_date: '',
    close_date: '',
    application_fee: 200,
    age_limits: {},
    payment_credentials: {
      bkash_merchant_id: '',
      bkash_app_key: '',
      nagad_merchant_id: '',
      nagad_signature_key: '',
    },
    terms_en: '',
    terms_bn: '',
    is_active: true,
  }
}

export async function fetchAdmissionSettings(): Promise<AdmissionSettingsConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-settings`)
    if (!res.ok) return null
    const data = (await res.json()) as { admission_settings?: AdmissionSettingsConfig }
    return data.admission_settings ?? null
  } catch {
    return null
  }
}

export async function saveAdmissionSettings(config: AdmissionSettingsConfig): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    return res.ok
  } catch {
    return false
  }
}
