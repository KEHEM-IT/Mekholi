// Bangladesh administrative geolocation lookups (Division -> District ->
// Upazila -> Union), backed by the PHPMyAdmin JSON exports living in
// src/assets/geolocation. Each raw file is a 3-entry array: a header entry,
// a database entry, and a single "table" entry whose `data` field holds the
// actual rows. `extractTableData` pulls just the rows out so the rest of
// the app only ever deals with plain typed arrays.
import divisionsData from "@/assets/geolocation/divisions.json";
import districtsData from "@/assets/geolocation/districts.json";
import upazilasData from "@/assets/geolocation/upazilas.json";
import unionsData from "@/assets/geolocation/unions.json";

export interface BdDivision {
  id: string;
  name: string;
  bn_name: string;
  url: string;
}

export interface BdDistrict {
  id: string;
  division_id: string;
  name: string;
  bn_name: string;
  lat: string;
  lon: string;
  url: string;
}

export interface BdUpazila {
  id: string;
  district_id: string;
  name: string;
  bn_name: string;
  url: string;
}

// Note: the source dump spells the foreign key "upazilla_id" (double L).
export interface BdUnion {
  id: string;
  upazilla_id: string;
  name: string;
  bn_name: string;
  url: string;
}

function extractTableData<T>(raw: unknown): T[] {
  const tableEntry = (raw as Array<Record<string, unknown>>).find(
    (entry) => entry.type === "table",
  );
  return (tableEntry?.data as T[]) ?? [];
}

export const BD_GEO_DIVISIONS: BdDivision[] = extractTableData<BdDivision>(divisionsData);
export const BD_GEO_DISTRICTS: BdDistrict[] = extractTableData<BdDistrict>(districtsData);
export const BD_GEO_UPAZILAS: BdUpazila[] = extractTableData<BdUpazila>(upazilasData);
export const BD_GEO_UNIONS: BdUnion[] = extractTableData<BdUnion>(unionsData);

export function districtsByDivisionId(divisionId: string): BdDistrict[] {
  return BD_GEO_DISTRICTS.filter((d) => d.division_id === divisionId);
}

export function upazilasByDistrictId(districtId: string): BdUpazila[] {
  return BD_GEO_UPAZILAS.filter((u) => u.district_id === districtId);
}

export function unionsByUpazilaId(upazilaId: string): BdUnion[] {
  return BD_GEO_UNIONS.filter((u) => u.upazilla_id === upazilaId);
}

export function findDivisionByName(name?: string): BdDivision | undefined {
  if (!name) return undefined;
  return BD_GEO_DIVISIONS.find((d) => d.name === name);
}

export function findDistrictByName(name?: string): BdDistrict | undefined {
  if (!name) return undefined;
  return BD_GEO_DISTRICTS.find((d) => d.name === name);
}

export function findUpazilaByName(name?: string): BdUpazila | undefined {
  if (!name) return undefined;
  return BD_GEO_UPAZILAS.find((u) => u.name === name);
}
