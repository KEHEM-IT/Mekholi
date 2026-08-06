// Excel export / import for the Institute Profile form.
//
// Export builds a 3-sheet workbook:
//   "Profile"           – one row per scalar field: [Field label, Value]
//   "Facilities"        – [Facility label, Status (Yes/No)]
//   "Committee Members" – one row per member (fixed header order)
//
// Import parses the same shape back into a partial form object that the
// page merges into its reactive form. Values are matched by the English
// field label (unique per field), so users can edit the Excel freely.
import * as XLSX from 'xlsx'
import {
  BD_GEO_DIVISIONS,
  BD_GEO_DISTRICTS,
  BD_GEO_UPAZILAS,
  BD_GEO_UNIONS,
} from '@/utils/bdGeo'
import { FACILITY_KEYS, FACILITY_LABELS } from '@/pages/Institute_Setup/facilityMeta'

// ── Field metadata ──────────────────────────────────────────────────────

type FieldType = 'text' | 'date' | 'number' | 'bool' | 'geo'

interface FieldMeta {
  key: string
  label: string
  labelBn: string
  type: FieldType
}

export const SCALAR_FIELDS: FieldMeta[] = [
  // Identity
  { key: 'institute_name_bn', label: 'Institute Name (Bangla)', labelBn: 'প্রতিষ্ঠানের নাম (বাংলা)', type: 'text' },
  { key: 'institute_name_en', label: 'Institute Name (English)', labelBn: 'প্রতিষ্ঠানের নাম (ইংরেজি)', type: 'text' },
  { key: 'institute_logo', label: 'Institute Logo URL', labelBn: 'প্রতিষ্ঠানের লোগো URL', type: 'text' },
  { key: 'founder_name', label: 'Founder Name', labelBn: 'প্রতিষ্ঠাতার নাম', type: 'text' },
  { key: 'establishment_date', label: 'Established Date', labelBn: 'প্রতিষ্ঠার তারিখ', type: 'date' },
  { key: 'parliamentary_constituency', label: 'Parliamentary Constituency', labelBn: 'সংসদীয় আসন', type: 'text' },
  // Address
  { key: 'division_id', label: 'Division', labelBn: 'বিভাগ', type: 'geo' },
  { key: 'district_id', label: 'District', labelBn: 'জেলা', type: 'geo' },
  { key: 'upazila_id', label: 'Upazila / Thana', labelBn: 'উপজেলা / থানা', type: 'geo' },
  { key: 'union_id', label: 'Union', labelBn: 'ইউনিয়ন', type: 'geo' },
  { key: 'village_road_holding_no', label: 'Village / Road / Holding', labelBn: 'গ্রাম / রোড / হোল্ডিং', type: 'text' },
  { key: 'post_office', label: 'Post Office', labelBn: 'ডাকঘর', type: 'text' },
  { key: 'post_code', label: 'Post Code', labelBn: 'পোস্ট কোড', type: 'number' },
  // Contact
  { key: 'institute_phone', label: 'Phone', labelBn: 'ফোন', type: 'text' },
  { key: 'institute_email', label: 'Email', labelBn: 'ইমেইল', type: 'text' },
  { key: 'website', label: 'Website', labelBn: 'ওয়েবসাইট', type: 'text' },
  // Classification
  { key: 'institute_type', label: 'Institute Type', labelBn: 'প্রতিষ্ঠানের ধরন', type: 'text' },
  { key: 'attached_technical_branch_type', label: 'Attached Tech. Branch', labelBn: 'সংযুক্ত কারিগরি শাখা', type: 'text' },
  { key: 'group', label: 'Group', labelBn: 'গ্রুপ', type: 'text' },
  { key: 'student_type', label: 'Student Type', labelBn: 'শিক্ষার্থীর ধরন', type: 'text' },
  { key: 'shift_count', label: 'Shift Count', labelBn: 'শিফট সংখ্যা', type: 'text' },
  { key: 'has_english_version', label: 'English Version (Yes/No)', labelBn: 'ইংরেজি ভার্সন (হ্যাঁ/না)', type: 'bool' },
  { key: 'management', label: 'Management', labelBn: 'ব্যবস্থাপনা', type: 'text' },
  // Identifiers
  { key: 'eiin', label: 'EIIN', labelBn: 'EIIN', type: 'text' },
  { key: 'board_institute_code', label: 'Board Institute Code', labelBn: 'বোর্ড ইনস্টিটিউট কোড', type: 'text' },
  { key: 'technical_board_code', label: 'Technical Board Code', labelBn: 'টেকনিক্যাল বোর্ড কোড', type: 'text' },
  { key: 'mpo_code', label: 'MPO Code', labelBn: 'এমপিও কোড', type: 'text' },
  { key: 'technical_branch_mpo_code', label: 'Technical Branch MPO Code', labelBn: 'কারিগরি শাখার এমপিও কোড', type: 'text' },
  { key: 'stipend_code', label: 'Stipend Code', labelBn: 'স্টাইপেন্ড কোড', type: 'text' },
  // MPO status
  { key: 'general_mpo', label: 'General MPO (Yes/No)', labelBn: 'সাধারণ এমপিও (হ্যাঁ/না)', type: 'bool' },
  { key: 'general_mpo_code', label: 'General MPO Code', labelBn: 'সাধারণ এমপিও কোড', type: 'text' },
  { key: 'tech_mpo', label: 'Technical MPO (Yes/No)', labelBn: 'টেকনিক্যাল এমপিও (হ্যাঁ/না)', type: 'bool' },
  { key: 'tech_mpo_code', label: 'Technical MPO Code', labelBn: 'টেকনিক্যাল এমপিও কোড', type: 'text' },
  { key: 'secondary_mpo_date', label: 'Secondary MPO Date', labelBn: 'মাধ্যমিক এমপিও তারিখ', type: 'date' },
  { key: 'secondary_mpo_code', label: 'Secondary MPO Code', labelBn: 'মাধ্যমিক এমপিও কোড', type: 'text' },
  { key: 'higher_secondary_mpo_date', label: 'Higher Secondary MPO Date', labelBn: 'উচ্চ মাধ্যমিক এমপিও তারিখ', type: 'date' },
  { key: 'higher_secondary_mpo_code', label: 'Higher Secondary MPO Code', labelBn: 'উচ্চ মাধ্যমিক এমপিও কোড', type: 'text' },
  // Staff
  { key: 'staff_male', label: 'Currently Working (Male)', labelBn: 'বর্তমানে কর্মরত (পুরুষ)', type: 'number' },
  { key: 'staff_female', label: 'Currently Working (Female)', labelBn: 'বর্তমানে কর্মরত (মহিলা)', type: 'number' },
  { key: 'staff_mpo_male', label: 'Staff MPO (Male)', labelBn: 'এমপিওভুক্ত কর্মচারী (পুরুষ)', type: 'number' },
  { key: 'staff_mpo_female', label: 'Staff MPO (Female)', labelBn: 'এমপিওভুক্ত কর্মচারী (মহিলা)', type: 'number' },
  { key: 'staff_nonmpo_male', label: 'Staff Non-MPO (Male)', labelBn: 'অ-এমপিওভুক্ত কর্মচারী (পুরুষ)', type: 'number' },
  { key: 'staff_nonmpo_female', label: 'Staff Non-MPO (Female)', labelBn: 'অ-এমপিওভুক্ত কর্মচারী (মহিলা)', type: 'number' },
  // Bank
  { key: 'bank_name', label: 'Bank Name', labelBn: 'ব্যাংকের নাম', type: 'text' },
  { key: 'bank_branch', label: 'Bank Branch', labelBn: 'ব্যাংক শাখা', type: 'text' },
  { key: 'bank_account_type', label: 'Account Type', labelBn: 'হিসাবের ধরন', type: 'text' },
  { key: 'bank_account_holder', label: 'Account Holder', labelBn: 'হিসাবের মালিক', type: 'text' },
  { key: 'bank_account_number', label: 'Account Number', labelBn: 'হিসাব নম্বর', type: 'text' },
  { key: 'bank_account_purpose', label: 'Account Purpose', labelBn: 'হিসাবের উদ্দেশ্য', type: 'text' },
]

