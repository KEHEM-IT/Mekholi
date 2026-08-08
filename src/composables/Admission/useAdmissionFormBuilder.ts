// Admission Form Builder API helpers — shared config via the local Python backend
//
//   GET    /api/admission-form           → { admission_form: {...} }
//   POST   /api/admission-form           → save → { ok }

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface AdmissionFormField {
  visible: boolean
  required: boolean
}

export interface CustomField {
  label: string
  type: 'text' | 'number' | 'dropdown' | 'file'
  required: boolean
  options?: string // Comma-separated list for dropdown types
}

export interface AdmissionFormConfig {
  id?: number
  form_title: string
  form_title_bn: string
  academic_year_id: number | null
  application_fee: number
  open_date: string
  close_date: string
  fields_config: Record<string, AdmissionFormField>
  custom_fields: CustomField[]
  status: 'Draft' | 'Active' | 'Closed'
  instructions: string
  instructions_bn: string
  is_active: boolean
}

export function emptyFormConfig(): AdmissionFormConfig {
  return {
    form_title: '',
    form_title_bn: '',
    academic_year_id: null,
    application_fee: 0,
    open_date: '',
    close_date: '',
    fields_config: {},
    custom_fields: [],
    status: 'Draft',
    instructions: '',
    instructions_bn: '',
    is_active: true,
  }
}

export async function fetchFormConfig(): Promise<AdmissionFormConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-form`)
    if (!res.ok) return null
    const data = (await res.json()) as { admission_form?: AdmissionFormConfig }
    return data.admission_form ?? null
  } catch {
    return null
  }
}

export async function saveFormConfig(config: AdmissionFormConfig): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    return res.ok
  } catch {
    return false
  }
}
