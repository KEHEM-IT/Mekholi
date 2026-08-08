// Admission Tests API helpers — shared CRUD via local Python backend
//
//   GET    /api/admission-tests           → { admission_tests: [...] }
//   POST   /api/admission-tests           → create → { ok, id }
//   POST   /api/admission-tests?id=N      → update → { ok, id }
//   DELETE /api/admission-tests?id=N      → delete → { ok }
//   POST   /api/admission-tests/import    → bulk upsert with cross-check

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface AdmissionTest {
  id?: number
  test_name: string
  test_name_bn: string
  academic_year_id: number | null
  class_name: string
  test_date: string
  start_time: string
  end_time: string
  room_id: number | null
  has_written: boolean
  has_mcq: boolean
  has_viva: boolean
  max_written_marks: number
  max_mcq_marks: number
  max_viva_marks: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export function emptyTest(): AdmissionTest {
  return {
    test_name: '',
    test_name_bn: '',
    academic_year_id: null,
    class_name: '',
    test_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    room_id: null,
    has_written: true,
    has_mcq: false,
    has_viva: true,
    max_written_marks: 100,
    max_mcq_marks: 100,
    max_viva_marks: 50,
    is_active: true,
  }
}

export async function fetchAdmissionTests(): Promise<AdmissionTest[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-tests`)
    if (!res.ok) return []
    const data = (await res.json()) as { admission_tests?: AdmissionTest[] }
    return data.admission_tests ?? []
  } catch {
    return []
  }
}

export async function saveAdmissionTest(test: AdmissionTest): Promise<boolean> {
  try {
    const isEdit = Boolean(test.id)
    const res = await fetch(`${API_BASE}/api/admission-tests${isEdit ? `?id=${test.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteAdmissionTest(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-tests?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface TestImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing test_name are skipped. */
export async function importAdmissionTests(items: AdmissionTest[]): Promise<TestImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/admission-tests/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as TestImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