export const COMMITTEE_HEADERS = [
  'Member Name',
  'Joining Date',
  'Phone',
  'Gender',
  'Committee Position',
  'Education Qualification',
  'Occupation',
  'Left Committee (Yes/No)',
  'Reason for Leaving',
]

// ── value helpers ───────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Normalize any Excel cell to an ISO date string ('' when invalid). */
export function toIsoDate(v: unknown): string {
  if (v == null || v === '') return ''
  if (v instanceof Date && !Number.isNaN(v.getTime())) return isoFromDate(v)
  const s = String(v).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return isoFromDate(d)
  return ''
}

/** Parse a Yes/No style cell into a boolean. */
export function parseBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase()
  if (['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(s)) return true
  return false
}

function parseNumber(v: unknown): number | null {
  if (v == null || String(v).trim() === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// ── geo resolution ──────────────────────────────────────────────────────

interface GeoRow {
  id: string
  name: string
  bn_name: string
  LookupText: string
}

const GEO_LISTS: Record<string, GeoRow[]> = {
  division_id: BD_GEO_DIVISIONS as unknown as GeoRow[],
  district_id: BD_GEO_DISTRICTS as unknown as GeoRow[],
  upazila_id: BD_GEO_UPAZILAS as unknown as GeoRow[],
  union_id: BD_GEO_UNIONS as unknown as GeoRow[],
}

/** Accepts an id ("5"), a name ("Sylhet"), a Bangla name (সিলেট) or the
 *  full LookupText ("Sylhet - সিলেট") and returns the numeric id. */
function resolveGeoId(key: string, v: unknown): string {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (/^\d+$/.test(s)) return s
  const list = GEO_LISTS[key]
  if (!list) return s
  const hit = list.find(
    (g) => g.LookupText === s || g.name === s || g.bn_name === s || g.name.toLowerCase() === s.toLowerCase(),
  )
  return hit ? String(hit.id) : s
}

/** For export: show the geo name instead of the raw id when resolvable. */
function geoDisplay(key: string, id: unknown): string {
  const s = String(id ?? '')
  if (!s) return ''
  const list = GEO_LISTS[key]
  const hit = list?.find((g) => String(g.id) === s)
  return hit ? hit.LookupText : s
}

// ── export ──────────────────────────────────────────────────────────────

export interface ExportableProfile {
  [key: string]: unknown
  facilities?: Record<string, boolean>
  committee_members?: Array<Record<string, unknown>>
}

/** Build and download the Institute Profile Excel workbook. */
export function exportProfileToExcel(form: ExportableProfile): void {
  const rows: (string | number)[][] = [['Field', 'Value']]
  for (const f of SCALAR_FIELDS) {
    const raw = form[f.key]
    let value: string | number = ''
    if (raw !== undefined && raw !== null && raw !== '') {
      if (f.type === 'date') value = toIsoDate(raw)
      else if (f.type === 'number') value = Number(raw)
      else if (f.type === 'bool') value = raw ? 'Yes' : 'No'
      else if (f.type === 'geo') value = geoDisplay(f.key, raw)
      else value = String(raw)
    }
    rows.push([f.label, value])
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 34 }, { wch: 44 }]

  // Facilities sheet
  const facRows: (string | number)[][] = [['Facility', 'Status']]
  for (const key of FACILITY_KEYS) {
    const label = FACILITY_LABELS[key]?.en ?? key
    const on = Boolean((form.facilities ?? {})[key])
    facRows.push([label, on ? 'Yes' : 'No'])
  }
  const wsFac = XLSX.utils.aoa_to_sheet(facRows)
  wsFac['!cols'] = [{ wch: 24 }, { wch: 12 }]

  // Committee sheet
  const cmRows: (string | number)[][] = [COMMITTEE_HEADERS]
  for (const m of form.committee_members ?? []) {
    cmRows.push([
      String(m.member_name ?? ''),
      toIsoDate(m.joining_date),
      String(m.phone ?? ''),
      String(m.gender ?? ''),
      String(m.committee_position ?? ''),
      String(m.education_qualification ?? ''),
      String(m.occupation ?? ''),
      m.left_committee ? 'Yes' : 'No',
      String(m.reason_for_leaving ?? ''),
    ])
  }
  const wsCm = XLSX.utils.aoa_to_sheet(cmRows)
  wsCm['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 22 }]

  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, ws, 'Profile')
  XLSX.utils.book_append_sheet(book, wsFac, 'Facilities')
  XLSX.utils.book_append_sheet(book, wsCm, 'Committee Members')

  const eiin = String(form.eiin || 'institute')
  XLSX.writeFile(book, `InstituteProfile_${eiin}.xlsx`)
}

// ── import ──────────────────────────────────────────────────────────────

export interface ImportedProfile {
  profile: Record<string, unknown>
  facilities: Record<string, boolean>
  committee_members: Array<Record<string, unknown>>
  skipped: string[]
}

/** Parse an Institute Profile Excel file into a partial form. */
export async function importProfileFromExcel(file: File): Promise<ImportedProfile> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const profileSheet = book.Sheets['Profile'] ?? book.Sheets[book.SheetNames[0]]
  if (!profileSheet) throw new Error('No sheet found in the Excel file')

  const profile: Record<string, unknown> = {}
  const skipped: string[] = []
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(profileSheet, { defval: '' })

  for (const row of rows) {
    const label = String(row['Field'] ?? '').trim()
    const value = row['Value']
    if (!label || value === '') continue
    const meta = SCALAR_FIELDS.find((f) => f.label === label || f.key === label)
    if (!meta) {
      skipped.push(label)
      continue
    }
    if (meta.type === 'date') profile[meta.key] = toIsoDate(value)
    else if (meta.type === 'number') profile[meta.key] = parseNumber(value)
    else if (meta.type === 'bool') profile[meta.key] = parseBool(value)
    else if (meta.type === 'geo') profile[meta.key] = resolveGeoId(meta.key, value)
    else profile[meta.key] = String(value).trim()
  }

  // Facilities sheet
  const facilities: Record<string, boolean> = {}
  const facSheet = book.Sheets['Facilities']
  if (facSheet) {
    const facRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(facSheet, { defval: '' })
    for (const row of facRows) {
      const label = String(row['Facility'] ?? '').trim()
      if (!label) continue
      const entry = Object.entries(FACILITY_LABELS).find(([, v]) => v.en === label || v.bn === label)
      const key = entry ? entry[0] : FACILITY_KEYS.find((k) => k.replace(/_/g, ' ') === label.toLowerCase())
      if (key) facilities[key] = parseBool(row['Status'])
    }
  }

  // Committee sheet
  const committee: Array<Record<string, unknown>> = []
  const cmSheet = book.Sheets['Committee Members']
  if (cmSheet) {
    const cmRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(cmSheet, { defval: '' })
    for (const row of cmRows) {
      const name = String(row['Member Name'] ?? '').trim()
      if (!name) continue
      committee.push({
        member_name: name,
        joining_date: toIsoDate(row['Joining Date']),
        phone: String(row['Phone'] ?? '').trim(),
        gender: String(row['Gender'] ?? '').trim(),
        committee_position: String(row['Committee Position'] ?? '').trim(),
        education_qualification: String(row['Education Qualification'] ?? '').trim(),
        occupation: String(row['Occupation'] ?? '').trim(),
        left_committee: parseBool(row['Left Committee (Yes/No)']),
        reason_for_leaving: String(row['Reason for Leaving'] ?? '').trim(),
      })
    }
  }

  return { profile, facilities, committee_members: committee, skipped }
}
