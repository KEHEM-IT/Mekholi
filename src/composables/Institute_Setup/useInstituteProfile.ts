// Shared profile API helpers — imported by both InstituteProfileView
// (saves/loads the form) and Institute Dashboard Index (reads progress).
//
// Data flow:
//   Dev (no server)  → form starts empty, user fills it in
//   Dev (with server) → calls http://localhost:5000/api/profile (SQLite)
//   Production        → form only (no external API dependency)

import { computed, ref } from 'vue'

// ---- Local Python API helpers -------------------------------------------

export const isSaving = ref(false)
export const isLoadedFromApi = ref(false)

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// Shared snapshot of the currently saved/loaded institute profile. The
// Institute Setup dashboard (Index.vue) derives its completion progress
// from this — it is refreshed on every load and every successful save.
export const instituteProfile = ref<Record<string, unknown>>({})

/** True when a value counts as "filled" for dashboard progress. */
function isFilled(v: unknown): boolean {
  if (v == null || v === '' || v === false) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v).length > 0
  return true
}

/** Completion progress of the institute profile for the Setup dashboard. */
export const profileProgress = computed(() => {
  const values = Object.values(instituteProfile.value)
  const total = values.length
  const filled = values.filter(isFilled).length
  return {
    total,
    filled,
    empty: total - filled,
    pct: total ? Math.round((filled / total) * 100) : 0,
  }
})

/** Save form data to local SQLite backend.
 *  Expects the exact shape of the Profile page form object. */
export async function saveProfile(form: Record<string, unknown>): Promise<boolean> {
  isSaving.value = true
  try {
    const eiin = String(form.eiin || '130430')
    const res = await fetch(`${API_BASE}/api/profile?eiin=${encodeURIComponent(eiin)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) throw new Error('Save failed')
    instituteProfile.value = { ...form }
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
export async function loadProfile(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_BASE}/api/profile?eiin=130430`)
    if (!res.ok) return null
    const data = await res.json()
    isLoadedFromApi.value = true
    instituteProfile.value = data as Record<string, unknown>
    return data as Record<string, unknown>
  } catch {
    return null
  }
}
