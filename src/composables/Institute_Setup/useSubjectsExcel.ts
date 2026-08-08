// Excel export/import for Subjects & Curriculum.
// Sheet "Subjects": one row per subject. Marks distribution serialized as
//   "ClassId|Theory|Practical|CA|Pass|Periods|Books ; …"

import * as XLSX from 'xlsx'
import { emptySubject, type MarksRow, type Subject } from '@/composables/Institute_Setup/useSubjects'

const normText = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const parseBool = (v: unknown) => ['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(String(v ?? '').trim().toLowerCase())
const boolText = (v: unknown) => (v ? 'Yes' : 'No')
const numOrNull = (v: unknown) => {
  const n = Number(v)
  return Number.isNaN(n) || String(v ?? '').trim() === '' ? null : n
}

function marksToText(v: unknown): string {
  const rows = Array.isArray(v) ? (v as MarksRow[]) : []
  return rows
    .map((m) => [m.class_id ?? '', m.full_marks_theory ?? '', m.full_marks_practical ?? '', m.full_marks_ca ?? '', m.pass_marks ?? '', m.periods_week ?? '', m.book_names ?? ''].join('|'))
    .join(' ; ')
}

function textToMarks(v: unknown): MarksRow[] {
  const s = String(v ?? '').trim()
  if (!s) return []
  return s.split(';').map((chunk) => {
    const p = chunk.split('|').map((x) => x.trim())
    const n = (x: string) => (x === '' ? null : Number(x))
    return {
      class_id: n(p[0]),
      full_marks_theory: n(p[1]),
      full_marks_practical: n(p[2]),
      full_marks_ca: n(p[3]),
      pass_marks: n(p[4]),
      periods_week: n(p[5]),
      book_names: p[6] ?? '',
    }
  })
}

interface ColDef {
  header: string
  key: string
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

const COLS: ColDef[] = [
  { header: 'Subject Name', key: 'subject_name', parse: normText },
  { header: 'Subject Code', key: 'subject_code', parse: normText },
  { header: 'Subject Type', key: 'subject_type', parse: normText },
  { header: 'Board Id', key: 'board_id', parse: numOrNull },
  { header: 'Group Id (0 = All)', key: 'group_id', parse: numOrNull },
  { header: 'Version', key: 'version', parse: normText },
  { header: 'Class Level Ids (comma)', key: 'class_level_ids', fmt: (v: unknown) => (Array.isArray(v) ? v.join(', ') : ''), parse: (v: unknown) => String(v ?? '').split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)) },
  { header: 'Marks (ClassId|Theory|Practical|CA|Pass|Periods|Books ; …)', key: 'marks_distribution', fmt: marksToText, parse: textToMarks },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
]

export function exportSubjectsToExcel(subjects: Subject[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of subjects) {
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
  XLSX.utils.book_append_sheet(book, ws, 'Subjects')
  XLSX.writeFile(book, 'Subjects.xlsx')
}

export async function importSubjectsFromExcel(file: File): Promise<{ subjects: Subject[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Subjects'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const subjects: Subject[] = []
  const skipped: string[] = []
  const empty: Subject = emptySubject()

  for (const row of rows) {
    const name = String(row['Subject Name'] ?? '').trim()
    if (!name) continue
    const subject: Subject = { ...empty }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(subject as unknown as Record<string, unknown>)[col.key] = parsed
    }
    subject.subject_name = name
    subject.is_builtin = false
    subjects.push(subject)
  }
  return { subjects, skipped }
}
