// Admission Merit List helpers — compiles and ranks applicant scores
// in real-time from the central admission_applications database table.
import type { AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'

export interface RankedApplicant extends AdmissionApplication {
  total_marks: number
  rank: number
}

/**
 * Computes, ranks, and divides applicants into selected merit winners and waitlists.
 */
export function compileMeritList(
  className: string,
  allApplications: AdmissionApplication[],
  capacity: number = 40,
): { meritWinners: RankedApplicant[]; waitlistedQueue: RankedApplicant[] } {
  // 1. Filter applications matching selected class and whose exam marks are input
  const classApps = allApplications.filter(
    (a) => a.desired_class === className && a.payment_status === 'Paid',
  )

  // 2. Compute Total Score = Written + VIVA
  const ranked: RankedApplicant[] = classApps.map((a) => {
    const total = (a.written_marks || 0) + (a.viva_marks || 0)
    return {
      ...a,
      total_marks: total,
      rank: 0, // Resolved below
    }
  })

  // 3. Sort in descending order of Total Marks, then by application number as a tie-breaker
  ranked.sort((a, b) => {
    if (b.total_marks !== a.total_marks) {
      return b.total_marks - a.total_marks
    }
    return String(a.application_no).localeCompare(String(b.application_no))
  })

  // 4. Assign ranks (handling equal scores as consecutive ranks)
  for (let i = 0; i < ranked.length; i++) {
    ranked[i].rank = i + 1
  }

  // 5. Divide into Merit list and waitlisted queue based on class seat capacity
  const limit = Math.min(capacity, ranked.length)
  const meritWinners = ranked.slice(0, limit)
  const waitlistedQueue = ranked.slice(limit)

  return { meritWinners, waitlistedQueue }
}
