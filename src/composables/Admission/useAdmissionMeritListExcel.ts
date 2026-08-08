// Excel export for compiled Admission Merit & Waiting Lists.
// Sheet "Merit Winners": ranked candidates inside available capacity.
// Sheet "Waitlisted Queue": remaining qualified candidates.

import * as XLSX from 'xlsx'
import type { RankedApplicant } from '@/composables/Admission/useAdmissionMeritList'

interface ColDef {
  header: string
  key: string
  fmt?: (v: unknown) => string | number
}

const COLS: ColDef[] = [
  { header: 'Merit Rank', key: 'rank' },
  { header: 'Application No', key: 'application_no' },
  { header: 'Candidate Name', key: 'candidate_name' },
  { header: 'Candidate Name (Bangla)', key: 'candidate_name_bn' },
  { header: 'Guardian Name', key: 'guardian_name' },
  { header: 'Contact Phone', key: 'phone' },
  { header: 'Written Marks', key: 'written_marks' },
  { header: 'VIVA Marks', key: 'viva_marks' },
  { header: 'Total Score', key: 'total_marks' },
  { header: 'Selection Status', key: 'application_status' },
]

export function exportMeritListToExcel(
  className: string,
  meritWinners: RankedApplicant[],
  waitlisted: RankedApplicant[],
): void {
  // 1. Build Winners Sheet
  const winnersRows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of meritWinners) {
    winnersRows.push(
      COLS.map((c) => {
        const raw = (s as unknown as Record<string, unknown>)[c.key]
        return raw == null ? '' : (raw as string | number)
      }),
    )
  }
  const wsWinners = XLSX.utils.aoa_to_sheet(winnersRows)
  wsWinners['!cols'] = COLS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }))

  // 2. Build Waitlist Sheet
  const waitlistRows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of waitlisted) {
    waitlistRows.push(
      COLS.map((c) => {
        const raw = (s as unknown as Record<string, unknown>)[c.key]
        return raw == null ? '' : (raw as string | number)
      }),
    )
  }
  const wsWaitlist = XLSX.utils.aoa_to_sheet(waitlistRows)
  wsWaitlist['!cols'] = COLS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }))

  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, wsWinners, 'Selected Merit List')
  XLSX.utils.book_append_sheet(book, wsWaitlist, 'Waitlisted Queue')
  
  XLSX.writeFile(book, `Admission_MeritList_${className.replace(/\s+/g, '_')}.xlsx`)
}
