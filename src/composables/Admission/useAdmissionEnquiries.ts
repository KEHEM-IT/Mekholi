// Admission Enquiries API helpers — shared CRUD via the local Python backend
//
//   GET    /api/admission-enquiries           → { admission_enquiries: [...] }
//   POST   /api/admission-enquiries           → create → { ok, id }
//   POST   /api/admission-enquiries?id=N      → update → { ok, id }
//   DELETE /api/admission-enquiries?id=N      → delete → { ok }
//   POST   /api/admission-enquiries/import    → bulk upsert with cross-check

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface AdmissionEnquiry {
  id?: number
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
  nationality: string
  country: string
  enquiry_date: string
  source: string
  status: string
  remarks: string
  is_active: boolean
}

export function emptyEnquiry(): AdmissionEnquiry {
  return {
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
    nationality: 'Bangladeshi',
    country: 'Bangladesh',
    enquiry_date: new Date().toISOString().split('T')[0], // Defaults to today
    source: 'Walk-in',
    status: 'New',
    remarks: '',
    is_active: true,
  }
}

export async function fetchEnquiries(): Promise<AdmissionEnquiry[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-enquiries`)
    if (!res.ok) return []
    const data = (await res.json()) as { admission_enquiries?: AdmissionEnquiry[] }
    return data.admission_enquiries ?? []
  } catch {
    return []
  }
}

export async function saveEnquiry(enquiry: AdmissionEnquiry): Promise<boolean> {
  try {
    const isEdit = Boolean(enquiry.id)
    const res = await fetch(`${API_BASE}/api/admission-enquiries${isEdit ? `?id=${enquiry.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiry),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteEnquiry(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-enquiries?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface EnquiryImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing candidate+phone are skipped. */
export async function importEnquiries(items: AdmissionEnquiry[]): Promise<EnquiryImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/admission-enquiries/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as EnquiryImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
