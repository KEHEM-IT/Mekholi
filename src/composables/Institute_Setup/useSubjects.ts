// Subjects & Curriculum API helpers — shared CRUD via the local Python
// backend (same pattern as useBoards).
//
//   GET    /api/subjects           → { subjects: [...] }
//   POST   /api/subjects           → create → { ok, id }
//   POST   /api/subjects?id=N      → update → { ok, id }
//   DELETE /api/subjects?id=N      → delete → { ok }
//   POST   /api/subjects/import    → bulk upsert with cross-check

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface MarksRow {
  class_id: number | null
  full_marks_theory: number | null
  full_marks_practical: number | null
  full_marks_ca: number | null
  pass_marks: number | null
  periods_week: number | null
  book_names: string
}

export interface Subject {
  id?: number
  subject_name: string
  subject_code: string
  subject_type: string
  board_id: number | null
  group_id: number | null
  version: string
  class_level_ids: number[]
  marks_distribution: MarksRow[]
  is_builtin: boolean
  is_active: boolean
}

export function emptySubject(): Subject {
  return {
    subject_name: '',
    subject_code: '',
    subject_type: '',
    board_id: null,
    group_id: null,
    version: '',
    class_level_ids: [],
    marks_distribution: [],
    is_builtin: false,
    is_active: true,
  }
}

export async function fetchSubjects(): Promise<Subject[]> {
  try {
    const res = await fetch(`${API_BASE}/api/subjects`)
    if (!res.ok) return []
    const data = (await res.json()) as { subjects?: Subject[] }
    return data.subjects ?? []
  } catch {
    return []
  }
}

export async function saveSubject(subject: Subject): Promise<boolean> {
  try {
    const isEdit = Boolean(subject.id)
    const res = await fetch(`${API_BASE}/api/subjects${isEdit ? `?id=${subject.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteSubject(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/subjects?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface SubjectImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing name+board are skipped. */
export async function importSubjects(items: Subject[]): Promise<SubjectImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/subjects/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as SubjectImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
