// Exam Terms & Types API helpers — shared CRUD via the local Python backend.
//
//   GET    /api/exam-terms           → { exam_terms: [...] }
//   POST   /api/exam-terms           → create → { ok, id }
//   POST   /api/exam-terms?id=N      → update → { ok, id }
//   DELETE /api/exam-terms?id=N      → delete → { ok }
//   POST   /api/exam-terms/import    → bulk upsert with cross-check

const API_BASE = 'http://localhost:5000'

export interface ExamTerm {
  id?: number
  exam_name: string
  exam_name_bn: string
  exam_type: string
  board_id: number | null
  term_id: number | null
  class_ids: number[]
  scheme_id: number | null
  exam_start: string
  exam_end: string
  publish_to_portal: boolean
  is_board_exam: boolean
  is_builtin: boolean
  is_active: boolean
}

export function emptyExamTerm(): ExamTerm {
  return {
    exam_name: '',
    exam_name_bn: '',
    exam_type: '',
    board_id: null,
    term_id: null,
    class_ids: [],
    scheme_id: null,
    exam_start: '',
    exam_end: '',
    publish_to_portal: false,
    is_board_exam: false,
    is_builtin: false,
    is_active: true,
  }
}

export async function fetchExamTerms(): Promise<ExamTerm[]> {
  try {
    const res = await fetch(`${API_BASE}/api/exam-terms`)
    if (!res.ok) return []
    const data = (await res.json()) as { exam_terms?: ExamTerm[] }
    return data.exam_terms ?? []
  } catch {
    return []
  }
}

export async function saveExamTerm(exam: ExamTerm): Promise<boolean> {
  try {
    const isEdit = Boolean(exam.id)
    const res = await fetch(`${API_BASE}/api/exam-terms${isEdit ? `?id=${exam.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exam),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteExamTerm(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/exam-terms?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface ExamImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing names are skipped. */
export async function importExamTerms(items: ExamTerm[]): Promise<ExamImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/exam-terms/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as ExamImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
