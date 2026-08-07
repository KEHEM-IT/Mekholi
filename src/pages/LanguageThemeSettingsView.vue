<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useTranslator } from '@/Translator'
import { useAppPreferences } from '@/composables/useAppPreferences'
import { ACCENT_THEMES } from '@/utils/constants'
import type {
  AccentTheme,
  BengaliFont,
  DocumentLanguage,
  EnglishFont,
  FontSizeScale,
  UILanguage,
} from '@/types'

const { preferences, resetToDefaults } = useAppPreferences()
const { t, pick } = useTranslator()

const accentEntries = Object.entries(ACCENT_THEMES) as [
  AccentTheme,
  (typeof ACCENT_THEMES)[AccentTheme],
][]


function setLanguage(lang: UILanguage) {
  preferences.uiLanguage = lang
}

function setAccent(accent: AccentTheme) {
  preferences.accentTheme = accent
}

function setFontSize(size: FontSizeScale) {
  preferences.fontSize = size
}

// --- Save affordance -------------------------------------------------------
// Preferences already persist live (see useAppPreferences), so "Save" here
// just gives an explicit confirmation moment rather than gating the actual
// write - closer to how a settings page should feel even though nothing
// is technically lost if the user just navigates away.
const justSaved = ref(false)
let savedTimer: ReturnType<typeof setTimeout> | null = null

function handleSave() {
  justSaved.value = true
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => (justSaved.value = false), 2500)
}

function handleReset() {
  resetToDefaults()
  handleSave()
}

const documentLanguageFields: { key: keyof typeof preferences.documentLanguage; en: string; bn: string }[] = [
  { key: 'admitCard', en: 'Admit Card', bn: 'প্রবেশপত্র' },
  { key: 'idCard', en: 'Student / Staff ID Card', bn: 'পরিচয়পত্র' },
  { key: 'certificate', en: 'TC & Certificates', bn: 'টিসি ও সার্টিফিকেট' },
  { key: 'markSheet', en: 'Mark Sheet / Result Card', bn: 'মার্কশিট/ফলাফল কার্ড' },
]

const docLangOptions: { value: DocumentLanguage; en: string; bn: string }[] = [
  { value: 'en', en: 'English only', bn: 'শুধু ইংরেজি' },
  { value: 'bn', en: 'বাংলা only', bn: 'শুধু বাংলা' },
  { value: 'both', en: 'Bilingual (EN + BN)', bn: 'দ্বিভাষিক' },
]

const englishFontOptions: { value: EnglishFont; label: string; hint: string; hint_bn: string }[] = [
  {
    value: 'system',
    label: 'System default',
    hint: 'Recommended - native OS font, fastest to render',
    hint_bn: 'প্রস্তাবিত - ডিভাইসের নিজস্ব ফন্ট, দ্রুততম রেন্ডার',
  },
  {
    value: 'inter',
    label: 'Inter',
    hint: 'Popular modern SaaS/dashboard face, very readable at small sizes',
    hint_bn: 'জনপ্রিয় আধুনিক ড্যাশবোর্ড ফন্ট, ছোট আকারেও স্পষ্ট',
  },
  {
    value: 'roboto',
    label: 'Roboto',
    hint: 'Neutral, widely used in admin panels and Android apps',
    hint_bn: 'নিরপেক্ষ ফন্ট, অ্যাডমিন প্যানেল ও অ্যান্ড্রয়েড অ্যাপে বহুল ব্যবহৃত',
  },
  {
    value: 'open-sans',
    label: 'Open Sans',
    hint: 'Friendly, highly legible face common in ERP/report UIs',
    hint_bn: 'সহজপাঠ্য ফন্ট, ERP ও রিপোর্ট ইন্টারফেসে প্রচলিত',
  },
  {
    value: 'lato',
    label: 'Lato',
    hint: 'Warm, slightly rounded - reads well on forms and tables',
    hint_bn: 'উষ্ণ ও কিছুটা গোলাকার - ফর্ম ও টেবিলে ভালো দেখায়',
  },
  {
    value: 'ibm-plex-sans',
    label: 'IBM Plex Sans',
    hint: 'Technical, enterprise-grade look for data-heavy screens',
    hint_bn: 'টেকনিক্যাল ও এন্টারপ্রাইজ ধাঁচের, ডেটা-নির্ভর স্ক্রিনের জন্য উপযোগী',
  },
]

