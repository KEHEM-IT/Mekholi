// Holidays & Working Days API helpers — shared CRUD via the local Python
// backend (same pattern as useClassesSetup).
//
//   GET    /api/{entity}           → { <entity>: [...] }
//   POST   /api/{entity}           → create → { ok, id }
//   POST   /api/{entity}?id=N      → update → { ok, id }
//   DELETE /api/{entity}?id=N      → delete → { ok }
//   POST   /api/holidays/import    → bulk upsert with cross-check

const API_BASE = 'http://localhost:5000'

export type HolidayEntity = 'working_days' | 'holidays'

export interface WorkingDay {
  id?: number
  day_of_week: string
  is_working: boolean
  open_time: string
  close_time: string
  is_active: boolean
}

export interface Holiday {
  id?: number
  holiday_name: string
  holiday_name_bn: string
  date_from: string
  date_to: string
  holiday_type: string
  is_recurring: boolean
  is_working_override: boolean
  branch_id: number | null
  remarks: string
  is_active: boolean
}

export type HolidayItem = WorkingDay | Holiday

export function emptyItem(entity: HolidayEntity): HolidayItem {
  if (entity === 'working_days') {
    return { day_of_week: '', is_working: true, open_time: '', close_time: '', is_active: true }
  }
  return {
    holiday_name: '', holiday_name_bn: '',
    date_from: '', date_to: '', holiday_type: '',
    is_recurring: false, is_working_override: false,
    branch_id: null, remarks: '', is_active: true,
  }
}

export async function fetchItems(entity: HolidayEntity): Promise<HolidayItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/${entity === 'working_days' ? 'working-days' : 'holidays'}`)
    if (!res.ok) return []
    const data = (await res.json()) as Record<string, HolidayItem[]>
    return data[entity] ?? []
  } catch {
    return []
  }
}

export async function saveItem(entity: HolidayEntity, item: HolidayItem): Promise<boolean> {
  try {
    const isEdit = Boolean(item.id)
    const res = await fetch(
      `${API_BASE}/api/${entity === 'working_days' ? 'working-days' : 'holidays'}${isEdit ? `?id=${item.id}` : ''}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      },
    )
    return res.ok
  } catch {
    return false
  }
}

export async function deleteItem(entity: HolidayEntity, id: number): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/api/${entity === 'working_days' ? 'working-days' : 'holidays'}?id=${id}`,
      { method: 'DELETE' },
    )
    return res.ok
  } catch {
    return false
  }
}

export interface HolidayImportResult {
  ok: boolean
  inserted: Record<HolidayEntity, number>
  skipped: Record<HolidayEntity, string[]>
}

/**
 * Bulk import with cross-check (upsert): rows that already exist in the DB
 * (matched by natural key) are skipped — only new rows are stored.
 */
export async function importHolidaysAll(
  payload: Record<HolidayEntity, HolidayItem[]>,
): Promise<HolidayImportResult> {
  const empty = {
    ok: false,
    inserted: { working_days: 0, holidays: 0 },
    skipped: { working_days: [] as string[], holidays: [] as string[] },
  }
  try {
    const res = await fetch(`${API_BASE}/api/holidays/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as HolidayImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
