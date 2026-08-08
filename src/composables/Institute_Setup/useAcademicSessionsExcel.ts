// Excel export/import for Academic Sessions & Terms.
// Sheet "Sessions": one row per session term.

import * as XLSX from 'xlsx'
import { emptySession, type AcademicSessionTerm } from '@/composables/Institute_Setup/useAcademicSessions'

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
  { header: 'Session Name', key: 'session_name', parse: normText },
  { header: 'Session Name (Bangla)', key: 'session_name_bn', parse: normText },
  { header: 'Academic Year Id', key: 'academic_year_id', parse: numOrNull },
  { header: 'Term Name', key: 'term_name', parse: normText },
  { header: 'Term Name (Bangla)', key: 'term_name_bn', parse: normText },
  { header: 'Term Order', key: 'term_order', parse: numOrNull },
  { header: 'Start Date', key: 'term_start', fmt: toIsoDate, parse: toIsoDate },
  { header: 'End Date', key: 'term_end', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Is Current (Yes/No)', key: 'is_current', fmt: boolText, parse: parseBool },
  { header: 'Result Type', key: 'result_type', parse: normText },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
]

export function exportSessionsToExcel(sessions: AcademicSessionTerm[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of sessions) {
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
  XLSX.utils.book_append_sheet(book, ws, 'Sessions')
  XLSX.writeFile(book, 'AcademicSessions.xlsx')
}

export async function importSessionsFromExcel(file: File): Promise<{ sessions: AcademicSessionTerm[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Sessions'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const sessions: AcademicSessionTerm[] = []
  const skipped: string[] = []
  const empty: AcademicSessionTerm = emptySession()

  for (const row of rows) {
    const name = String(row['Session Name'] ?? '').trim()
    if (!name) continue
    const session: AcademicSessionTerm = { ...empty }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(session as unknown as Record<string, unknown>)[col.key] = parsed
    }
    session.session_name = name
    sessions.push(session)
  }
  return { sessions, skipped }
}
