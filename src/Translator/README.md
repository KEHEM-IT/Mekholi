# Translator — Structured i18n

File-based, reactive translation system for the whole app.

## How it works

- **Dictionaries** — `en.json` (English) and `bn.json` (বাংলা) with an identical
  nested structure: `{ "module": { "key": "text" } }`
- **Composable** — `useTranslator()` returns `{ t, lang }`; `t('staff.male')`
  returns the text for the active UI language
- **Global `$t`** — registered in `main.ts` as `app.config.globalProperties.$t`,
  usable in **any template** without importing anything: `{{ $t('branches.name') }}`
- **Reactive** — the active dictionary tracks `preferences.uiLanguage`
  (`useAppPreferences`), so switching language in
  *Settings → Language & Theme* re-renders everything instantly, app-wide

## Fallback chain

Missing key in the active language → **English** → the **key itself** (`staff.male`).

## Parameters

`t('common.exportFailed', { error: 'boom' })` replaces `{error}` in the string.

## Using it

```ts
// <script setup>
import { useTranslator } from '@/Translator'
const { t } = useTranslator()
t('branches.name')          // "Branch Name" / "শাখার নাম"
```

```html
<!-- template (no import needed) -->
{{ $t('common.save') }}
```

## Adding a new language (e.g. Chinese, Spanish, Hindi)

1. Copy `en.json` → `zh.json` (or `es.json`, `hi.json`) and translate the values
   (keep the keys identical)
2. Register it in `src/Translator/index.ts`:

   ```ts
   import zh from './zh.json'
   export const dictionaries = { en, bn, zh } as const
   ```

3. Add the language option in the settings page UI (`LanguageThemeSettingsView.vue`)
   — a `UILanguage` type entry + a flag button

## Migration path

Components can use **both** styles side by side:

- `t('key')` → dictionary lookup (new)
- `t('EN', 'BN')` → legacy inline pair (being migrated; the profile page still
  uses this in places)

Migrate a file by replacing each inline pair with a key and adding the entry to
both `en.json` and `bn.json`.
