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
  const fields_config: Record<string, AdmissionFormField> = {
    candidate_name: { visible: true, required: true },
    candidate_name_bn: { visible: true, required: false },
    guardian_name: { visible: true, required: true },
    phone: { visible: true, required: true },
    email: { visible: true, required: false },
    desired_class: { visible: true, required: true },
    version: { visible: true, required: false },
    shift: { visible: true, required: false },
    previous_school: { visible: true, required: false },
    country: { visible: true, required: false },
    nationality: { visible: true, required: false },
    photo: { visible: true, required: true },
    birth_certificate: { visible: true, required: true }
  }
  return {
    form_title: 'Online Student Admission',
    form_title_bn: 'অনলাইন ভর্তি ফরম',
    academic_year_id: null,
    application_fee: 200,
    open_date: '',
    close_date: '',
    fields_config,
    custom_fields: [],
    status: 'Draft',
    instructions: 'Please fill out all the fields and upload candidate passport photo + birth certificate to submit your admission form. An application fee of 200 BDT applies.',
    instructions_bn: 'দয়া করে সবগুলো তথ্য পূরণ করুন এবং প্রার্থীর পাসপোর্ট সাইজের ছবি ও জন্ম নিবন্ধন সনদ আপলোড করে সাবমিট করুন। আবেদন ফি ২০০ টাকা প্রযোজ্য।',
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
