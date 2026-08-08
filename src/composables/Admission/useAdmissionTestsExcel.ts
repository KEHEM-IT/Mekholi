// Excel export/import for Admission Tests.
// Sheet "Tests": one row per test schedule.

import * as XLSX from 'xlsx'
import { emptyTest, type AdmissionTest } from '@/composables/Admission/useAdmissionTests'

const normText = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const parseBool = (v: unknown) => ['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(String(v ?? '').trim().toLowerCase())
const boolText = (v: unknown) => (v ? 'Yes' : 'No')
const numOrNull = (v: unknown) => {
  const n = Number(v)
  return Number.isNaN(n) || String(v ?? '').trim() === '' ? null : n
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

interface ColDef {
  header: string
  key: string
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

const COLS: ColDef[] = [
  { header: 'Test Name', key: 'test_name', parse: normText },
  { header: 'Test Name (Bangla)', key: 'test_name_bn', parse: normText },
  { header: 'Academic Year Id', key: 'academic_year_id', parse: numOrNull },
  { header: 'Desired Class', key: 'class_name', parse: normText },
  { header: 'Test Date', key: 'test_date', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Start Time', key: 'start_time', parse: normText },
  { header: 'End Time', key: 'end_time', parse: normText },
  { header: 'Room Id', key: 'room_id', parse: numOrNull },
  { header: 'Has Written (Yes/No)', key: 'has_written', fmt: boolText, parse: parseBool },
  { header: 'Has MCQ (Yes/No)', key: 'has_mcq', fmt: boolText, parse: parseBool },
  { header: 'Has VIVA (Yes/No)', key: 'has_viva', fmt: boolText, parse: parseBool },
  { header: 'Max Written Marks', key: 'max_written_marks', parse: numOrNull },
  { header: 'Max MCQ Marks', key: 'max_mcq_marks', parse: numOrNull },
  { header: 'Max VIVA Marks', key: 'max_viva_marks', parse: numOrNull },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
]

export function exportTestsToExcel(tests: AdmissionTest[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of tests) {
    rows.push(
      COLS.map((c) => {
        const raw = (s as unknown as Record<string, unknown>)[c.key]
        const v = raw == null ? '' : raw
        return c.fmt ? c.fmt(v) : (v as string | number)
      }),
    )
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = COLS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, ws, 'Tests')
  XLSX.writeFile(book, 'AdmissionTests.xlsx')
}

export async function importTestsFromExcel(file: File): Promise<{ tests: AdmissionTest[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Tests'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const tests: AdmissionTest[] = []
  const skipped: string[] = []
  const empty: AdmissionTest = emptyTest()

  for (const row of rows) {
    const name = String(row['Test Name'] ?? '').trim()
    if (!name) continue
    const test: AdmissionTest = { ...empty }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(test as unknown as Record<string, unknown>)[col.key] = parsed
    }
    test.test_name = name
    tests.push(test)
  }
  return { tests, skipped }
}
