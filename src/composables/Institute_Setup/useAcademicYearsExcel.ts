// Excel export/import for Academic Years — table format (one row per year).

import * as XLSX from 'xlsx'
import type { AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'

interface ColDef {
  header: string
  key: keyof AcademicYear
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

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

function parseBool(v: unknown): boolean {
  return ['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(String(v ?? '').trim().toLowerCase())
}

const boolText = (v: unknown) => (v ? 'Yes' : 'No')
const normText = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

export const ACADEMIC_YEAR_COLUMNS: ColDef[] = [
  { header: 'Year Name', key: 'year_name', parse: normText },
  { header: 'Year Name (Bangla)', key: 'year_name_bn', parse: normText },
  { header: 'Start Date', key: 'start_date', fmt: toIsoDate, parse: toIsoDate },
  { header: 'End Date', key: 'end_date', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Registration From', key: 'reg_start', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Registration To', key: 'reg_end', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Is Current (Yes/No)', key: 'is_current', fmt: boolText, parse: parseBool },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
  { header: 'Remarks', key: 'remarks', parse: normText },
]

export function exportAcademicYearsToExcel(years: AcademicYear[]): void {
  const rows: (string | number)[][] = [ACADEMIC_YEAR_COLUMNS.map((c) => c.header)]
  for (const y of years) {
    rows.push(
      ACADEMIC_YEAR_COLUMNS.map((c) => {
        const raw = y[c.key]
        const v = raw == null ? '' : raw
        return c.fmt ? c.fmt(v) : (v as string | number)
      }),
    )
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = ACADEMIC_YEAR_COLUMNS.map((c) => ({ wch: Math.max(c.header.length + 4, 16) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, ws, 'Academic Years')
  XLSX.writeFile(book, 'AcademicYears.xlsx')
}

export async function importAcademicYearsFromExcel(
  file: File,
): Promise<{ years: AcademicYear[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Academic Years'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const years: AcademicYear[] = []
  const skipped: string[] = []
  const now = new Date().getFullYear()
  const empty: AcademicYear = {
    year_name: String(now), year_name_bn: '', start_date: `${now}-01-01`, end_date: `${now}-12-31`,
    reg_start: '', reg_end: '', is_current: false, is_active: true, remarks: '',
  }

  for (const row of rows) {
    const name = String(row['Year Name'] ?? '').trim()
    if (!name) continue
    const year: AcademicYear = { ...empty }
    for (const col of ACADEMIC_YEAR_COLUMNS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(year as unknown as Record<string, unknown>)[col.key as string] = parsed
    }
    year.year_name = name
    years.push(year)
  }
  return { years, skipped }
}
