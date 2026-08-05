// Shared profile API helpers — imported by both InstituteProfileView
// (saves/loads the form) and Institute Dashboard Index (reads progress).
//
// Data flow:
//   Dev (no server)  → form starts empty, user fills it in
//   Dev (with server) → calls http://localhost:5000/api/profile (SQLite)
//   Production        → form only (no external API dependency)

import { ref } from 'vue'

// ---- Local Python API helpers -------------------------------------------

export const isSaving = ref(false)
export const isLoadedFromApi = ref(false)

const API_BASE = 'http://localhost:5000'

/** Save form data to local SQLite backend.
 *  Expects the exact shape of the Profile page form object. */
export async function saveProfile(form: Record<string, any>): Promise<boolean> {
  isSaving.value = true
  try {
    const eiin = form.eiin || '130430'
    const res = await fetch(`${API_BASE}/api/profile?eiin=${encodeURIComponent(eiin)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) throw new Error('Save failed')
    return true
  } catch (err) {
    console.warn('saveProfile failed (is server.py running?):', err)
    return false
  } finally {
    isSaving.value = false
  }
}

/** Load form data from local SQLite (call at app startup).
 *  Returns the form object or null if API is unavailable. */
export async function loadProfile(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${API_BASE}/api/profile?eiin=130430`)
    if (!res.ok) return null
    const data = await res.json()
    isLoadedFromApi.value = true
    return data as Record<string, any>
  } catch {
    return null
  }
}
