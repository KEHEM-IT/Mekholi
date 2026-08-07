// Excel export/import for Holidays & Working Days.
// Export builds a workbook with two sheets: "Working Days" and "Holidays";
// import reads both sheets and returns items for the cross-checked upsert.

import * as XLSX from 'xlsx'
import type {
  HolidayEntity,
  HolidayItem,
  WorkingDay,
  Holiday,
} from '@/composables/Institute_Setup/useHolidaysWorkingDays'

interface ColDef {
  header: string
  key: string
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

const normText = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const parseBool = (v: unknown) => ['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(String(v ?? '').trim().toLowerCase())
const boolText = (v: unknown) => (v ? 'Yes' : 'No')

function toIsoDate(v: unknown): string {
  if (v == null || v === '') return ''
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`
  }
  const s = String(v).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  return ''
}

const numOrZero = (v: unknown) => {
  const n = Number(v)
  return Number.isNaN(n) || String(v ?? '').trim() === '' ? 0 : n
}

export const SHEETS: Record<HolidayEntity, { label: string; cols: ColDef[] }> = {
  working_days: {
    label: 'Working Days',
    cols: [
      { header: 'Day of Week', key: 'day_of_week', parse: normText },
      { header: 'Is Working (Yes/No)', key: 'is_working', fmt: boolText, parse: parseBool },
      { header: 'Open Time', key: 'open_time', parse: normText },
      { header: 'Close Time', key: 'close_time', parse: normText },
    ],
  },
  holidays: {
    label: 'Holidays',
    cols: [
      { header: 'Holiday Name', key: 'holiday_name', parse: normText },
      { header: 'Holiday Name (Bangla)', key: 'holiday_name_bn', parse: normText },
      { header: 'Date From', key: 'date_from', fmt: toIsoDate, parse: toIsoDate },
      { header: 'Date To', key: 'date_to', fmt: toIsoDate, parse: toIsoDate },
      { header: 'Holiday Type', key: 'holiday_type', parse: normText },
      { header: 'Repeats Every Year (Yes/No)', key: 'is_recurring', fmt: boolText, parse: parseBool },
      { header: 'Special Working Day (Yes/No)', key: 'is_working_override', fmt: boolText, parse: parseBool },
      { header: 'Branch Id (0 = All)', key: 'branch_id', parse: numOrZero },
      { header: 'Remarks', key: 'remarks', parse: normText },
      { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
    ],
  },
}

export function exportHolidaysToExcel(lists: Record<HolidayEntity, HolidayItem[]>): void {
  const book = XLSX.utils.book_new()
  for (const entity of Object.keys(SHEETS) as HolidayEntity[]) {
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
  XLSX.writeFile(book, 'HolidaysWorkingDays.xlsx')
}

function parseSheet(
  book: XLSX.WorkBook,
  entity: HolidayEntity,
): HolidayItem[] {
  const { label, cols } = SHEETS[entity]
  const sheet = book.Sheets[label] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const items: HolidayItem[] = []
  const nameKey = entity === 'working_days' ? 'Day of Week' : 'Holiday Name'
  const nameField = entity === 'working_days' ? 'day_of_week' : 'holiday_name'

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
    items.push(item as unknown as HolidayItem)
  }
  return items
}

/** Parse BOTH sheets in one go — one click imports everything. */
export async function importHolidaysFromExcel(
  file: File,
): Promise<Record<HolidayEntity, HolidayItem[]>> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const result = {} as Record<HolidayEntity, HolidayItem[]>
  for (const entity of Object.keys(SHEETS) as HolidayEntity[]) {
    result[entity] = parseSheet(book, entity)
  }
  return result
}

function emptyOf(entity: HolidayEntity): HolidayItem {
  if (entity === 'working_days') {
    return { day_of_week: '', is_working: true, open_time: '', close_time: '', is_active: true } as WorkingDay
  }
  return {
    holiday_name: '', holiday_name_bn: '', date_from: '', date_to: '', holiday_type: '',
    is_recurring: false, is_working_override: false, branch_id: 0, remarks: '', is_active: true,
  } as Holiday
}
