// Excel export/import for Admission Applications.
// Sheet "Applications": one row per application.

import * as XLSX from 'xlsx'
import { emptyApplication, type AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'

const normText = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
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
  { header: 'Application No', key: 'application_no', parse: normText },
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
  { header: 'Country of Residence', key: 'country', parse: normText },
  { header: 'Nationality', key: 'nationality', parse: normText },
  { header: 'Payment Status', key: 'payment_status', parse: normText },
  { header: 'Payment Method', key: 'payment_method', parse: normText },
  { header: 'Payment Transaction Id', key: 'payment_transaction_id', parse: normText },
  { header: 'Application Status', key: 'application_status', parse: normText },
  { header: 'Written Marks', key: 'written_marks', parse: numOrNull },
  { header: 'Viva Marks', key: 'viva_marks', parse: numOrNull },
  { header: 'Remarks / Review Notes', key: 'remarks', parse: normText },
]

export function exportApplicationsToExcel(apps: AdmissionApplication[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of apps) {
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
  XLSX.utils.book_append_sheet(book, ws, 'Applications')
  XLSX.writeFile(book, 'AdmissionApplications.xlsx')
}

export async function importApplicationsFromExcel(file: File): Promise<{ apps: AdmissionApplication[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Applications'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const apps: AdmissionApplication[] = []
  const skipped: string[] = []
  const empty: AdmissionApplication = emptyApplication()

  for (const row of rows) {
    const name = String(row['Candidate Name'] ?? '').trim()
    const appNo = String(row['Application No'] ?? '').trim()
    if (!name || !appNo) continue
    const app: AdmissionApplication = { ...empty }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(app as unknown as Record<string, unknown>)[col.key] = parsed
    }
    app.candidate_name = name
    app.application_no = appNo
    apps.push(app)
  }
  return { apps, skipped }
}
