// Excel export/import for Admission Enquiries.
// Sheet "Enquiries": one row per enquiry.

import * as XLSX from 'xlsx'
import { emptyEnquiry, type AdmissionEnquiry } from '@/composables/Admission/useAdmissionEnquiries'

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
  { header: 'Candidate Name', key: 'candidate_name', parse: normText },
  { header: 'Candidate Name (Bangla)', key: 'candidate_name_bn', parse: normText },
  { header: 'Guardian Name', key: 'guardian_name', parse: normText },
  { header: 'Contact Phone', key: 'phone', parse: normText },
  { header: 'Email Address', key: 'email', parse: normText },
  { header: 'Academic Year Id', key: 'academic_year_id', parse: numOrNull },
  { header: 'Desired Class', key: 'desired_class', parse: normText },
  { header: 'Desired Version', key: 'version', parse: normText },
  { header: 'Desired Shift', key: 'shift', parse: normText },
  { header: 'Previous School', key: 'previous_school', parse: normText },
  { header: 'Nationality', key: 'nationality', parse: normText },
  { header: 'Country', key: 'country', parse: normText },
  { header: 'Enquiry Date', key: 'enquiry_date', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Enquiry Source', key: 'source', parse: normText },
  { header: 'Enquiry Status', key: 'status', parse: normText },
  { header: 'Remarks / Counseling Notes', key: 'remarks', parse: normText },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
]

export function exportEnquiriesToExcel(enquiries: AdmissionEnquiry[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of enquiries) {
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
  XLSX.utils.book_append_sheet(book, ws, 'Enquiries')
  XLSX.writeFile(book, 'AdmissionEnquiries.xlsx')
}

export async function importEnquiriesFromExcel(file: File): Promise<{ enquiries: AdmissionEnquiry[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Enquiries'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const enquiries: AdmissionEnquiry[] = []
  const skipped: string[] = []
  const empty: AdmissionEnquiry = emptyEnquiry()

  for (const row of rows) {
    const name = String(row['Candidate Name'] ?? '').trim()
    if (!name) continue
    const enquiry: AdmissionEnquiry = { ...empty }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(enquiry as unknown as Record<string, unknown>)[col.key] = parsed
    }
    enquiry.candidate_name = name
    enquiries.push(enquiry)
  }
  return { enquiries, skipped }
}
