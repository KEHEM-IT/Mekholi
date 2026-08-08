// Excel export/import for Board & Regulatory Setup.
// Sheet "Boards": one row per board. The regulatory block is serialized as
//   "RecognitionNo|RecognitionDate|RegistrationNo|MPONo|Document"
// and institute-type ids as a comma list.

import * as XLSX from 'xlsx'
import { emptyBoard, type Board, type BoardRegulatory } from '@/composables/Institute_Setup/useBoards'

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

interface ColDef {
  header: string
  key: string
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

const COLS: ColDef[] = [
  { header: 'Board Name', key: 'board_name', parse: normText },
  { header: 'Board Name (Bangla)', key: 'board_name_bn', parse: normText },
  { header: 'Board Code', key: 'board_code', parse: normText },
  { header: 'Board Type', key: 'board_type', parse: normText },
  { header: 'Institute Type Ids (comma)', key: 'institute_type_ids', fmt: (v: unknown) => (Array.isArray(v) ? v.join(', ') : ''), parse: (v: unknown) => String(v ?? '').split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)) },
  { header: 'Website', key: 'website', parse: normText },
  { header: 'Contact', key: 'contact', parse: normText },
  { header: 'Address', key: 'address', parse: normText },
  { header: 'Remarks', key: 'remarks', parse: normText },
  { header: 'Recognition No', key: 'recognition_no', parse: normText },
  { header: 'Recognition Date', key: 'recognition_date', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Registration No', key: 'registration_no', parse: normText },
  { header: 'MPO No', key: 'mpo_no', parse: normText },
  { header: 'Document (URL)', key: 'document', parse: normText },
  { header: 'Built-in (Yes/No)', key: 'is_builtin', fmt: boolText },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
]

/** Flatten regulatory keys into the row (empty string → ''). */
function rowOf(board: Board): (string | number)[] {
  const reg = board.regulatory ?? ({} as BoardRegulatory)
  return COLS.map((c) => {
    const raw = c.key === 'recognition_no' || c.key === 'recognition_date' || c.key === 'registration_no' || c.key === 'mpo_no' || c.key === 'document'
      ? (reg as unknown as Record<string, unknown>)[c.key]
      : (board as unknown as Record<string, unknown>)[c.key]
    const v = raw == null ? '' : raw
    return c.fmt ? c.fmt(v) : (v as string | number)
  })
}

export function exportBoardsToExcel(boards: Board[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const b of boards) rows.push(rowOf(b))
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = COLS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, ws, 'Boards')
  XLSX.writeFile(book, 'Boards.xlsx')
}

export async function importBoardsFromExcel(file: File): Promise<{ boards: Board[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Boards'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const boards: Board[] = []
  const skipped: string[] = []
  const empty: Board = emptyBoard()

  for (const row of rows) {
    const name = String(row['Board Name'] ?? '').trim()
    if (!name) continue
    const board: Board = { ...empty, regulatory: { ...emptyBoard().regulatory } }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      if (col.key === 'recognition_no' || col.key === 'recognition_date' || col.key === 'registration_no' || col.key === 'mpo_no' || col.key === 'document') {
        board.regulatory[col.key as keyof BoardRegulatory] = parsed as string
      } else {
        ;(board as unknown as Record<string, unknown>)[col.key] = parsed
      }
    }
    board.board_name = name
    // Imported rows are always user boards — the built-in registry is
    // seeded from the backend only, never via Excel.
    board.is_builtin = false
    boards.push(board)
  }
  return { boards, skipped }
}
