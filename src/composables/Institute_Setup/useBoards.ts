// Board & Regulatory Setup API helpers — shared CRUD via the local Python
// backend (same pattern as useBranches).
//
//   GET    /api/boards           → { boards: [...] }
//   POST   /api/boards           → create → { ok, id }
//   POST   /api/boards?id=N      → update → { ok, id }
//   DELETE /api/boards?id=N      → delete → { ok }
//   POST   /api/boards/import    → bulk upsert with cross-check

const API_BASE = 'http://localhost:5000'

export interface BoardRegulatory {
  recognition_no: string
  recognition_date: string
  registration_no: string
  mpo_no: string
  document: string
}

export interface Board {
  id?: number
  board_name: string
  board_name_bn: string
  board_code: string
  board_type: string
  institute_type_ids: number[]
  website: string
  contact: string
  address: string
  remarks: string
  regulatory: BoardRegulatory
  is_builtin: boolean
  is_active: boolean
}

export function emptyBoard(): Board {
  return {
    board_name: '',
    board_name_bn: '',
    board_code: '',
    board_type: '',
    institute_type_ids: [],
    website: '',
    contact: '',
    address: '',
    remarks: '',
    regulatory: { recognition_no: '', recognition_date: '', registration_no: '', mpo_no: '', document: '' },
    is_builtin: false,
    is_active: true,
  }
}

export async function fetchBoards(): Promise<Board[]> {
  try {
    const res = await fetch(`${API_BASE}/api/boards`)
    if (!res.ok) return []
    const data = (await res.json()) as { boards?: Board[] }
    return data.boards ?? []
  } catch {
    return []
  }
}

export async function saveBoard(board: Board): Promise<boolean> {
  try {
    const isEdit = Boolean(board.id)
    const res = await fetch(`${API_BASE}/api/boards${isEdit ? `?id=${board.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteBoard(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/boards?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface BoardImportResult {
  ok: boolean
  inserted: number
  skipped: string[]
}

/** Bulk import with cross-check (upsert) — existing names are skipped. */
export async function importBoards(items: Board[]): Promise<BoardImportResult> {
  const empty = { ok: false, inserted: 0, skipped: [] as string[] }
  try {
    const res = await fetch(`${API_BASE}/api/boards/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as BoardImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
