// Bangladesh administrative geolocation lookups (Division -> District ->
// Upazila -> Union), backed by the flat JSON exports living in
// src/assets/geolocation. Each file is a plain array of rows (Id +
// name fields + a parent foreign key), so the JSON imports are used
// directly — no unwrapping needed.
import divisionsData from '@/assets/geolocation/divisions.json'
import districtsData from '@/assets/geolocation/districts.json'
import upazilasData from '@/assets/geolocation/upazilas.json'
import unionsData from '@/assets/geolocation/unions.json'

// Each row also carries an index signature so these interfaces satisfy
// BaseCombobox's generic `ComboboxOption = Record<string, unknown>` options
// prop - without it TS rejects passing e.g. BdDistrict[] where
// Record<string, unknown>[] is expected, even though every named field
// already fits `unknown`.
export interface BdDivision {
  [key: string]: unknown
  Id: number
  ZoneName: string
  Zone_Bn: string
  LookupText: string
}

export interface BdDistrict {
  [key: string]: unknown
  Id: number
  Name: string
  NameBn: string
  DivisionId: number
  ZoneId: number
  LookupText: string
}

export interface BdUpazila {
  [key: string]: unknown
  Id: number
  Name: string
  NameBn: string
  DistrictId: number
  LookupText: string
}

export interface BdUnion {
  [key: string]: unknown
  Id: number
  Name: string
  NameBn: string
  SubDistrictId: number
  /** Not present in the source dump — built once at load time below so
   *  unions can be dropped straight into BaseCombobox like every other
   *  level (which all carry a real LookupText column). */
  LookupText: string
}

export const BD_GEO_DIVISIONS = divisionsData as BdDivision[]
export const BD_GEO_DISTRICTS = districtsData as BdDistrict[]
export const BD_GEO_UPAZILAS = upazilasData as BdUpazila[]

type RawUnion = Omit<BdUnion, 'LookupText'>
export const BD_GEO_UNIONS: BdUnion[] = (unionsData as RawUnion[]).map((u) => ({
  ...u,
  LookupText: u.Name === u.NameBn ? u.Name : `${u.Name} - ${u.NameBn}`,
}))

export function districtsByDivisionId(divisionId: number | string): BdDistrict[] {
  const id = Number(divisionId)
  return BD_GEO_DISTRICTS.filter((d) => d.DivisionId === id)
}

export function upazilasByDistrictId(districtId: number | string): BdUpazila[] {
  const id = Number(districtId)
  return BD_GEO_UPAZILAS.filter((u) => u.DistrictId === id)
}

export function unionsByUpazilaId(upazilaId: number | string): BdUnion[] {
  const id = Number(upazilaId)
  return BD_GEO_UNIONS.filter((u) => u.SubDistrictId === id)
}

export function findDivisionByName(name?: string): BdDivision | undefined {
  if (!name) return undefined
  return BD_GEO_DIVISIONS.find((d) => d.ZoneName === name)
}

export function findDistrictByName(name?: string): BdDistrict | undefined {
  if (!name) return undefined
  return BD_GEO_DISTRICTS.find((d) => d.Name === name)
}

export function findUpazilaByName(name?: string): BdUpazila | undefined {
  if (!name) return undefined
  return BD_GEO_UPAZILAS.find((u) => u.Name === name)
}

export function findUnionByName(name?: string): BdUnion | undefined {
  if (!name) return undefined
  return BD_GEO_UNIONS.find((u) => u.Name === name)
}
