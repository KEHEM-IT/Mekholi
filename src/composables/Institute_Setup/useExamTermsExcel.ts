// Excel export/import for Exam Terms & Types.
// Sheet "Exam Terms": one row per exam term.

import * as XLSX from 'xlsx'
import { emptyExamTerm, type ExamTerm } from '@/composables/Institute_Setup/useExamTerms'

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
  { header: 'Exam Name', key: 'exam_name', parse: normText },
  { header: 'Exam Name (Bangla)', key: 'exam_name_bn', parse: normText },
  { header: 'Exam Type', key: 'exam_type', parse: normText },
  { header: 'Board Id', key: 'board_id', parse: numOrNull },
  { header: 'Term Id', key: 'term_id', parse: numOrNull },
  { header: 'Class Ids (comma)', key: 'class_ids', fmt: (v: unknown) => (Array.isArray(v) ? v.join(', ') : ''), parse: (v: unknown) => String(v ?? '').split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)) },
  { header: 'Grading Scheme Id', key: 'scheme_id', parse: numOrNull },
  { header: 'Start Date', key: 'exam_start', fmt: toIsoDate, parse: toIsoDate },
  { header: 'End Date', key: 'exam_end', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Publish to Parents (Yes/No)', key: 'publish_to_portal', fmt: boolText, parse: parseBool },
  { header: 'Is Board Exam (Yes/No)', key: 'is_board_exam', fmt: boolText, parse: parseBool },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
]

export function exportExamTermsToExcel(exams: ExamTerm[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const e of exams) {
    rows.push(
      COLS.map((c) => {
        const raw = (e as unknown as Record<string, unknown>)[c.key]
        const v = raw == null ? '' : raw
        return c.fmt ? c.fmt(v) : (v as string | number)
      }),
    )
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = COLS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, ws, 'Exam Terms')
  XLSX.writeFile(book, 'ExamTerms.xlsx')
}

export async function importExamTermsFromExcel(file: File): Promise<{ exams: ExamTerm[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Exam Terms'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const exams: ExamTerm[] = []
  const skipped: string[] = []
  const empty: ExamTerm = emptyExamTerm()

  for (const row of rows) {
    const name = String(row['Exam Name'] ?? '').trim()
    if (!name) continue
    const exam: ExamTerm = { ...empty }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(exam as unknown as Record<string, unknown>)[col.key] = parsed
    }
    exam.exam_name = name
    exam.is_builtin = false
    exams.push(exam)
  }
  return { exams, skipped }
}
