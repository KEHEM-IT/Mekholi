// Admission Waiting List helpers — compiles and ranks waitlisted candidates
// in real-time from the central admission_applications database table.
import type { AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'

export interface WaitlistedCandidate extends AdmissionApplication {
  total_marks: number
  waitlist_rank: number
}

/**
 * Filters, ranks, and returns all candidates currently in the waiting list for a class.
 */
export function compileWaitingList(
  className: string,
  allApplications: AdmissionApplication[],
): WaitlistedCandidate[] {
  // 1. Filter applications matching selected class, whose status is NOT Selected or Rejected,
  //    and who have paid their processing fee
  const waitlistApps = allApplications.filter(
    (a) =>
      a.desired_class === className &&
      a.payment_status === 'Paid' &&
      a.application_status !== 'Selected' &&
      a.application_status !== 'Rejected' &&
      a.application_status !== 'Archived',
  )

  // 2. Compute Total Score = Written + VIVA
  const ranked: WaitlistedCandidate[] = waitlistApps.map((a) => {
    const total = (a.written_marks || 0) + (a.viva_marks || 0)
    return {
      ...a,
      total_marks: total,
      waitlist_rank: 0,
    }
  })

  // 3. Sort in descending order of Total Marks, then by application number
  ranked.sort((a, b) => {
    if (b.total_marks !== a.total_marks) {
      return b.total_marks - a.total_marks
    }
    return String(a.application_no).localeCompare(String(b.application_no))
  })

  // 4. Assign waitlist ranks
  for (let i = 0; i < ranked.length; i++) {
    ranked[i].waitlist_rank = i + 1
  }

  return ranked
}
