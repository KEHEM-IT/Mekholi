// Class / Section / Group / Shift API helpers — shared CRUD via the local
// Python backend (same pattern as useBranches).
//
//   GET    /api/{entity}      → { <entity>: [...] }
//   POST   /api/{entity}      → create → { ok, id }
//   POST   /api/{entity}?id=N → update → { ok, id }
//   DELETE /api/{entity}?id=N → delete → { ok }

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export type ClassSetupEntity = 'classes' | 'sections' | 'groups' | 'shifts'

export interface ClassItem {
  id?: number
  class_name: string
  class_name_bn: string
  phase: string
  sort_order: number | null
  academic_year_id: number | null
  branch_id: number | null
  is_active: boolean
}

export interface SectionItem {
  id?: number
  section_name: string
  section_name_bn: string
  class_id: number | null
  shift_id: number | null
  capacity: number | null
  room_id: number | null
  is_active: boolean
}

export interface GroupItem {
  id?: number
  group_name: string
  group_name_bn: string
  class_ids: number[]
  version: string
  group_type: string
  is_active: boolean
}

export interface ShiftItem {
  id?: number
  shift_name: string
  shift_name_bn: string
  start_time: string
  end_time: string
  is_active: boolean
}

export type ClassSetupItem = ClassItem | SectionItem | GroupItem | ShiftItem

export function emptyItem(entity: ClassSetupEntity): ClassSetupItem {
  switch (entity) {
    case 'classes':
      return { class_name: '', class_name_bn: '', phase: '', sort_order: null, academic_year_id: null, branch_id: null, is_active: true }
    case 'sections':
      return { section_name: '', section_name_bn: '', class_id: null, shift_id: null, capacity: null, room_id: null, is_active: true }
    case 'groups':
      return { group_name: '', group_name_bn: '', class_ids: [], version: '', group_type: '', is_active: true }
    case 'shifts':
      return { shift_name: '', shift_name_bn: '', start_time: '', end_time: '', is_active: true }
  }
}

export async function fetchItems(entity: ClassSetupEntity): Promise<ClassSetupItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/${entity}`)
    if (!res.ok) return []
    const data = (await res.json()) as Record<string, ClassSetupItem[]>
    return data[entity] ?? []
  } catch {
    return []
  }
}

export async function saveItem(entity: ClassSetupEntity, item: ClassSetupItem): Promise<boolean> {
  try {
    const isEdit = Boolean(item.id)
    const res = await fetch(`${API_BASE}/api/${entity}${isEdit ? `?id=${item.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteItem(entity: ClassSetupEntity, id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/${entity}?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface ClassSetupImportResult {
  ok: boolean
  inserted: Record<ClassSetupEntity, number>
  skipped: Record<ClassSetupEntity, string[]>
}

/**
 * Bulk import with cross-check (upsert): rows that already exist in the DB
 * (matched by natural key) are skipped — only new rows are stored.
 */
export async function importClassSetupAll(
  payload: Record<ClassSetupEntity, ClassSetupItem[]>,
): Promise<ClassSetupImportResult> {
  const empty = { ok: false, inserted: { classes: 0, sections: 0, groups: 0, shifts: 0 }, skipped: { classes: [], sections: [], groups: [], shifts: [] } }
  try {
    const res = await fetch(`${API_BASE}/api/class-setup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as ClassSetupImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
