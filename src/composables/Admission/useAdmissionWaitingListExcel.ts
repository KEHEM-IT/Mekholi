// Excel export for compiled Admission Waiting List.
// Sheet "Waitlist Queue": ranked qualified waitlisted candidates.

import * as XLSX from 'xlsx'
import type { WaitlistedCandidate } from '@/composables/Admission/useAdmissionWaitingList'

interface ColDef {
  header: string
  key: string
}

const COLS: ColDef[] = [
  { header: 'Waitlist Position', key: 'waitlist_rank' },
  { header: 'Application No', key: 'application_no' },
  { header: 'Candidate Name', key: 'candidate_name' },
  { header: 'Candidate Name (Bangla)', key: 'candidate_name_bn' },
  { header: 'Guardian Name', key: 'guardian_name' },
  { header: 'Contact Phone', key: 'phone' },
  { header: 'Written Marks', key: 'written_marks' },
  { header: 'VIVA Marks', key: 'viva_marks' },
  { header: 'Total Score', key: 'total_marks' },
  { header: 'Current Status', key: 'application_status' },
]

export function exportWaitingListToExcel(
  className: string,
  waitlisted: WaitlistedCandidate[],
): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of waitlisted) {
    rows.push(
      COLS.map((c) => {
        const raw = (s as unknown as Record<string, unknown>)[c.key]
        return raw == null ? '' : (raw as string | number)
      }),
    )
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = COLS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }))

  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, ws, 'Waitlist Queue')
  
  XLSX.writeFile(book, `Admission_WaitingList_${className.replace(/\s+/g, '_')}.xlsx`)
}
