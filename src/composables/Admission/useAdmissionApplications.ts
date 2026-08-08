// Admission Applications API helpers — shared CRUD via local Python backend
//
//   GET    /api/admission-applications           → { admission_applications: [...] }
//   POST   /api/admission-applications           → create → { ok, id }
//   POST   /api/admission-applications?id=N      → update → { ok, id }
//   DELETE /api/admission-applications?id=N      → delete → { ok }
//   POST   /api/admission-applications/import    → bulk upsert with cross-check

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface AdmissionApplication {
  id?: number
  application_no: string
  candidate_name: string
  candidate_name_bn: string
  guardian_name: string
  phone: string
  email: string
  academic_year_id: number | null
  desired_class: string
  version: string
  shift: string
  previous_school: string
  country: string
  nationality: string
  photo: string
  birth_certificate: string
  payment_status: 'Pending' | 'Paid' | 'Failed'
  payment_method: string
  payment_transaction_id: string
  application_status: 'Submitted' | 'Screening' | 'Selected' | 'Rejected' | 'Archived'
  viva_marks: number
  written_marks: number
  remarks: string
  created_at?: string
  updated_at?: string
}

export function emptyApplication(): AdmissionApplication {
  return {
    application_no: '',
    candidate_name: '',
    candidate_name_bn: '',
    guardian_name: '',
    phone: '',
    email: '',
    academic_year_id: null,
    desired_class: '',
    version: '',
    shift: '',
    previous_school: '',
    country: 'Bangladesh',
    nationality: 'Bangladeshi',
    photo: '',
    birth_certificate: '',
    payment_status: 'Pending',
    payment_method: '',
    payment_transaction_id: '',
    application_status: 'Submitted',
    viva_marks: 0,
    written_marks: 0,
    remarks: '',
  }
}

export async function fetchApplications(): Promise<AdmissionApplication[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-applications`)
    if (!res.ok) return []
    const data = (await res.json()) as { admission_applications?: AdmissionApplication[] }
    return data.admission_applications ?? []
  } catch {
    return []
  }
}

export async function saveApplication(app: AdmissionApplication): Promise<boolean> {
  try {
    const isEdit = Boolean(app.id)
    const res = await fetch(`${API_BASE}/api/admission-applications${isEdit ? `?id=${app.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteApplication(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-applications?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface ApplicationImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing application_no are skipped. */
export async function importApplications(items: AdmissionApplication[]): Promise<ApplicationImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/admission-applications/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as ApplicationImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
