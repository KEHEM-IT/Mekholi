// Excel export/import for Branches/Campus.
//
// Export builds a single "Branches" sheet — one row per branch, columns are
// the branch fields (table format, unlike the profile's Field/Value format
// because branches are a list entity). Import reads rows back into branches.

import * as XLSX from 'xlsx'
import { BD_GEO_DIVISIONS, BD_GEO_DISTRICTS, BD_GEO_UPAZILAS, BD_GEO_UNIONS } from '@/utils/bdGeo'
import type { Branch } from '@/composables/Institute_Setup/useBranches'

/** Column defs: header → branch key → value converter. */
interface ColDef {
  header: string
  key: keyof Branch
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

function toIsoDate(v: unknown): string {
  if (v == null || v === '') return ''
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`
  }
  const s = String(v).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  return ''
}

function parseBool(v: unknown): boolean {
  return ['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(String(v ?? '').trim().toLowerCase())
}

function boolText(v: unknown): string {
  return v ? 'Yes' : 'No'
}

interface GeoRow {
  id: string
  name?: string
  bn_name?: string
  LookupText?: string
}

function geoName(list: GeoRow[], id: unknown): string {
  if (id == null || id === '') return ''
  return list.find((x) => String(x.id) === String(id))?.LookupText ?? String(id)
}

function resolveGeoId(list: GeoRow[], v: unknown): string {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (/^\d+$/.test(s)) return s
  const hit = list.find(
    (g) => g.name === s || g.bn_name === s || (g.name ?? '').toLowerCase() === s.toLowerCase(),
  )
  return hit ? String(hit.id) : s
}

const GEO: Record<string, GeoRow[]> = {
  division_id: BD_GEO_DIVISIONS as unknown as GeoRow[],
  district_id: BD_GEO_DISTRICTS as unknown as GeoRow[],
  upazila_id: BD_GEO_UPAZILAS as unknown as GeoRow[],
  union_id: BD_GEO_UNIONS as unknown as GeoRow[],
}

export const BRANCH_COLUMNS: ColDef[] = [
  { header: 'Branch Name', key: 'branch_name' },
  { header: 'Branch Name (Bangla)', key: 'branch_name_bn' },
  { header: 'Branch Code', key: 'branch_code' },
  { header: 'Campus Type', key: 'campus_type' },
  { header: 'Is Main (Yes/No)', key: 'is_main', fmt: boolText, parse: parseBool },
  { header: 'Division', key: 'division_id', fmt: (v) => geoName(GEO.division_id, v), parse: (v) => resolveGeoId(GEO.division_id, v) },
  { header: 'District', key: 'district_id', fmt: (v) => geoName(GEO.district_id, v), parse: (v) => resolveGeoId(GEO.district_id, v) },
  { header: 'Upazila / Thana', key: 'upazila_id', fmt: (v) => geoName(GEO.upazila_id, v), parse: (v) => resolveGeoId(GEO.upazila_id, v) },
  { header: 'Union', key: 'union_id', fmt: (v) => geoName(GEO.union_id, v), parse: (v) => resolveGeoId(GEO.union_id, v) },
  { header: 'Village / Road / Holding', key: 'village_road_holding_no' },
  { header: 'Post Office', key: 'post_office' },
  { header: 'Post Code', key: 'post_code' },
  { header: 'Phone', key: 'phone' },
  { header: 'Email', key: 'email' },
  { header: 'Website', key: 'website' },
  { header: 'Head Name', key: 'head_name' },
  { header: 'Head Designation', key: 'head_designation' },
  { header: 'Head Phone', key: 'head_phone' },
  { header: 'Head Email', key: 'head_email' },
  { header: 'EIIN', key: 'eiin' },
  { header: 'Board', key: 'board' },
  { header: 'Institute Type', key: 'institute_type' },
  { header: 'Shift', key: 'shift' },
  { header: 'Established Date', key: 'established_date', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
  { header: 'Admission Open (Yes/No)', key: 'admission_open', fmt: boolText, parse: parseBool },
]

export function exportBranchesToExcel(branches: Branch[]): void {
  const rows: (string | number)[][] = [BRANCH_COLUMNS.map((c) => c.header)]
  for (const b of branches) {
    rows.push(
      BRANCH_COLUMNS.map((c) => {
        const raw = b[c.key]
        const v = raw == null ? '' : raw
        return c.fmt ? c.fmt(v) : (v as string | number)
      }),
    )
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = BRANCH_COLUMNS.map((c) => ({ wch: Math.max(c.header.length + 4, 16) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, ws, 'Branches')
  XLSX.writeFile(book, 'InstituteBranches.xlsx')
}

export async function importBranchesFromExcel(file: File): Promise<{ branches: Branch[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Branches'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const branches: Branch[] = []
  const skipped: string[] = []
  const empty = { branch_name: '', branch_name_bn: '', branch_code: '', campus_type: 'Main', is_main: false, logo: '', division_id: '', district_id: '', upazila_id: '', union_id: '', village_road_holding_no: '', post_office: '', post_code: null, phone: '', email: '', website: '', head_name: '', head_designation: '', head_phone: '', head_email: '', eiin: '', board: '', institute_type: '', shift: '', established_date: '', is_active: true, admission_open: true }

  for (const row of rows) {
    const name = String(row['Branch Name'] ?? '').trim()
    if (!name) continue
    const branch: Branch = { ...empty }
    for (const col of BRANCH_COLUMNS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : String(raw).replace(/\s+/g, ' ').trim()
      ;(branch as unknown as Record<string, unknown>)[col.key as string] = parsed
    }
    branch.branch_name = name
    branches.push(branch)
  }
  return { branches, skipped }
}
