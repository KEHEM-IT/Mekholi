// Students API helpers — shared CRUD via local Python backend
//
//   GET    /api/students           → { students: [...] }
//   POST   /api/students           → create → { ok, id }
//   POST   /api/students?id=N      → update → { ok, id }
//   DELETE /api/students?id=N      → delete → { ok }
//   POST   /api/students/import    → bulk upsert with cross-check

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface Student {
  id?: number
  student_id: string
  candidate_name: string
  candidate_name_bn: string
  guardian_name: string
  father_name?: string
  father_nid?: string
  mother_name?: string
  mother_nid?: string
  present_address?: string
  permanent_address?: string
  phone: string
  email: string
  academic_year_id: number | null
  class_name: string
  section_name: string
  roll_no: number | null
  gender: string
  date_of_birth: string
  blood_group: string
  religion: string
  stipend_eligible: boolean
  stipend_mfs_provider: string
  stipend_mfs_number: string
  stipend_type?: string
  stipend_amount?: number
  stipend_frequency?: string
  stipend_status?: string
  stipend_criteria?: string
  government_uid: string
  behavior_points: number
  is_active: boolean
  photo?: string
  birth_certificate?: string
  created_at?: string
  updated_at?: string
}

export function emptyStudent(): Student {
  return {
    student_id: '',
    candidate_name: '',
    candidate_name_bn: '',
    guardian_name: '',
    father_name: '',
    father_nid: '',
    mother_name: '',
    mother_nid: '',
    present_address: '',
    permanent_address: '',
    phone: '',
    email: '',
    academic_year_id: null,
    class_name: '',
    section_name: '',
    roll_no: null,
    gender: 'Male',
    date_of_birth: '',
    blood_group: '',
    religion: 'Islam',
    stipend_eligible: false,
    stipend_mfs_provider: '',
    stipend_mfs_number: '',
    stipend_type: '',
    stipend_amount: 0,
    stipend_frequency: 'Quarterly',
    stipend_status: 'Active',
    stipend_criteria: 'General',
    government_uid: '',
    behavior_points: 100,
    is_active: true,
    photo: '',
    birth_certificate: '',
  }
}

export async function fetchStudents(): Promise<Student[]> {
  try {
    const res = await fetch(`${API_BASE}/api/students`)
    if (!res.ok) return []
    const data = (await res.json()) as { students?: Student[] }
    return data.students ?? []
  } catch {
    return []
  }
}

export async function saveStudent(student: Student): Promise<boolean> {
  try {
    const isEdit = Boolean(student.id)
    const res = await fetch(`${API_BASE}/api/students${isEdit ? `?id=${student.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteStudent(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/students?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface StudentImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing student_id are skipped. */
export async function importStudents(items: Student[]): Promise<StudentImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/students/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as StudentImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
