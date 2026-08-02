// Shared reactive profile state — imported by both InstituteProfileView
// (edits the data) and Institute Dashboard Index (reads progress).
// Module-level reactive() means both pages share the same object;
// editing the profile page instantly updates dashboard bars.

import { computed, reactive } from 'vue'
import suhscJson from '@/assets/school/suhsc_generated.json'

type R = Record<string, unknown>
const raw = (suhscJson as { school_data: R[] }).school_data[0]!

function cloneArr(key: string): unknown[] {
  const arr = raw[key]
  if (!Array.isArray(arr)) return []
  return arr.map((item: unknown) => {
    if (item && typeof item === 'object') return { ...(item as R) }
    return item
  })
}

// ---- single shared reactive profile ---------------------------------
export const instituteProfile = reactive({
  institute_name_bn:              raw.institute_name_bn as string | null,
  institute_name_en:              raw.institute_name_en as string | null,
  founder_name:                   raw.founder_name as string | null,
  head_of_institute_name:         raw.head_of_institute_name as string | null,
  parliamentary_constituency:     raw.parliamentary_constituency as string | null,
  establishment_date:             raw.establishment_date as string | null,
  income_total:                   raw.income_total as number | null,
  expense_total:                  raw.expense_total as number | null,
  student_fee_amount:             raw.student_fee_amount as number | null,
  address:                        { ...(raw.address as R) },
  contact:                        { ...(raw.contact as R) },
  classification:                 { ...(raw.classification as R) },
  identifiers:                    { ...(raw.identifiers as R) },
  mpo_status:                     { ...(raw.mpo_status as R) },
  location_details:               { ...(raw.location_details as R) },
  recognition_history:            cloneArr('recognition_history') as R[],
  mpo_info:                       cloneArr('mpo_info') as R[],
  bank_accounts:                  cloneArr('bank_accounts') as R[],
  committee_members:              cloneArr('committee_members') as R[],
  staff_positions:                cloneArr('staff_positions') as R[],
  staff_positions_total:          { ...((raw.staff_positions_total ?? {}) as R) },
  former_committee_members:       cloneArr('former_committee_members') as R[],
  development_projects:           cloneArr('development_projects') as R[],
  committee_formation_history:    cloneArr('committee_formation_history') as R[],
  committee_meetings:             cloneArr('committee_meetings') as R[],
  facilities:                     cloneArr('facilities') as R[],
  inspection_visits:              cloneArr('inspection_visits') as R[],
  income_sources:                 cloneArr('income_sources') as R[],
  expense_sources:                cloneArr('expense_sources') as R[],
  disasters:                      cloneArr('disasters') as R[],
  trainings:                      cloneArr('trainings') as R[],
  academic_result_tables:         cloneArr('academic_result_tables') as R[],
  other_tables:                   cloneArr('other_tables') as R[],
  institute_photos:               cloneArr('institute_photos') as R[],
  institute_contacts:             cloneArr('institute_contacts') as R[],
})

// ---- progress helpers --------------------------------------------------

function countFilled(obj: unknown): number {
  if (obj === null || obj === undefined || obj === '') return 0
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.values(obj as R).reduce((s, v) => s + countFilled(v), 0)
  }
  return 1
}

function countTotal(obj: unknown): number {
  if (obj === null || obj === undefined) return 1
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.values(obj as R).reduce((s, v) => s + countTotal(v), 0)
  }
  return 1
}

export const profileProgress = computed(() => {
  const total = countTotal(instituteProfile)
  const filled = countFilled(instituteProfile)
  const empty = total - filled
  return { filled, empty, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0 }
})
