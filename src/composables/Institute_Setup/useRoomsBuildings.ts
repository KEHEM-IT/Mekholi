// Classrooms / Rooms / Buildings API helpers — shared CRUD via the local
// Python backend (same pattern as useClassesSetup).
//
//   GET    /api/{entity}           → { <entity>: [...] }
//   POST   /api/{entity}           → create → { ok, id }
//   POST   /api/{entity}?id=N      → update → { ok, id }
//   DELETE /api/{entity}?id=N      → delete → { ok }
//   POST   /api/rooms/import       → bulk upsert with cross-check

const API_BASE = 'http://localhost:5000'

export type RoomEntity = 'buildings' | 'rooms'

export interface Building {
  id?: number
  building_name: string
  building_name_bn: string
  building_code: string
  floor_count: number | null
  is_active: boolean
}

export interface Room {
  id?: number
  room_no: string
  room_no_bn: string
  building_id: number | null
  floor_no: number | null
  room_type: string
  capacity: number | null
  facilities: string[]
  status: string
  is_active: boolean
}

export type RoomItem = Building | Room

export function emptyItem(entity: RoomEntity): RoomItem {
  if (entity === 'buildings') {
    return { building_name: '', building_name_bn: '', building_code: '', floor_count: null, is_active: true }
  }
  return {
    room_no: '', room_no_bn: '', building_id: null, floor_no: null,
    room_type: '', capacity: null, facilities: [], status: 'Active', is_active: true,
  }
}

export async function fetchItems(entity: RoomEntity): Promise<RoomItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/${entity}`)
    if (!res.ok) return []
    const data = (await res.json()) as Record<string, RoomItem[]>
    return data[entity] ?? []
  } catch {
    return []
  }
}

export async function saveItem(entity: RoomEntity, item: RoomItem): Promise<boolean> {
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

export async function deleteItem(entity: RoomEntity, id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/${entity}?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export interface RoomImportResult {
  ok: boolean
  inserted: Record<RoomEntity, number>
  skipped: Record<RoomEntity, string[]>
}

/** Bulk import with cross-check (upsert) — existing matches are skipped. */
export async function importRoomsAll(
  payload: Record<RoomEntity, RoomItem[]>,
): Promise<RoomImportResult> {
  const empty = {
    ok: false,
    inserted: { buildings: 0, rooms: 0 },
    skipped: { buildings: [] as string[], rooms: [] as string[] },
  }
  try {
    const res = await fetch(`${API_BASE}/api/rooms/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return empty
    const data = (await res.json()) as RoomImportResult
    return { ...empty, ...data }
  } catch {
    return empty
  }
}
