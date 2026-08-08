// Grading Scheme API helpers — shared CRUD via the local Python backend.
//
//   GET    /api/grading-schemes           → { grading_schemes: [...] }
//   POST   /api/grading-schemes           → create → { ok, id }
//   POST   /api/grading-schemes?id=N      → update → { ok, id }
//   DELETE /api/grading-schemes?id=N      → delete → { ok }
//   POST   /api/grading-schemes/import    → bulk upsert with cross-check

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface GradeRow {
  grade_name: string
  grade_name_bn: string
  grade_point: number | null
  min_percent: number | null
  max_percent: number | null
  remarks: string
}

export interface GradingScheme {
  id?: number
  scheme_name: string
  scheme_name_bn: string
  grading_type: string
  class_level_ids: number[]
  board_id: string
  pass_marks: number | null
  grades: GradeRow[]
  is_default: boolean
  is_active: boolean
}

export function emptyScheme(): GradingScheme {
  return {
    scheme_name: '',
    scheme_name_bn: '',
    grading_type: '',
    class_level_ids: [],
    board_id: '',
    pass_marks: null,
    grades: [],
    is_default: false,
    is_active: true,
  }
}

export async function fetchSchemes(): Promise<GradingScheme[]> {
  try {
    const res = await fetch(`${API_BASE}/api/grading-schemes`)
    if (!res.ok) return []
    const data = (await res.json()) as { grading_schemes?: GradingScheme[] }
    return data.grading_schemes ?? []
  } catch {
    return []
  }
}

export async function saveScheme(scheme: GradingScheme): Promise<boolean> {
  try {
    const isEdit = Boolean(scheme.id)
    const res = await fetch(`${API_BASE}/api/grading-schemes${isEdit ? `?id=${scheme.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheme),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteScheme(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/grading-schemes?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface SchemeImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing names are skipped. */
export async function importSchemes(items: GradingScheme[]): Promise<SchemeImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/grading-schemes/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as SchemeImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
