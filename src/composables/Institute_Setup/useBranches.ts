// Branch/Campus API helpers — list / create / update / delete via the
// local Python backend (same pattern as useInstituteProfile).
//
//   GET    /api/branches        → { branches: [...] }
//   POST   /api/branches        → create   → { ok, id }
//   POST   /api/branches?id=N   → update   → { ok, id }
//   DELETE /api/branches?id=N   → delete   → { ok }

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface Branch {
  id?: number
  branch_name: string
  branch_name_bn: string
  branch_code: string
  campus_type: string
  is_main: boolean
  logo: string
  division_id: string
  district_id: string
  upazila_id: string
  union_id: string
  village_road_holding_no: string
  post_office: string
  post_code: string | number | null
  phone: string
  email: string
  website: string
  head_name: string
  head_designation: string
  head_phone: string
  head_email: string
  eiin: string
  board: string
  institute_type: string
  shift: string
  established_date: string
  is_active: boolean
  admission_open: boolean
  created_at?: string
  updated_at?: string
}

export function emptyBranch(): Branch {
  return {
    branch_name: '',
    branch_name_bn: '',
    branch_code: '',
    campus_type: 'Main',
    is_main: false,
    logo: '',
    division_id: '',
    district_id: '',
    upazila_id: '',
    union_id: '',
    village_road_holding_no: '',
    post_office: '',
    post_code: null,
    phone: '',
    email: '',
    website: '',
    head_name: '',
    head_designation: '',
    head_phone: '',
    head_email: '',
    eiin: '',
    board: '',
    institute_type: '',
    shift: '',
    established_date: '',
    is_active: true,
    admission_open: true,
  }
}

export async function fetchBranches(): Promise<Branch[]> {
  try {
    const res = await fetch(`${API_BASE}/api/branches`)
    if (!res.ok) return []
    const data = (await res.json()) as { branches?: Branch[] }
    return data.branches ?? []
  } catch {
    return []
  }
}

export async function saveBranch(branch: Branch): Promise<boolean> {
  try {
    const isEdit = Boolean(branch.id)
    const res = await fetch(`${API_BASE}/api/branches${isEdit ? `?id=${branch.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteBranch(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/branches?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface BranchImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/**
 * Bulk import with cross-check (upsert): branches whose name already exists
 * are skipped — only new branches are stored.
 */
export async function importBranches(items: Branch[]): Promise<BranchImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/branches/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as BranchImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
