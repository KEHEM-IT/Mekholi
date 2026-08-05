// Bangladesh administrative geolocation lookups (Division → District →
// Upazila → Union), backed by the flat JSON exports in
// src/assets/geolocations. Each file is a phpMyAdmin export where the
// actual data is nested under `data` inside a table descriptor object.
import divisionsRaw from '@/assets/geolocations/divisions.json'
import districtsRaw from '@/assets/geolocations/districts.json'
import upazilasRaw  from '@/assets/geolocations/upazilas.json'
import unionsRaw    from '@/assets/geolocations/unions.json'

function extractData(wrapper: Array<Record<string, unknown>>) {
  for (const item of wrapper) {
    if ((item).type === 'table') return ((item).data ?? []) as Record<string, unknown>[]
  }
  return [] as Record<string, unknown>[]
}

// ── Interfaces ──────────────────────────────────────────────────────────

export interface BdDivision {
  [key: string]: unknown
  id: string
  name: string
  bn_name: string
  LookupText: string
}

export interface BdDistrict {
  [key: string]: unknown
  id: string
  division_id: string
  name: string
  bn_name: string
  LookupText: string
}

export interface BdUpazila {
  [key: string]: unknown
  id: string
  district_id: string
  name: string
  bn_name: string
  LookupText: string
}

export interface BdUnion {
  [key: string]: unknown
  id: string
  upazilla_id: string
  name: string
  bn_name: string
  LookupText: string
}

// ── Build lookup arrays (add LookupText) ─────────────────────────────────

const _rawDivisions = extractData(divisionsRaw)
const _rawDistricts = extractData(districtsRaw)
const _rawUpazilas  = extractData(upazilasRaw)
const _rawUnions    = extractData(unionsRaw)

const addLookup = (d: Record<string, unknown>) => ({
  ...d,
  LookupText: `${d.name} - ${d.bn_name}`,
})

export const BD_GEO_DIVISIONS = _rawDivisions.map(addLookup) as unknown as BdDivision[]
export const BD_GEO_DISTRICTS = _rawDistricts.map(addLookup) as unknown as BdDistrict[]
export const BD_GEO_UPAZILAS  = _rawUpazilas.map(addLookup) as unknown as BdUpazila[]
export const BD_GEO_UNIONS    = _rawUnions.map(addLookup) as unknown as BdUnion[]

// ── Cascading filters ────────────────────────────────────────────────────

export function districtsByDivisionId(divisionId: number | string): BdDistrict[] {
  const id = String(divisionId)
  return BD_GEO_DISTRICTS.filter((d) => d.division_id === id)
}

export function upazilasByDistrictId(districtId: number | string): BdUpazila[] {
  const id = String(districtId)
  return BD_GEO_UPAZILAS.filter((u) => u.district_id === id)
}

export function unionsByUpazilaId(upazilaId: number | string): BdUnion[] {
  const id = String(upazilaId)
  return BD_GEO_UNIONS.filter((u) => u.upazilla_id === id)
}

// ── Name lookups (case-insensitive) ──────────────────────────────────────

export function findDivisionByName(name?: string): BdDivision | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase()
  return BD_GEO_DIVISIONS.find((d) => d.name.toLowerCase() === lower)
}

export function findDistrictByName(name?: string): BdDistrict | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase()
  return BD_GEO_DISTRICTS.find((d) => d.name.toLowerCase() === lower)
}

export function findUpazilaByName(name?: string): BdUpazila | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase()
  return BD_GEO_UPAZILAS.find((u) => u.name.toLowerCase() === lower)
}

export function findUnionByName(name?: string): BdUnion | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase()
  return BD_GEO_UNIONS.find((u) => u.name.toLowerCase() === lower)
}