const selectedEnglishFont = computed(
  () => englishFontOptions.find((opt) => opt.value === preferences.englishFont) ?? englishFontOptions[0],
)

const bengaliFontOptions: { value: BengaliFont; label: string; hint: string; hint_bn: string }[] = [
  {
    value: 'hind-siliguri',
    label: 'Hind Siliguri',
    hint: 'Recommended - clean, modern Bangla UI face',
    hint_bn: 'প্রস্তাবিত - পরিষ্কার, আধুনিক বাংলা ফন্ট',
  },
  {
    value: 'kalpurush',
    label: 'Kalpurush',
    hint: 'Classic Bangla face, familiar from print & desktop use',
    hint_bn: 'পরিচিত ক্লাসিক বাংলা ফন্ট, প্রিন্ট ও ডেস্কটপে বহুল ব্যবহৃত',
  },
  {
    value: 'noto-sans-bengali',
    label: 'Noto Sans Bengali',
    hint: 'Wide script coverage, slightly denser look',
    hint_bn: 'বিস্তৃত লিপি সহায়তা, কিছুটা ঘন দেখতে',
  },
]

const selectedBengaliFont = computed(
  () => bengaliFontOptions.find((opt) => opt.value === preferences.bengaliFont) ?? bengaliFontOptions[0],
)

const fontSizeOptions: { value: FontSizeScale; en: string; bn: string }[] = [
  { value: 'small', en: 'Small', bn: 'ছোট' },
  { value: 'medium', en: 'Default', bn: 'ডিফল্ট' },
  { value: 'large', en: 'Large', bn: 'বড়' },
]

const bengaliPreviewText = 'শিক্ষা প্রতিষ্ঠান ব্যবস্থাপনা সিস্টেম - Mekholi'
const englishPreviewText = 'Institute Management System - Invoice #INV-2026-0417'
</script>

