// ─────────────────────────────────────────────────────────────────────────
// Mekholi Translator — structured i18n engine
//
// Design (optimistic, migration-friendly):
//   • The KEY is always the English text:  t('Bank Account')
//   • en.json / bn.json are dictionaries keyed by that English text
//     (en is the fallback identity — a missing key returns the key itself,
//     so English always shows even before a translation exists)
//   • Nested module keys (e.g. 'branches.name') are still supported for the
//     already-migrated modules — flat English-key lookup wins first.
//
// Reactivity: the active dictionary tracks useAppPreferences().uiLanguage —
// switching the language in Settings re-renders every component instantly.
//
// Adding a language (zh / es / hi …): create <code>.json with the same
// English→translation pairs and register it in `dictionaries`.
// ─────────────────────────────────────────────────────────────────────────
import { computed } from 'vue'
import { useAppPreferences } from '@/composables/useAppPreferences'
import en from './en.json'
import bn from './bn.json'

export type LanguageCode = 'en' | 'bn'

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'bn']

/** Nested module dictionaries (backward compatible with branches.* keys). */
export const dictionaries = {
  en,
  bn,
} as const

export type Dictionary = Record<string, unknown>

export type TranslateParams = Record<string, string | number>

// ── Flat English-keyed maps, built once per language ────────────────────
// The JSON may hold both nested module objects (branches: { name }) and
// flat English keys ("Bank Account": "ব্যাংক হিসাব"). Flatten nested
// objects into dot-paths AND keep the top-level flat entries.

const flatCache = new Map<string, Record<string, string>>()

function flatten(obj: Record<string, unknown>, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      out[prefix ? `${prefix}.${k}` : k] = v
    } else if (v && typeof v === 'object') {
      flatten(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k, out)
    }
  }
  return out
}

function flatDict(lang: LanguageCode): Record<string, string> {
  const hit = flatCache.get(lang)
  if (hit) return hit
  const dict = dictionaries[lang] as unknown as Record<string, unknown>
  const flat = flatten(dict)
  flatCache.set(lang, flat)
  return flat
}

/** Nested dot-path lookup (legacy module keys). */
function lookupPath(dict: Record<string, unknown>, key: string): string | undefined {
  let val: unknown = dict
  for (const part of key.split('.')) {
    if (val && typeof val === 'object' && part in (val as Record<string, unknown>)) {
      val = (val as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof val === 'string' ? val : undefined
}

export function translate(key: string, params?: TranslateParams): string {
  const { preferences } = useAppPreferences()
  const lang = preferences.uiLanguage

  let text: string | undefined
  if (lang !== 'en') {
    text = flatDict(lang)[key] // flat English→translation
    if (text === undefined) text = lookupPath(dictionaries[lang] as unknown as Record<string, unknown>, key)
  }
  if (text === undefined) {
    text = lookupPath(en as unknown as Record<string, unknown>, key) // en fallback
  }
  if (text === undefined) return key // English identity — never blocks the UI
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}

/**
 * Composable for <script setup> usage:
 *   const { t, lang } = useTranslator()
 *   t('Bank Account') → "Bank Account" / "ব্যাংক হিসাব"
 */
export function useTranslator() {
  const { preferences } = useAppPreferences()
  const lang = computed(() => preferences.uiLanguage)

  /**
   * Pick between an English and a Bengali data value by the active language
   * (for bilingual DATA like nav names / font options — no isBn in code):
   *   pick('Science', 'বিজ্ঞান')
   */
  function pick(en: string, bn: string): string {
    return preferences.uiLanguage === 'bn' ? bn : en
  }

  return { t: translate, lang, pick }
}

/** Standalone pick (usable outside components). */
export function pickText(en: string, bn: string): string {
  const { preferences } = useAppPreferences()
  return preferences.uiLanguage === 'bn' ? bn : en
}
