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
  mouza_name: string | null
  plot_number: string | null
  region: string | null
  parliamentary_seat: string | null
  institution_phone: string | null
  head_mobile: string | null
  founder: string | null
  head_teacher_name: string | null
  email: string | null
  website: string | null
  fax: string | null
  establishment_date: string | null
  institution_type: string | null
  attached_technical_branch: string | null
  group: string | null
  coeducation_type: string | null
  shift_count: string | null
  has_english_version: string | null
  management: string | null
  recognition_status: string | null
  recognized_level: string | null
  is_mpo_enlisted: string | null
  technical_branch_mpo_enlisted: string | null
  nationalization_date: string | null
  nearest_admin_unit: string | null
  nearest_admin_unit_distance_km: string | null
  area_type: string | null
  geographic_location: string | null
  is_enclave: string | null
  geo_code: string | null
  board_code: string | null
  technical_board_code: string | null
  technical_branch_mpo_code: string | null
  stipend_code: string | null
  mpo_info: EmisMpoInfo[]
  recognized_levels: EmisRecognizedLevel[]
  bank_accounts: EmisBankAccount[]
  head_teacher_contact: EmisHeadTeacherContact[]
  committee_info: EmisCommitteeInfo[]
  committee_members: EmisCommitteeMember[]
  committee_meetings: EmisCommitteeMeeting[]
  departed_committee_members: EmisDepartedCommitteeMember[]
  legal_cases: EmisLegalCase[]
  sourceFileName: string
}

export interface EmisImportResult {
  sourceFileNames: string[]
  importedAt: string
  institutes: EmisInstitute[]
}

export interface RecentEmisImport {
  name: string
  savedAt: string
  size: number
}

// ---------------------------------------------------------------------------
// Label -> English key maps. The Bengali labels are fixed by the govt
// template, so this mapping is stable across every institute's saved
// report regardless of which institute it is.
// ---------------------------------------------------------------------------

// Flat "label cell -> value cell" tables (basic info, address, MPO status).
const FLAT_LABEL_MAP: Record<string, keyof EmisInstitute> = {
  'জিইও কোড (বিবিএস)': 'geo_code',
  'শিক্ষা বোর্ড কর্তৃক প্রতিষ্ঠানের কোড': 'board_code',
  'কারিগরি শিক্ষা বোর্ড কর্তৃক কোড': 'technical_board_code',
  ইআইআইএন: 'eiin',
  'এমপিও কোড': 'mpo_code',
  'কারিগরি শাখার এমপিও কোড': 'technical_branch_mpo_code',
  'উপবৃত্তি কোড': 'stipend_code',

  'প্রতিষ্ঠানের নাম (বাংলায়)': 'institution_name_bn',
  'ইংরেজীতে নাম (ব্লক লেটার)': 'institution_name_en',
  'গ্রাম/হোল্ডি নম্বর/রোড': 'village_or_road',
  ইউনিয়ন: 'union',
  'মূলভবনের মৌজার নাম': 'mouza_name',
  'মূল ভবনের দাগ নম্বর': 'plot_number',
  ডাকঘর: 'post_office',
  'পোস্ট কোড': 'post_code',
  'উপজেলা/থানা': 'upazila',
  জেলা: 'district',
  অঞ্চল: 'region',
  'প্রতিষ্ঠানের ফোন': 'institution_phone',
  'মোবাইল (প্রতিষ্ঠান প্রধান)': 'head_mobile',
  প্রতিষ্ঠাতা: 'founder',
  'প্রতিষ্ঠান প্রধানের নাম': 'head_teacher_name',
  ফ্যাক্স: 'fax',
  'সংসদীয় আসন (নির্বাচনক্ষেত্র)': 'parliamentary_seat',
  'প্রতিষ্ঠানের ই-মেইল': 'email',
  'ওয়েব এড্রেস': 'website',

  'প্রতিষ্ঠার তারিখ': 'establishment_date',
  'প্রতিষ্ঠানের প্রকার': 'institution_type',
  'সংযুক্ত কারিগরি শাখার ধরন': 'attached_technical_branch',
  গ্রুপ: 'group',
  'কাদের জন্য': 'coeducation_type',
  'শিফট সংখ্যা': 'shift_count',
  'ইংরেজি ভার্সন আছে কিনা ?': 'has_english_version',
  ব্যবস্থাপনা: 'management',
  'স্বীকৃতি/অনুমোদিত': 'recognition_status',
  'স্বীকৃতিপ্রাপ্ত স্তর': 'recognized_level',

  'প্রতিষ্ঠানটি কি এমপিওভুক্ত': 'is_mpo_enlisted',
  'কারিগরি শাখা এমপিওভুক্ত?': 'technical_branch_mpo_enlisted',

  'প্রতিষ্ঠানটি সরকারিকরণের তারিখ (প্রযোজ্য ক্ষেত্রে)': 'nationalization_date',
  'নিকটবর্তী প্রশাসনিক ইউনিট': 'nearest_admin_unit',
  'নিকটবর্তী প্রশাসনিক ইউনিটের দূরত্ব(কিঃমিঃ)': 'nearest_admin_unit_distance_km',
  'প্রতিষ্ঠানটি কোন এলাকায়': 'area_type',
  'প্রতিষ্ঠানটির ভৌগোলিক অবস্থান': 'geographic_location',
  'প্রতিষ্ঠান ছিটমহলের অন্তর্ভুক্ত কিনা?': 'is_enclave',
}

