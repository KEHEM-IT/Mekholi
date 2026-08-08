// Excel export/import for Grading Schemes.
// Sheet "Grading Schemes": one row per scheme. Grade rows are serialized as
// semicolon-separated chunks, pipe-separated fields:
//   "A+|A+|5.00|80|100|Excellent ; B|B|4.00|70|79|Very Good"
// (grade_name | grade_name_bn | grade_point | min_percent | max_percent | remarks)

import * as XLSX from 'xlsx'
import type { GradingScheme, GradeRow } from '@/composables/Institute_Setup/useGradingSchemes'

const normText = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const parseBool = (v: unknown) => ['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(String(v ?? '').trim().toLowerCase())
const boolText = (v: unknown) => (v ? 'Yes' : 'No')
const numOrNull = (v: unknown) => {
  const n = Number(v)
  return Number.isNaN(n) || String(v ?? '').trim() === '' ? null : n
}

interface ColDef {
  header: string
  key: string
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

const COLS: ColDef[] = [
  { header: 'Scheme Name', key: 'scheme_name', parse: normText },
  { header: 'Scheme Name (Bangla)', key: 'scheme_name_bn', parse: normText },
  { header: 'Grading Type', key: 'grading_type', parse: normText },
  { header: 'Class Level Ids (comma)', key: 'class_level_ids', fmt: (v: unknown) => (Array.isArray(v) ? v.join(', ') : ''), parse: (v: unknown) => String(v ?? '').split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)) },
  { header: 'Board', key: 'board_id', parse: normText },
  { header: 'Pass Marks', key: 'pass_marks', parse: numOrNull },
  { header: 'Grades (Name|BN|Point|Min|Max|Remarks ; …)', key: 'grades', fmt: gradesToText, parse: textToGrades },
  { header: 'Is Default (Yes/No)', key: 'is_default', fmt: boolText, parse: parseBool },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
]

function gradesToText(v: unknown): string {
  const rows = Array.isArray(v) ? (v as GradeRow[]) : []
  return rows
    .map((g) => [g.grade_name ?? '', g.grade_name_bn ?? '', g.grade_point ?? '', g.min_percent ?? '', g.max_percent ?? '', g.remarks ?? ''].join('|'))
    .join(' ; ')
}

function textToGrades(v: unknown): GradeRow[] {
  const s = String(v ?? '').trim()
  if (!s) return []
  return s.split(';').map((chunk) => {
    const p = chunk.split('|').map((x) => x.trim())
    return {
      grade_name: p[0] ?? '',
      grade_name_bn: p[1] ?? '',
      grade_point: p[2] ? Number(p[2]) : null,
      min_percent: p[3] ? Number(p[3]) : null,
      max_percent: p[4] ? Number(p[4]) : null,
      remarks: p[5] ?? '',
    }
  })
}

export function exportSchemesToExcel(schemes: GradingScheme[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of schemes) {
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
  XLSX.utils.book_append_sheet(book, ws, 'Grading Schemes')
  XLSX.writeFile(book, 'GradingSchemes.xlsx')
}

export async function importSchemesFromExcel(file: File): Promise<{ schemes: GradingScheme[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Grading Schemes'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const schemes: GradingScheme[] = []
  const skipped: string[] = []
  const empty: GradingScheme = {
    scheme_name: '', scheme_name_bn: '', grading_type: '', class_level_ids: [],
    board_id: '', pass_marks: null, grades: [], is_default: false, is_active: true,
  }

  for (const row of rows) {
    const name = String(row['Scheme Name'] ?? '').trim()
    if (!name) continue
    const scheme: GradingScheme = { ...empty }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(scheme as unknown as Record<string, unknown>)[col.key] = parsed
    }
    scheme.scheme_name = name
    schemes.push(scheme)
  }
  return { schemes, skipped }
}
