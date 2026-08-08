// Academic Sessions & Terms API helpers — shared CRUD via the local Python
// backend (same pattern as useBranches).
//
//   GET    /api/academic-sessions           → { academic_sessions: [...] }
//   POST   /api/academic-sessions           → create → { ok, id }
//   POST   /api/academic-sessions?id=N      → update → { ok, id }
//   DELETE /api/academic-sessions?id=N      → delete → { ok }
//   POST   /api/academic-sessions/import    → bulk upsert with cross-check

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface AcademicSessionTerm {
  id?: number
  session_name: string
  session_name_bn: string
  academic_year_id: number | null
  term_name: string
  term_name_bn: string
  term_order: number | null
  term_start: string
  term_end: string
  is_current: boolean
  result_type: string
  is_active: boolean
}

export function emptySession(): AcademicSessionTerm {
  return {
    session_name: '',
    session_name_bn: '',
    academic_year_id: null,
    term_name: '',
    term_name_bn: '',
    term_order: null,
    term_start: '',
    term_end: '',
    is_current: false,
    result_type: '',
    is_active: true,
  }
}

export async function fetchSessions(): Promise<AcademicSessionTerm[]> {
  try {
    const res = await fetch(`${API_BASE}/api/academic-sessions`)
    if (!res.ok) return []
    const data = (await res.json()) as { academic_sessions?: AcademicSessionTerm[] }
    return data.academic_sessions ?? []
  } catch {
    return []
  }
}

export async function saveSession(session: AcademicSessionTerm): Promise<boolean> {
  try {
    const isEdit = Boolean(session.id)
    const res = await fetch(`${API_BASE}/api/academic-sessions${isEdit ? `?id=${session.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteSession(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/academic-sessions?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface SessionImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing session+term are skipped. */
export async function importSessions(items: AcademicSessionTerm[]): Promise<SessionImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/academic-sessions/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as SessionImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