// Columnar (thead/tbody) tables -> which array field + column header map.
// 'serial' marks the running-number column, which is dropped.
type ColumnMap = Record<string, string>

interface ArrayTableSpec {
  field: keyof EmisInstitute
  columns: ColumnMap
}

const ARRAY_TABLE_SPECS: ArrayTableSpec[] = [
  {
    field: 'recognized_levels',
    columns: {
      'স্বীকৃতিপ্রাপ্ত স্তর': 'level',
      'প্রথম স্বীকৃতির তারিখ': 'first_recognition_date',
      'স্বীকৃতির (সর্বশেষ) মেয়াদ শেষ হওয়ার তারিখ': 'last_validity_date',
    },
  },
  {
    field: 'mpo_info',
    columns: {
      স্তর: 'level',
      'এমপিওভুক্তির তারিখ': 'mpo_issued_date',
      'এমপিও কোড': 'mpo_code',
    },
  },
  {
    field: 'legal_cases',
    columns: {
      'ক্রমিক নম্বর': 'serial',
      'মামলার ধরন': 'case_type',
      আদালত: 'court',
      'মামলার তারিখ': 'case_date',
      'মামলা নম্বর': 'case_number',
      বিবরণ: 'details',
    },
  },
  {
    field: 'bank_accounts',
    columns: {
      'ক্রমিক নম্বর': 'serial',
      ব্যাংক: 'bank',
      শাখা: 'branch',
      'হিসাবের ধরন': 'account_type',
      'একাউন্ট হোল্ডারের নাম': 'account_holder',
      'হিসাব নম্বর': 'account_number',
      'হিসাবের উদ্দেশ্য': 'account_purpose',
    },
  },
  {
    field: 'head_teacher_contact',
    columns: {
      'ক্রমিক নম্বর': 'serial',
      নাম: 'name',
      পদবি: 'designation',
      'মোবাইল নম্বর': 'mobile',
      'ই-মেইল': 'email',
    },
  },
  {
    field: 'committee_info',
    columns: {
      'ক্রমিক নম্বর': 'serial',
      'কমিটি আছে কি না': 'has_committee',
      'কমিটির প্রকার': 'committee_type',
      'অনুমোদন তারিখ': 'approval_date',
      'মেয়াদ শেষের তারিখ': 'expiry_date',
      'নির্বাচনের তারিখ': 'election_date',
      মন্তব্য: 'remarks',
    },
  },
  {
    field: 'committee_members',
    columns: {
      'ক্রমিক নম্বর': 'serial',
      'সদস্যের নাম (ইংরেজি বড় হাতের অক্ষরে)': 'name',
      'যোগদানের তারিখ': 'joining_date',
      'প্রস্থানের তারিখ': 'leaving_date',
      ফোন: 'phone',
      'প্রাপ্ত প্রশিক্ষণের সংখ্যা': 'trainings_count',
      লিঙ্গ: 'gender',
      'কমিটিতে অবস্থান': 'committee_position',
      'শিক্ষাগত যোগ্যতা': 'educational_qualification',
      পেশা: 'profession',
      'কমিটি ত্যাগ': 'has_left_committee',
      'ত্যাগের কারণ': 'leaving_reason',
    },
  },
  {
    field: 'committee_meetings',
    columns: {
      'ক্রমিক নম্বর': 'serial',
      'সভার তারিখ': 'meeting_date',
      'উপস্থিত সদস্য সংখ্যা': 'attendees_count',
      'আলোচ্যসূচি (সংক্ষিপ্ত)': 'agenda',
      'সিদ্ধান্ত (সংক্ষিপ্ত)': 'decision',
    },
  },
  {
    field: 'departed_committee_members',
    columns: {
      'ক্রমিক নম্বর': 'serial',
      'সদস্যের নাম (ইংরেজি বড় হাতের অক্ষরে)': 'name',
      লিঙ্গ: 'gender',
      ফোন: 'phone',
      'ত্যাগের কারণ': 'leaving_reason',
    },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collapse whitespace/zero-width marks, trim, and normalize to NFC.
 *
 * IMPORTANT: Bengali text extracted from browser-saved HTML can come out in
 * NFD (decomposed) form while the string literals above are NFC (composed)
 * - visually identical but !== when compared. Every label lookup MUST go
 * through this function or matches will silently fail.
 */
function clean(raw: string | null | undefined): string | null {
  if (!raw) return null
  const text = raw
    .normalize('NFC')
    .replace(/\u200e|\u200f|\u00a0/g, ' ') // LRM/RLM/nbsp
    .replace(/\s+/g, ' ')
    .trim()
  return text.length ? text : null
}

/** Build a lookup map whose keys are normalized to NFC (see `clean`). */
function normalizeKeys<T>(map: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(map)) {
    out[k.normalize('NFC')] = v
  }
  return out
}

const FLAT_LABEL_MAP_N = normalizeKeys(FLAT_LABEL_MAP)
const ARRAY_TABLE_SPECS_N: ArrayTableSpec[] = ARRAY_TABLE_SPECS.map((s) => ({
  field: s.field,
  columns: normalizeKeys(s.columns),
}))

function emptyInstitute(sourceFileName: string): EmisInstitute {
  return {
    institution_name_bn: null,
    institution_name_en: null,
    eiin: null,
    mpo_code: null,
    district: null,
    upazila: null,
    union: null,
    post_office: null,
    post_code: null,
    village_or_road: null,
    mouza_name: null,
    plot_number: null,
    region: null,
    parliamentary_seat: null,
    institution_phone: null,
    head_mobile: null,
    founder: null,
    head_teacher_name: null,
    email: null,
    website: null,
    fax: null,
    establishment_date: null,
    institution_type: null,
    attached_technical_branch: null,
    group: null,
    coeducation_type: null,
    shift_count: null,
    has_english_version: null,
    management: null,
    recognition_status: null,
    recognized_level: null,
    is_mpo_enlisted: null,
    technical_branch_mpo_enlisted: null,
    nationalization_date: null,
    nearest_admin_unit: null,
    nearest_admin_unit_distance_km: null,
    area_type: null,
    geographic_location: null,
    is_enclave: null,
    geo_code: null,
    board_code: null,
    technical_board_code: null,
    technical_branch_mpo_code: null,
    stipend_code: null,
    mpo_info: [],
    recognized_levels: [],
    bank_accounts: [],
    head_teacher_contact: [],
    committee_info: [],
    committee_members: [],
    committee_meetings: [],
    departed_committee_members: [],
    legal_cases: [],
    sourceFileName,
  }
}

// ---------------------------------------------------------------------------
// Table parsing
// ---------------------------------------------------------------------------

/**
 * Flat "label cell -> value cell" tables: basic info, address, MPO status.
 * Scans every td/th in the document; whenever a cell's cleaned text matches
 * a known Bengali label, its next sibling cell is taken as the value. This
 * is deliberately table-agnostic since the govt template lays these pairs
 * out two-per-row across several unrelated-looking tables.
 */
function parseFlatFields(doc: Document, institute: EmisInstitute): void {
  const cells = Array.from(doc.querySelectorAll('td, th'))
  for (const cell of cells) {
    const label = clean(cell.textContent)
    if (!label) continue
    const field = FLAT_LABEL_MAP_N[label]
    if (!field) continue
    const valueCell = cell.nextElementSibling
    if (!valueCell) continue
    const value = clean(valueCell.textContent)
    // FLAT_LABEL_MAP only ever points at string|null fields on EmisInstitute.
    ;(institute as unknown as Record<string, string | null>)[field] = value
  }
}

/** All non-serial field names a given array-table spec can populate. */
function fieldsForSpec(spec: ArrayTableSpec): string[] {
  return Array.from(new Set(Object.values(spec.columns))).filter((f) => f !== 'serial')
}

function headerRowOf(table: HTMLTableElement): HTMLTableRowElement | null {
  const theadRow = table.querySelector('thead tr')
  if (theadRow) return theadRow as HTMLTableRowElement
  return table.querySelector('tr')
}

/**
 * Checks whether `table`'s header row matches a given spec, returning a
 * column-index -> field-name map if so. Requires at least half of the
 * spec's expected columns to be present, since some institutes' saved
 * pages omit trailing optional columns (e.g. remarks).
 */
function matchArrayTable(table: HTMLTableElement, spec: ArrayTableSpec): Map<number, string> | null {
  const headerRow = headerRowOf(table)
  if (!headerRow) return null

  const headerCells = Array.from(headerRow.children)
  const colMap = new Map<number, string>()
  headerCells.forEach((cell, i) => {
    const label = clean(cell.textContent)
    if (!label) return
    const field = spec.columns[label]
    if (field) colMap.set(i, field)
  })

  const requiredMatches = Math.max(1, Math.ceil(Object.keys(spec.columns).length / 2))
  return colMap.size >= requiredMatches ? colMap : null
}

function extractArrayRows(
  table: HTMLTableElement,
  headerRow: HTMLTableRowElement,
  colMap: Map<number, string>,
  fields: string[],
): Record<string, string | null>[] {
  const dataRows = Array.from(table.querySelectorAll('tr')).filter((row) => row !== headerRow)
  const records: Record<string, string | null>[] = []

  for (const row of dataRows) {
    const cells = Array.from(row.children)
    if (!cells.length) continue

    const record: Record<string, string | null> = {}
    fields.forEach((f) => (record[f] = null))

    let hasValue = false
    cells.forEach((cell, i) => {
      const field = colMap.get(i)
      if (!field) return
      const value = clean(cell.textContent)
      record[field] = value
      if (value) hasValue = true
    })

    if (hasValue) records.push(record)
  }

  return records
}

/**
 * Columnar tables: mpo_info, recognized_levels, bank_accounts, committee
 * data, legal cases, etc. Each spec is matched against every <table> in
 * the document until one's header row matches well enough; the first
 * matching table that yields rows wins.
 */
function parseArrayTables(doc: Document, institute: EmisInstitute): void {
  const tables = Array.from(doc.querySelectorAll('table')) as HTMLTableElement[]

  for (const spec of ARRAY_TABLE_SPECS_N) {
    const fields = fieldsForSpec(spec)
    let records: Record<string, string | null>[] = []

    for (const table of tables) {
      const headerRow = headerRowOf(table)
      if (!headerRow) continue
      const colMap = matchArrayTable(table, spec)
      if (!colMap) continue

      records = extractArrayRows(table, headerRow, colMap, fields)
      if (records.length) break
    }

    ;(institute as unknown as Record<string, unknown>)[spec.field] = records
  }
}

/** Parse one saved EMIS institute report page into our JSON shape. */
function parseEmisHtml(html: string, sourceFileName: string): EmisInstitute {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const institute = emptyInstitute(sourceFileName)
  parseFlatFields(doc, institute)
  parseArrayTables(doc, institute)
  return institute
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

const IMPORT_ENDPOINT = '/__institute-setup/import'
const LIST_ENDPOINT = '/__institute-setup/list'

export function useInstituteEmisImport() {
  const isParsing = ref(false)
  const isSaving = ref(false)
  const error = ref('')
  const parsed = ref<EmisImportResult | null>(null)
  const recentImports = ref<RecentEmisImport[]>([])

  /** Parse one or more saved EMIS HTML pages (one per institute). */
  async function parseFiles(files: File[] | FileList) {
    error.value = ''
    parsed.value = null
    isParsing.value = true
    try {
      const fileArray = Array.from(files)
      if (!fileArray.length) {
        error.value = 'No files selected.'
        return
      }

      const institutes: EmisInstitute[] = []
      for (const file of fileArray) {
        const html = await file.text()
        institutes.push(parseEmisHtml(html, file.name))
      }

      if (!institutes.length) {
        error.value = 'No readable institute data found in the selected file(s).'
        return
      }

      parsed.value = {
        sourceFileNames: fileArray.map((f) => f.name),
        importedAt: new Date().toISOString(),
        institutes,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to read the EMIS HTML file(s).'
    } finally {
      isParsing.value = false
    }
  }

  async function saveAsJson(fileName: string): Promise<boolean> {
    if (!parsed.value) return false
    isSaving.value = true
    error.value = ''
    try {
      const res = await fetch(IMPORT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, data: parsed.value }),
      })
      const body = (await res.json()) as { ok: boolean; message?: string }
      if (!res.ok || !body.ok) {
        error.value = body.message || 'Failed to save the JSON file.'
        return false
      }
      await loadRecentImports()
      return true
    } catch {
      // Most likely running a production build with no dev middleware -
      // fall back to a normal browser download so the feature still works.
      downloadAsJson(fileName)
      error.value =
        'Dev save endpoint unavailable (only works with `pnpm dev`) - downloaded the JSON instead.'
      return false
    } finally {
      isSaving.value = false
    }
  }

  function downloadAsJson(fileName: string) {
    if (!parsed.value) return
    const blob = new Blob([JSON.stringify(parsed.value, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName.replace(/\.json$/i, '')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function loadRecentImports() {
    try {
      const res = await fetch(LIST_ENDPOINT)
      const body = (await res.json()) as { ok: boolean; files?: RecentEmisImport[] }
      recentImports.value = body.ok && body.files ? body.files : []
    } catch {
      recentImports.value = []
    }
  }

  function reset() {
    parsed.value = null
    error.value = ''
  }

  return {
    isParsing,
    isSaving,
    error,
    parsed,
    recentImports,
    parseFiles,
    saveAsJson,
    downloadAsJson,
    loadRecentImports,
    reset,
  }
}
