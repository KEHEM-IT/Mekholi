import { reactive, watch } from 'vue'
import { APP_PREFERENCES_KEY } from '@/utils/constants'
import type { AppPreferences } from '@/types'

// Module-level (singleton) state, same pattern as useSidebar - every
// component that calls useAppPreferences() shares one reactive object, so
// the Language & Theme settings page and anything else reading these
// values (sidebar labels, print previews, etc.) stay in sync without a
// store.
const DEFAULT_PREFERENCES: AppPreferences = {
  uiLanguage: 'en',
  theme: 'dark',
  accentTheme: 'indigo',
  banglaNumerals: false,
  dateCalendar: 'gregorian',
  density: 'comfortable',
  englishFont: 'system',
  bengaliFont: 'hind-siliguri',
  fontSize: 'medium',
  documentLanguage: {
    admitCard: 'both',
    idCard: 'both',
    certificate: 'bn',
    markSheet: 'both',
  },
}

function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(APP_PREFERENCES_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      documentLanguage: { ...DEFAULT_PREFERENCES.documentLanguage, ...parsed.documentLanguage },
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

const preferences = reactive<AppPreferences>(loadPreferences())

// Reflect language + accent onto <html> immediately (and on every change)
// so CSS ([data-accent="..."] in styles/themes/_accents.scss) and
// assistive tech (lang attribute) pick it up app-wide, not just on the
// settings page itself.
function applyToDocument(prefs: AppPreferences) {
  const root = document.documentElement
  root.setAttribute('lang', prefs.uiLanguage)
  root.setAttribute('data-theme', prefs.theme)
  root.setAttribute('data-accent', prefs.accentTheme)
  root.setAttribute('data-density', prefs.density)
  root.setAttribute('data-font-en', prefs.englishFont)
  root.setAttribute('data-bn-font', prefs.bengaliFont)
  root.setAttribute('data-font-size', prefs.fontSize)
}

applyToDocument(preferences)

watch(
  preferences,
  (prefs) => {
    localStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(prefs))
    applyToDocument(prefs)
  },
  { deep: true },
)

export function useAppPreferences() {
  function resetToDefaults() {
    Object.assign(preferences, {
      ...DEFAULT_PREFERENCES,
      documentLanguage: { ...DEFAULT_PREFERENCES.documentLanguage },
    })
  }

  return {
    preferences,
    resetToDefaults,
  }
}
