// Excel export/import for Class / Section / Group / Shift.
// Export builds a workbook with one sheet per entity; import reads the
// sheet that matches the active tab.

import * as XLSX from 'xlsx'
import type {
  ClassSetupEntity,
  ClassSetupItem,
  ClassItem,
  SectionItem,
  GroupItem,
  ShiftItem,
} from '@/composables/Institute_Setup/useClassesSetup'

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

export const ENTITY_SHEETS: Record<ClassSetupEntity, { label: string; cols: ColDef[] }> = {
  classes: {
    label: 'Classes',
    cols: [
      { header: 'Class Name', key: 'class_name', parse: normText },
      { header: 'Class Name (Bangla)', key: 'class_name_bn', parse: normText },
      { header: 'Phase', key: 'phase', parse: normText },
      { header: 'Sort Order', key: 'sort_order', parse: numOrNull },
      { header: 'Academic Year Id', key: 'academic_year_id', parse: numOrNull },
      { header: 'Branch Id', key: 'branch_id', parse: numOrNull },
      { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
    ],
  },
  sections: {
    label: 'Sections',
    cols: [
      { header: 'Section Name', key: 'section_name', parse: normText },
      { header: 'Section Name (Bangla)', key: 'section_name_bn', parse: normText },
      { header: 'Class Id', key: 'class_id', parse: numOrNull },
      { header: 'Shift Id', key: 'shift_id', parse: numOrNull },
      { header: 'Capacity', key: 'capacity', parse: numOrNull },
      { header: 'Room Id', key: 'room_id', parse: numOrNull },
      { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
    ],
  },
  groups: {
    label: 'Groups',
    cols: [
      { header: 'Group Name', key: 'group_name', parse: normText },
      { header: 'Group Name (Bangla)', key: 'group_name_bn', parse: normText },
      { header: 'Class Ids (comma)', key: 'class_ids', fmt: (v) => (Array.isArray(v) ? v.join(', ') : ''), parse: (v) => String(v ?? '').split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)) },
      { header: 'Version', key: 'version', parse: normText },
      { header: 'Group Type', key: 'group_type', parse: normText },
      { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
    ],
  },
  shifts: {
    label: 'Shifts',
    cols: [
      { header: 'Shift Name', key: 'shift_name', parse: normText },
      { header: 'Shift Name (Bangla)', key: 'shift_name_bn', parse: normText },
      { header: 'Start Time', key: 'start_time', parse: normText },
      { header: 'End Time', key: 'end_time', parse: normText },
      { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
    ],
  },
}

export function exportClassesSetupToExcel(lists: Record<ClassSetupEntity, ClassSetupItem[]>): void {
  const book = XLSX.utils.book_new()
  for (const entity of Object.keys(ENTITY_SHEETS) as ClassSetupEntity[]) {
    const { label, cols } = ENTITY_SHEETS[entity]
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
  XLSX.writeFile(book, 'ClassSetup.xlsx')
}

/** Parse one sheet of the workbook into items for the given entity. */
function parseSheet(
  book: XLSX.WorkBook,
  entity: ClassSetupEntity,
): { items: ClassSetupItem[]; skipped: string[] } {
  const { label, cols } = ENTITY_SHEETS[entity]
  const sheet = book.Sheets[label] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) return { items: [], skipped: [] }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const items: ClassSetupItem[] = []
  const skipped: string[] = []
  const nameKey = entity === 'classes' ? 'Class Name' : entity === 'sections' ? 'Section Name' : entity === 'groups' ? 'Group Name' : 'Shift Name'
  const nameField = entity === 'classes' ? 'class_name' : entity === 'sections' ? 'section_name' : entity === 'groups' ? 'group_name' : 'shift_name'

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
    items.push(item as unknown as ClassSetupItem)
  }
  return { items, skipped }
}

/** Import a SINGLE entity's sheet (kept for per-tab use). */
export async function importClassesSetupFromExcel(
  file: File,
  entity: ClassSetupEntity,
): Promise<{ items: ClassSetupItem[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  return parseSheet(book, entity)
}

/** Import ALL 4 sheets in one go — one click imports everything. */
export async function importAllClassesSetupSheets(
  file: File,
): Promise<Record<ClassSetupEntity, ClassSetupItem[]>> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const result = {} as Record<ClassSetupEntity, ClassSetupItem[]>
  for (const entity of Object.keys(ENTITY_SHEETS) as ClassSetupEntity[]) {
    result[entity] = parseSheet(book, entity).items
  }
  return result
}

function emptyOf(entity: ClassSetupEntity): ClassSetupItem {
  switch (entity) {
    case 'classes': return { class_name: '', class_name_bn: '', phase: '', sort_order: null, academic_year_id: null, branch_id: null, is_active: true } as ClassItem
    case 'sections': return { section_name: '', section_name_bn: '', class_id: null, shift_id: null, capacity: null, room_id: null, is_active: true } as SectionItem
    case 'groups': return { group_name: '', group_name_bn: '', class_ids: [], version: '', group_type: '', is_active: true } as GroupItem
    case 'shifts': return { shift_name: '', shift_name_bn: '', start_time: '', end_time: '', is_active: true } as ShiftItem
  }
}
