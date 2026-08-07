// Academic Year API helpers — list / create / update / delete via the
// local Python backend (same pattern as useBranches).
//
//   GET    /api/academic-years      → { academic_years: [...] }
//   POST   /api/academic-years      → create   → { ok, id }
//   POST   /api/academic-years?id=N → update   → { ok, id }
//   DELETE /api/academic-years?id=N → delete   → { ok }

const API_BASE = 'http://localhost:5000'

export interface AcademicYear {
  id?: number
  year_name: string
  year_name_bn: string
  start_date: string
  end_date: string
  reg_start: string
  reg_end: string
  is_current: boolean
  is_active: boolean
  remarks: string
  created_at?: string
  updated_at?: string
}

export function emptyAcademicYear(): AcademicYear {
  const now = new Date().getFullYear()
  return {
    year_name: String(now),
    year_name_bn: '',
    start_date: `${now}-01-01`,
    end_date: `${now}-12-31`,
    reg_start: '',
    reg_end: '',
    is_current: false,
    is_active: true,
    remarks: '',
  }
}

export async function fetchAcademicYears(): Promise<AcademicYear[]> {
  try {
    const res = await fetch(`${API_BASE}/api/academic-years`)
    if (!res.ok) return []
    const data = (await res.json()) as { academic_years?: AcademicYear[] }
    return data.academic_years ?? []
  } catch {
    return []
  }
}

export async function saveAcademicYear(year: AcademicYear): Promise<boolean> {
  try {
    const isEdit = Boolean(year.id)
    const res = await fetch(`${API_BASE}/api/academic-years${isEdit ? `?id=${year.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(year),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteAcademicYear(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/academic-years?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface AcademicYearImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/**
 * Bulk import with cross-check (upsert): years whose name already exists are
 * skipped — only new years are stored.
 */
export async function importAcademicYears(items: AcademicYear[]): Promise<AcademicYearImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/academic-years/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as AcademicYearImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
