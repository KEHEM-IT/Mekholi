import { ref } from 'vue'

// Institute Setup > Command Center > "Import from EMIS HTML". Companion to
// useInstituteSetupImport.ts (the Excel importer) - same shape, same
// dev-only save endpoint, different source format. Parses one or more
// saved EMIS (emis.gov.bd) "স্কুল ও কলেজ তথ্য" institute report pages
// (.html, saved from the browser as "Webpage, Complete") entirely
// client-side via DOMParser, into the JSON shape below, then hands it to
// the same /__institute-setup/import dev middleware used by the Excel
// import feature (see vite.config.ts) to be written under
// src/assets/school/.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmisMpoInfo {
  level: string | null
  mpo_issued_date: string | null
  mpo_code: string | null
}

export interface EmisRecognizedLevel {
  level: string | null
  first_recognition_date: string | null
  last_validity_date: string | null
}

export interface EmisBankAccount {
  bank: string | null
  branch: string | null
  account_type: string | null
  account_holder: string | null
  account_number: string | null
  account_purpose: string | null
}

export interface EmisHeadTeacherContact {
  name: string | null
  designation: string | null
  mobile: string | null
  email: string | null
}

export interface EmisCommitteeMember {
  name: string | null
  joining_date: string | null
  leaving_date: string | null
  phone: string | null
  trainings_count: string | null
  gender: string | null
  committee_position: string | null
  educational_qualification: string | null
  profession: string | null
  has_left_committee: string | null
  leaving_reason: string | null
}

export interface EmisCommitteeInfo {
  has_committee: string | null
  committee_type: string | null
  approval_date: string | null
  expiry_date: string | null
  election_date: string | null
  remarks: string | null
}

export interface EmisCommitteeMeeting {
  meeting_date: string | null
  attendees_count: string | null
  agenda: string | null
  decision: string | null
}

export interface EmisLegalCase {
  case_type: string | null
  court: string | null
  case_date: string | null
  case_number: string | null
  details: string | null
}

export interface EmisDepartedCommitteeMember {
  name: string | null
  gender: string | null
  phone: string | null
  leaving_reason: string | null
}

export interface EmisInstitute {
  institution_name_bn: string | null
  institution_name_en: string | null
  eiin: string | null
  mpo_code: string | null
  district: string | null
  upazila: string | null
  union: string | null
  post_office: string | null
  post_code: string | null
  village_or_road: string | null