<template>
  <section class="lts">
    <div class="lts-header">
      <h1>{{ t("Language & Theme") }}</h1>
      <p>
        {{
          t("Choose the interface language, print-document language, and admin panel accent for your institution.")
        }}
      </p>
    </div>

    <!-- Interface Language -->
    <div class="lts-section">
      <div class="lts-section__head">
        <div class="lts-section__title">
          <i class="fa-duotone fa-language" />
          <div>
            <h2>{{ t("Interface Language") }}</h2>
            <span>{{
              t("Applies to the admin panel, sidebar menu, and labels")
            }}</span>
          </div>
        </div>
      </div>

      <div class="lts-section__body">
        <div class="lts-lang-toggle">
          <button
            type="button"
            class="lts-lang-option"
            :class="{ 'is-active': preferences.uiLanguage === 'en' }"
            @click="setLanguage('en')"
          >
            <span class="lts-lang-option__flag">🇬🇧</span>
            <span>
              <span class="lts-lang-option__name">English</span><br />
              <span class="lts-lang-option__native">Default interface language</span>
            </span>
          </button>
          <button
            type="button"
            class="lts-lang-option"
            :class="{ 'is-active': preferences.uiLanguage === 'bn' }"
            @click="setLanguage('bn')"
          >
            <span class="lts-lang-option__flag">🇧🇩</span>
            <span>
              <span class="lts-lang-option__name">বাংলা (Bangla)</span><br />
              <span class="lts-lang-option__native">সাইডবার মেনু ও লেবেল বাংলায় দেখাবে</span>
            </span>
          </button>
        </div>

        <div class="lts-divider" />

        <div class="lts-row">
          <div>
            <div class="lts-row__label">{{ t("Bangla numerals") }}</div>
            <div class="lts-row__hint">
              {{
                t("Show ০-৯ instead of 0-9 in rolls, marks, and printed dates")
              }}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="preferences.banglaNumerals"
            class="switch lts-row__control"
            :class="{ 'is-on': preferences.banglaNumerals }"
            @click="preferences.banglaNumerals = !preferences.banglaNumerals"
          />
        </div>

        <div class="lts-divider" />

        <div class="lts-row">
          <div>
            <div class="lts-row__label">{{ t("Calendar / date format") }}</div>
            <div class="lts-row__hint">
              {{
                t("Used across academic year, attendance, and report dates")
              }}
            </div>
          </div>
          <select v-model="preferences.dateCalendar" class="lts-row__control">
            <option value="gregorian">{{ t("Gregorian (Jul 15, 2026)") }}</option>
            <option value="bangla">{{ t("Bangla calendar (31 Ashar, 1433)") }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Typography -->
    <div class="lts-section">
      <div class="lts-section__head">
        <div class="lts-section__title">
          <i class="fa-duotone fa-font" />
          <div>
            <h2>{{ t("Typography") }}</h2>
            <span>{{
              t("English and Bengali font faces and base interface text size")
            }}</span>
          </div>
        </div>
      </div>

      <div class="lts-section__body">
        <div class="lts-row">
          <div>
            <div class="lts-row__label">{{ t("English font") }}</div>
            <div class="lts-row__hint">{{ pick(selectedEnglishFont?.hint ?? '', selectedEnglishFont?.hint_bn ?? '') }}</div>
          </div>
          <select
            class="lts-row__control"
            v-model="preferences.englishFont"
          >
            <option v-for="opt in englishFontOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <p
          class="lts-bn-font-preview"
          :style="{ fontFamily: selectedEnglishFont!.value === 'system' ? 'var(--font-family-base, system-ui)' : `'${selectedEnglishFont!.label}', sans-serif` }"
        >
          {{ englishPreviewText }}
        </p>

        <div class="lts-divider" />

        <div class="lts-row">
          <div>
            <div class="lts-row__label">{{ t("Bengali font") }}</div>
            <div class="lts-row__hint">{{ pick(selectedBengaliFont?.hint ?? '', selectedBengaliFont?.hint_bn ?? '') }}</div>
          </div>
          <select
            class="lts-row__control"
            v-model="preferences.bengaliFont"
          >
            <option v-for="opt in bengaliFontOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <p
          class="lts-bn-font-preview"
          :style="{ fontFamily: `'${selectedBengaliFont!.label}', sans-serif` }"
        >
          {{ bengaliPreviewText }}
        </p>

        <div class="lts-divider" />

        <div class="lts-row">
          <div>
            <div class="lts-row__label">{{ t("Text size") }}</div>
            <div class="lts-row__hint">
              {{
                t("Scales the base font size across the whole admin panel")
              }}
            </div>
          </div>
          <div class="lts-segmented lts-row__control">
            <button
              v-for="opt in fontSizeOptions"
              :key="opt.value"
              type="button"
              class="lts-segmented__option"
              :class="{ 'is-active': preferences.fontSize === opt.value }"
              @click="setFontSize(opt.value)"
            >
              {{ pick(opt.en, opt.bn) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Document & Print Language -->
    <div class="lts-section">
      <div class="lts-section__head">
        <div class="lts-section__title">
          <i class="fa-duotone fa-file-lines" />
          <div>
            <h2>{{ t("Document & Print Language") }}</h2>
            <span>{{
              t("The language each printed document is certified in - independent of the UI language")
            }}</span>
          </div>
        </div>
      </div>

      <div class="lts-section__body lts-doc-table">
        <table>
          <thead>
            <tr>
              <th>{{ t("Document type") }}</th>
              <th>{{ t("Language") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="field in documentLanguageFields" :key="field.key">
              <td>{{ pick(field.en, field.bn) }}</td>
              <td>
                <select v-model="preferences.documentLanguage[field.key]">
                  <option v-for="opt in docLangOptions" :key="opt.value" :value="opt.value">
                    {{ pick(opt.en, opt.bn) }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Appearance / Theme -->
    <div class="lts-section">
      <div class="lts-section__head">
        <div class="lts-section__title">
          <i class="fa-duotone fa-palette" />
          <div>
            <h2>{{ t("Theme & Branding") }}</h2>
            <span>{{
              t("Accent color used across buttons, links, and ID card previews")
            }}</span>
          </div>
        </div>
      </div>

      <div class="lts-section__body">
        <!-- Theme mode: Dark / Light -->
        <div class="lts-row">
          <div>
            <div class="lts-row__label">{{ t("Theme") }}</div>
            <div class="lts-row__hint">
              {{
                t("Choose the light or dark appearance for the whole admin panel")
              }}
            </div>
          </div>
          <div class="lts-segmented lts-row__control">
            <button
              type="button"
              class="lts-segmented__option"
              :class="{ 'is-active': preferences.theme === 'dark' }"
              @click="preferences.theme = 'dark'"
            >
              <i class="fa-duotone fa-moon" /> {{ t("Dark") }}
            </button>
            <button
              type="button"
              class="lts-segmented__option"
              :class="{ 'is-active': preferences.theme === 'light' }"
              @click="preferences.theme = 'light'"
            >
              <i class="fa-duotone fa-sun" /> {{ t("Light") }}
            </button>
          </div>
        </div>

        <div class="lts-divider" />

        <div class="lts-preview">
          <div class="lts-accents">
            <button
              v-for="[key, accent] in accentEntries"
              :key="key"
              type="button"
              class="lts-accent-swatch"
              :class="{ 'is-active': preferences.accentTheme === key }"
              :style="{ background: accent.swatch }"
              :title="pick(accent.label, accent.label_bn)"
              @click="setAccent(key)"
            >
              <i class="fa-solid fa-check" />
            </button>
          </div>

          <div class="lts-id-card">
            <div class="lts-id-card__band" />
            <div class="lts-id-card__body">
              <span class="avatar"><i class="fa-duotone fa-user" /></span>
              <strong>{{ t("Rahul Ahmed") }}</strong>
              <small>{{ t("Class 8 · Roll 07") }}</small>
            </div>
          </div>
        </div>
        <p class="lts-accent-name">
          {{
            pick(
              `Currently selected: ${ACCENT_THEMES[preferences.accentTheme].label}`,
              `বর্তমানে নির্বাচিত: ${ACCENT_THEMES[preferences.accentTheme].label_bn}`,
            )
          }}
        </p>

        <div class="lts-divider" />

        <div class="lts-row">
          <div>
            <div class="lts-row__label">{{ t("Interface density") }}</div>
            <div class="lts-row__hint">
              {{
                t("Compact reduces padding in the sidebar and page content")
              }}
            </div>
          </div>
          <div class="lts-segmented lts-row__control">
            <button
              type="button"
              class="lts-segmented__option"
              :class="{ 'is-active': preferences.density === 'comfortable' }"
              @click="preferences.density = 'comfortable'"
            >
              {{ t("Comfortable") }}
            </button>
            <button
              type="button"
              class="lts-segmented__option"
              :class="{ 'is-active': preferences.density === 'compact' }"
              @click="preferences.density = 'compact'"
            >
              {{ t("Compact") }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save bar -->
    <div class="lts-savebar">
      <div class="lts-savebar__status">
        <i v-if="justSaved" class="fa-duotone fa-circle-check" />
        <span>{{
          justSaved
            ? t("Saved")
            : t("Changes are saved automatically as you go")
        }}</span>
      </div>
      <div class="lts-savebar__actions">
        <BaseButton variant="ghost" @click="handleReset">
          {{ t("Reset to defaults") }}
        </BaseButton>
        <BaseButton variant="primary" @click="handleSave">
          {{ t("Save changes") }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>
