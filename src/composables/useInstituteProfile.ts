// Shared reactive profile state — imported by both InstituteProfileView
// (edits the data) and Institute Dashboard Index (reads progress).
// Module-level reactive() means both pages share the same object;
// editing the profile page instantly updates dashboard bars.

import { computed, reactive } from 'vue'
import suhscJson from '@/assets/school/suhsc_generated.json'

// ---- typed interface so vue-tsc strict null checks pass ----------------

export type ProfileItem = Record<string, any>

export interface InstituteProfileType {
  institute_name_bn: string | null
  institute_name_en: string | null
  founder_name: string | null
  head_of_institute_name: string | null
  parliamentary_constituency: string | null
  establishment_date: string | null
  income_total: number | null
  expense_total: number | null
  student_fee_amount: number | null
  address: ProfileItem
  contact: ProfileItem
  classification: ProfileItem
  identifiers: ProfileItem
  mpo_status: ProfileItem
  location_details: ProfileItem
  recognition_history: ProfileItem[]
  mpo_info: ProfileItem[]
  bank_accounts: ProfileItem[]
  committee_members: ProfileItem[]
  staff_positions: ProfileItem[]
  staff_positions_total: ProfileItem
  former_committee_members: ProfileItem[]
  development_projects: ProfileItem[]
  committee_formation_history: ProfileItem[]
  committee_meetings: ProfileItem[]
  facilities: ProfileItem[]
  inspection_visits: ProfileItem[]
  income_sources: ProfileItem[]
  expense_sources: ProfileItem[]
  disasters: ProfileItem[]
  trainings: ProfileItem[]
  academic_result_tables: ProfileItem[]
  other_tables: ProfileItem[]
  institute_photos: ProfileItem[]
  institute_contacts: ProfileItem[]
}

const raw = (suhscJson as { school_data: ProfileItem[] }).school_data[0]

function cloneArr(key: string): ProfileItem[] {
  const arr = raw[key]
  if (!Array.isArray(arr)) return []
  return arr.map((item: unknown) => {
    if (item && typeof item === 'object') return { ...(item as ProfileItem) }
    return item
  }) as ProfileItem[]
}

// ---- single shared reactive profile ---------------------------------
export const instituteProfile = reactive<InstituteProfileType>({
  institute_name_bn:              raw.institute_name_bn as string | null,
  institute_name_en:              raw.institute_name_en as string | null,
  founder_name:                   raw.founder_name as string | null,
  head_of_institute_name:         raw.head_of_institute_name as string | null,
  parliamentary_constituency:     raw.parliamentary_constituency as string | null,
  establishment_date:             raw.establishment_date as string | null,
  income_total:                   raw.income_total as number | null,
  expense_total:                  raw.expense_total as number | null,
  student_fee_amount:             raw.student_fee_amount as number | null,
  address:                        { ...(raw.address as ProfileItem) },
  contact:                        { ...(raw.contact as ProfileItem) },
  classification:                 { ...(raw.classification as ProfileItem) },
  identifiers:                    { ...(raw.identifiers as ProfileItem) },
  mpo_status:                     { ...(raw.mpo_status as ProfileItem) },
  location_details:               { ...(raw.location_details as ProfileItem) },
  recognition_history:            cloneArr('recognition_history'),
  mpo_info:                       cloneArr('mpo_info'),
  bank_accounts:                  cloneArr('bank_accounts'),
  committee_members:              cloneArr('committee_members'),
  staff_positions:                cloneArr('staff_positions'),
  staff_positions_total:          { ...((raw.staff_positions_total ?? {}) as ProfileItem) },
  former_committee_members:       cloneArr('former_committee_members'),
  development_projects:           cloneArr('development_projects'),
  committee_formation_history:    cloneArr('committee_formation_history'),
  committee_meetings:             cloneArr('committee_meetings'),
  facilities:                     cloneArr('facilities'),
  inspection_visits:              cloneArr('inspection_visits'),
  income_sources:                 cloneArr('income_sources'),
  expense_sources:                cloneArr('expense_sources'),
  disasters:                      cloneArr('disasters'),
  trainings:                      cloneArr('trainings'),
  academic_result_tables:         cloneArr('academic_result_tables'),
  other_tables:                   cloneArr('other_tables'),
  institute_photos:               cloneArr('institute_photos'),
  institute_contacts:             cloneArr('institute_contacts'),
})

// ---- progress helpers --------------------------------------------------

const NEW_RECORDS: Record<string, ProfileItem> = {
  recognition_history:          { level: null, first_recognition_date: null, latest_recognition_expiry_date: null },
  mpo_info:                     { level: null, mpo_date: null, mpo_code: null },
  bank_accounts:                { serial_no: null, bank_name: null, branch: null, account_type: null, account_holder_name: null, account_number: null, account_purpose: null },
  committee_members:            { serial_no: null, member_name: null, joining_date: null, leaving_date: null, phone: null, trainings_received_count: null, gender: null, committee_position: null, education_qualification: null, occupation: null, left_committee: null, reason_for_leaving: null },
  staff_positions:              { serial_no: null, designation: null, currently_working_total: null, currently_working_male: null, currently_working_female: null, mpo_total: null, mpo_male: null, mpo_female: null, vacant_post: null, branch_post: null },
  former_committee_members:     { serial_no: null, member_name: null, gender: null, phone: null, reason_for_leaving: null },
  development_projects:         { serial_no: null, work_type: null, description: null, progress: null, start_date: null, duration_months: null, end_date: null, total_allocated_cost_taka: null, funding_source: null, project_name: null },
  committee_formation_history:  { serial_no: null, has_committee: null, committee_type: null, approval_date: null, expiry_date: null, election_date: null, remarks: null },
  committee_meetings:           { serial_no: null, meeting_date: null, attendees_count: null, agenda: null, decision: null },
  facilities:                   { serial_no: null, name: null, status: null },
  inspection_visits:            { serial_no: null, inspector_name: null, inspector_designation: null, visits_last_5_years: null, last_visit_date: null },
  income_sources:               { serial_no: null, source: null, amount: null },
  expense_sources:              { serial_no: null, source: null, amount: null },
  disasters:                    { serial_no: null, disaster_name: null, start_date: null, end_date: null, closed_days: null, damage_details: null, cause: null, remarks: null },
  trainings:                    { serial_no: null, training_subject: null },
  institute_photos:             { serial_no: null, photo_name: null },
  institute_contacts:           { serial_no: null, name: null, designation: null, mobile: null, email: null },
}

/** Add a new empty record to any array section on the profile. */
export function addProfileRecord(key: keyof InstituteProfileType) {
  const arr = instituteProfile[key]
  if (!Array.isArray(arr)) return
  const template = NEW_RECORDS[key] ?? {}
  arr.push({ ...template })
}

/** Remove a record at the given index from an array section. */
export function removeProfileRecord(key: keyof InstituteProfileType, index: number) {
  const arr = instituteProfile[key]
  if (!Array.isArray(arr)) return
  arr.splice(index, 1)
}

function countFilled(obj: any): number {
  if (obj === null || obj === undefined || obj === '') return 0
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.values(obj as ProfileItem).reduce((s, v) => s + countFilled(v), 0)
  }
  return 1
}

function countTotal(obj: any): number {
  if (obj === null || obj === undefined) return 1
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.values(obj as ProfileItem).reduce((s, v) => s + countTotal(v), 0)
  }
  return 1
}

export const profileProgress = computed(() => {
  const total = countTotal(instituteProfile)
  const filled = countFilled(instituteProfile)
  const empty = total - filled
  return { filled, empty, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0 }
})
