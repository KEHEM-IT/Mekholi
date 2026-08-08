// Excel export/import for Classrooms / Rooms / Buildings.
// Two sheets: "Buildings" and "Rooms". Import reads both.

import * as XLSX from 'xlsx'
import type { RoomEntity, RoomItem, Building, Room } from '@/composables/Institute_Setup/useRoomsBuildings'

interface ColDef {
  header: string
  key: string
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

const normText = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const parseBool = (v: unknown) => ['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(String(v ?? '').trim().toLowerCase())
const boolText = (v: unknown) => (v ? 'Yes' : 'No')
const numOrNull = (v: unknown) => {
  const n = Number(v)
  return Number.isNaN(n) || String(v ?? '').trim() === '' ? null : n
}

export const SHEETS: Record<RoomEntity, { label: string; cols: ColDef[] }> = {
  buildings: {
    label: 'Buildings',
    cols: [
      { header: 'Building Name', key: 'building_name', parse: normText },
      { header: 'Building Name (Bangla)', key: 'building_name_bn', parse: normText },
      { header: 'Building Code', key: 'building_code', parse: normText },
      { header: 'Number of Floors', key: 'floor_count', parse: numOrNull },
      { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
    ],
  },
  rooms: {
    label: 'Rooms',
    cols: [
      { header: 'Room No', key: 'room_no', parse: normText },
      { header: 'Room No (Bangla)', key: 'room_no_bn', parse: normText },
      { header: 'Building Id', key: 'building_id', parse: numOrNull },
      { header: 'Floor No (0 = Ground)', key: 'floor_no', parse: numOrNull },
      { header: 'Room Type', key: 'room_type', parse: normText },
      { header: 'Capacity', key: 'capacity', parse: numOrNull },
      { header: 'Facilities (comma)', key: 'facilities', fmt: (v: unknown) => (Array.isArray(v) ? (v as string[]).join(', ') : ''), parse: (v: unknown) => String(v ?? '').split(',').map((x) => x.trim()).filter(Boolean) },
      { header: 'Status (Active/Maintenance)', key: 'status', parse: normText },
      { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
    ],
  },
}

export function exportRoomsToExcel(lists: Record<RoomEntity, RoomItem[]>): void {
  const book = XLSX.utils.book_new()
  for (const entity of Object.keys(SHEETS) as RoomEntity[]) {
    const { label, cols } = SHEETS[entity]
    const rows: (string | number)[][] = [cols.map((c) => c.header)]
    for (const item of lists[entity]) {
      rows.push(
        cols.map((c) => {
          const raw = (item as unknown as Record<string, unknown>)[c.key]
          const v = raw == null ? '' : raw
          return c.fmt ? c.fmt(v) : (v as string | number)
        }),
      )
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = cols.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }))
    XLSX.utils.book_append_sheet(book, ws, label)
  }
  XLSX.writeFile(book, 'RoomsBuildings.xlsx')
}

function parseSheet(book: XLSX.WorkBook, entity: RoomEntity): RoomItem[] {
  const { label, cols } = SHEETS[entity]
  const sheet = book.Sheets[label] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const items: RoomItem[] = []
  const nameKey = entity === 'buildings' ? 'Building Name' : 'Room No'
  const nameField = entity === 'buildings' ? 'building_name' : 'room_no'

  for (const row of rows) {
    const name = String(row[nameKey] ?? '').trim()
    if (!name) continue
    const item: Record<string, unknown> = { ...emptyOf(entity) }
    for (const col of cols) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      item[col.key] = col.parse ? col.parse(raw) : raw
    }
    item[nameField] = name
    items.push(item as unknown as RoomItem)
  }
  return items
}

/** Parse BOTH sheets in one go — one click imports everything. */
export async function importRoomsFromExcel(
  file: File,
): Promise<Record<RoomEntity, RoomItem[]>> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const result = {} as Record<RoomEntity, RoomItem[]>
  for (const entity of Object.keys(SHEETS) as RoomEntity[]) {
    result[entity] = parseSheet(book, entity)
  }
  return result
}

function emptyOf(entity: RoomEntity): RoomItem {
  if (entity === 'buildings') {
    return { building_name: '', building_name_bn: '', building_code: '', floor_count: null, is_active: true } as Building
  }
  return {
    room_no: '', room_no_bn: '', building_id: null, floor_no: null,
    room_type: '', capacity: null, facilities: [], status: 'Active', is_active: true,
  } as Room
}
