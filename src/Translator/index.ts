// ─────────────────────────────────────────────────────────────────────────
// Mekholi Translator — structured, file-based i18n
//
// Dictionaries live in src/Translator/*.json (en.json, bn.json). Adding a
// new language = add <code>.json with the same nested structure and the
// app picks it up automatically (e.g. zh.json, es.json, hi.json).
//
// Reactivity: the active dictionary is a computed that tracks
// useAppPreferences().uiLanguage — switching the language in Settings
// re-renders every component that calls t() / $t instantly, app-wide.
//
// Fallback chain: active language → English → the key itself.
// Params: t('common.exportFailed', { error: 'x' }) replaces {error}.
// ─────────────────────────────────────────────────────────────────────────
import { computed } from 'vue'
import { useAppPreferences } from '@/composables/useAppPreferences'
import en from './en.json'
import bn from './bn.json'

export type LanguageCode = 'en' | 'bn'

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'bn']

/** All dictionaries — register new languages here. */
export const dictionaries = {
  en,
  bn,
} as const

export type Dictionary = typeof en

export type TranslateParams = Record<string, string | number>

/** Resolve a dot-path key ("staff.male") inside a dictionary object. */
function lookup(dict: Dictionary, key: string): string | undefined {
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
  // active language from the global reactive preferences (module singleton)
  const { preferences } = useAppPreferences()
  const lang = preferences.uiLanguage
  let text = lookup(dictionaries[lang] as Dictionary, key)
  if (text === undefined) text = lookup(en, key)
  if (text === undefined) return key
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
 *   t('branches.name') → "Branch Name" / "শাখার নাম"
 */
export function useTranslator() {
  const { preferences } = useAppPreferences()
  const lang = computed(() => preferences.uiLanguage)
  return {
    t: translate,
    lang,
  }
}
