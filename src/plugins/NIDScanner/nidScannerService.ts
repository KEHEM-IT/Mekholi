import { http } from '@/services/http'

export interface NIDScanResult {
  name_bn: string
  name_en: string
  father_name: string
  mother_name: string
  dob: string
  nid_no: string
  blood_group: string
  address: string
  issue_date: string
  birth_place: string
  signature: string
}

export const nidScannerService = {
  async scanNID(frontImageBase64: string, backImageBase64?: string): Promise<NIDScanResult> {
    return http.post<NIDScanResult>('/plugins/nid-scanner', {
      front_image: frontImageBase64,
      back_image: backImageBase64 || null,
    }, { auth: false })
  },
}
