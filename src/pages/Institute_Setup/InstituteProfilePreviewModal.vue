<script setup lang="ts">
// Beautiful read-only preview of the Institute Profile form.
// Shows every filled field, grouped by section, bilingual.
import { computed } from 'vue'
import { useTranslator } from '@/Translator'
import { BD_GEO_DIVISIONS, BD_GEO_DISTRICTS, BD_GEO_UPAZILAS, BD_GEO_UNIONS } from '@/utils/bdGeo'
import { FACILITY_ICONS, FACILITY_KEYS, FACILITY_LABELS } from '@/pages/Institute_Setup/facilityMeta'

const props = defineProps<{
  form: Record<string, unknown>
}>()

const f = computed(() => props.form)
const { t } = useTranslator()

// ── helpers ────────────────────────────────────────────────────────────

/** Show a value or an em-dash when empty. */
function show(v: unknown): string {
  if (v == null || v === '') return '—'
  if (Array.isArray(v) && v.length === 0) return '—'
  if (typeof v === 'object' && Object.keys(v).length === 0) return '—'
  return String(v)
}

const yesNo = (v: unknown) => (v ? t('Yes') : t('No'))

function fmtDate(v: unknown): string {
  const s = String(v ?? '')
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : show(v)
}

function geoName(list: { id: string; LookupText: string }[], id: unknown): string {
  if (id == null || id === '') return '—'
  return list.find((x) => String(x.id) === String(id))?.LookupText ?? String(id)
}

const divisionName = computed(() => geoName(BD_GEO_DIVISIONS as unknown as { id: string; LookupText: string }[], f.value.division_id))
const districtName = computed(() => geoName(BD_GEO_DISTRICTS as unknown as { id: string; LookupText: string }[], f.value.district_id))
const upazilaName = computed(() => geoName(BD_GEO_UPAZILAS as unknown as { id: string; LookupText: string }[], f.value.upazila_id))
const unionName = computed(() => geoName(BD_GEO_UNIONS as unknown as { id: string; LookupText: string }[], f.value.union_id))

const facilities = computed<Record<string, boolean>>(() => (f.value.facilities as Record<string, boolean>) ?? {})
const classifications = computed<Array<Record<string, unknown>>>(() =>
  Array.isArray(f.value.classifications) ? (f.value.classifications as Array<Record<string, unknown>>) : [],
)

function groupsText(c: Record<string, unknown>): string {
  if (Array.isArray(c.groups) && c.groups.length) return c.groups.join(', ')
  return show(c.groups)
}
const committee = computed<Record<string, unknown>[]>(() => (f.value.committee_members as Record<string, unknown>[]) ?? [])

const logo = computed(() => String(f.value.institute_logo ?? ''))
const initials = computed(() => {
  const en = String(f.value.institute_name_en ?? '')
  return en.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'SCH'
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const L = (en: string, _bn?: string) => t(en)

// ── Section field lists ────────────────────────────────────────────────

interface Field { key: string; label: [string, string]; fmt?: (v: unknown) => string }

const identityFields: Field[] = [
  { key: 'founder_name', label: ['Founder', 'প্রতিষ্ঠাতা'] },
  { key: 'establishment_date', label: ['Established', 'প্রতিষ্ঠার তারিখ'], fmt: fmtDate },
  { key: 'parliamentary_constituency', label: ['Constituency', 'সংসদীয় আসন'] },
]

const addressFields: Field[] = [
  { key: 'division_id', label: ['Division', 'বিভাগ'], fmt: () => divisionName.value },
  { key: 'district_id', label: ['District', 'জেলা'], fmt: () => districtName.value },
  { key: 'upazila_id', label: ['Upazila / Thana', 'উপজেলা / থানা'], fmt: () => upazilaName.value },
  { key: 'union_id', label: ['Union', 'ইউনিয়ন'], fmt: () => unionName.value },
  { key: 'village_road_holding_no', label: ['Village / Road / Holding', 'গ্রাম / রোড / হোল্ডিং'] },
  { key: 'post_office', label: ['Post Office', 'ডাকঘর'] },
  { key: 'post_code', label: ['Post Code', 'পোস্ট কোড'] },
]

const contactFields: Field[] = [
  { key: 'institute_phone', label: ['Phone', 'ফোন'] },
  { key: 'institute_email', label: ['Email', 'ইমেইল'] },
  { key: 'website', label: ['Website', 'ওয়েবসাইট'] },
]

const classFields: Field[] = [
  { key: 'student_type', label: ['Student Type', 'শিক্ষার্থীর ধরন'] },
  { key: 'shift_count', label: ['Shift', 'শিফট'] },
  { key: 'has_english_version', label: ['English Version', 'ইংরেজি ভার্সন'], fmt: yesNo },
  { key: 'management', label: ['Management', 'ব্যবস্থাপনা'] },
]

const idFields: Field[] = [
  { key: 'eiin', label: ['EIIN', 'EIIN'] },
  { key: 'board_institute_code', label: ['Board Code', 'বোর্ড কোড'] },
  { key: 'technical_board_code', label: ['Tech. Board Code', 'কারিগরি বোর্ড কোড'] },
  { key: 'mpo_code', label: ['MPO Code', 'এমপিও কোড'] },
  { key: 'technical_branch_mpo_code', label: ['Tech. MPO Code', 'কারিগরি এমপিও কোড'] },
  { key: 'stipend_code', label: ['Stipend Code', 'স্টাইপেন্ড কোড'] },
]



const staffFields: Field[] = [
  { key: 'staff_total', label: ['Total Staffs', 'মোট কর্মচারী'] },
  { key: 'staff_male', label: ['Male Staffs', 'পুরুষ কর্মচারী'] },
  { key: 'staff_female', label: ['Female Staffs', 'মহিলা কর্মচারী'] },
  { key: 'staff_mpo', label: ['MPO Staffs', 'এমপিওভুক্ত কর্মচারী'] },
  { key: 'staff_nonmpo', label: ['Non-MPO Staffs', 'অ-এমপিওভুক্ত কর্মচারী'] },
]

const bankFields: Field[] = [
  { key: 'bank_name', label: ['Bank Name', 'ব্যাংকের নাম'] },
  { key: 'bank_branch', label: ['Branch', 'শাখা'] },
  { key: 'bank_account_type', label: ['Account Type', 'হিসাবের ধরন'] },
  { key: 'bank_account_holder', label: ['Account Holder', 'হিসাবের মালিক'] },
  { key: 'bank_account_number', label: ['Account Number', 'হিসাব নম্বর'] },
  { key: 'bank_account_purpose', label: ['Purpose', 'উদ্দেশ্য'] },
]

const staffTotal = computed(() => {
  // Mirrors the editor: the manual Total Staffs input, falling back to
  // Male + Female when total is not entered yet.
  const total = Number(f.value.staff_total) || 0
  return total > 0 ? total : (Number(f.value.staff_male) || 0) + (Number(f.value.staff_female) || 0)
})

const hasAnyValue = computed(() => {
  const keys = [
    ...identityFields, ...addressFields, ...contactFields, ...classFields,
    ...idFields, ...staffFields, ...bankFields,
  ]
  return (
    keys.some((x) => show(f.value[x.key]) !== '—') ||
    Object.values(facilities.value).some(Boolean) ||
    committee.value.length > 0 ||
    classifications.value.length > 0
  )
})
</script>

<template>
  <div class="ipfp">
    <!-- ── Hero band ─────────────────────────────────── -->
    <div class="ipfp-hero">
      <div class="ipfp-hero__logo">
        <img v-if="logo" :src="logo" alt="logo" />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="ipfp-hero__titles">
        <h2 class="ipfp-hero__name-en">{{ show(f.institute_name_en) }}</h2>
        <p class="ipfp-hero__name-bn">{{ show(f.institute_name_bn) }}</p>
        <div class="ipfp-hero__chips">
          <span v-if="f.eiin" class="ipfp-chip ipfp-chip--eiin">
            <i class="fa-duotone fa-hashtag" /> EIIN: {{ f.eiin }}
          </span>
          <span v-if="f.management" class="ipfp-chip">
            <i class="fa-duotone fa-building-columns" /> {{ f.management }}
          </span>
          <span v-if="f.institute_type" class="ipfp-chip">
            <i class="fa-duotone fa-school" /> {{ f.institute_type }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── Body ──────────────────────────────────────── -->
    <div class="ipfp-body">
      <div class="ipfp-section" v-if="identityFields.some((x) => show(f[x.key]) !== '—')">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-id-card" /> {{ L('Identity', 'পরিচয়') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in identityFields" :key="x.key" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.fmt ? x.fmt(f[x.key]) : show(f[x.key]) }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section" v-if="addressFields.some((x) => show(f[x.key]) !== '—')">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-location-dot" /> {{ L('Address', 'ঠিকানা') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in addressFields" :key="x.key" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.fmt ? x.fmt(f[x.key]) : show(f[x.key]) }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section" v-if="contactFields.some((x) => show(f[x.key]) !== '—')">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-phone" /> {{ L('Contact', 'যোগাযোগ') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in contactFields" :key="x.key" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.fmt ? x.fmt(f[x.key]) : show(f[x.key]) }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section" v-if="classFields.some((x) => show(f[x.key]) !== '—')">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-graduation-cap" /> {{ L('Classification', 'শ্রেণিবিভাগ') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in classFields" :key="x.key" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.fmt ? x.fmt(f[x.key]) : show(f[x.key]) }}</span>
          </div>
        </div>

        <!-- Classification rows -->
        <div v-if="classifications.length" class="ipfp-class-list">
          <div v-for="(c, i) in classifications" :key="i" class="ipfp-class-item">
            <div class="ipfp-class-item__head">
              <span class="ipfp-class-item__num">#{{ i + 1 }}</span>
            </div>
            <div class="ipfp-grid">
              <div class="ipfp-field">
                <span class="ipfp-field__label">{{ L('Institute Type', 'প্রতিষ্ঠানের ধরন') }}</span>
                <span class="ipfp-field__value">{{ show(c.institute_type) }}</span>
              </div>
              <div class="ipfp-field">
                <span class="ipfp-field__label">{{ L('Groups', 'গ্রুপ') }}</span>
                <span class="ipfp-field__value">{{ groupsText(c) }}</span>
              </div>
              <div class="ipfp-field">
                <span class="ipfp-field__label">{{ L('MPO Status', 'এমপিও অবস্থা') }}</span>
                <span class="ipfp-field__value">{{ yesNo(c.mpo_status) }}</span>
              </div>
              <template v-if="c.mpo_status">
                <div class="ipfp-field">
                  <span class="ipfp-field__label">{{ L('MPO Code', 'এমপিও কোড') }}</span>
                  <span class="ipfp-field__value">{{ show(c.mpo_code) }}</span>
                </div>
                <div class="ipfp-field">
                  <span class="ipfp-field__label">{{ L('MPO Date', 'এমপিও তারিখ') }}</span>
                  <span class="ipfp-field__value">{{ fmtDate(c.mpo_date) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="ipfp-section" v-if="idFields.some((x) => show(f[x.key]) !== '—')">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-fingerprint" /> {{ L('Identifiers', 'শনাক্তকরণ') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in idFields" :key="x.key" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.fmt ? x.fmt(f[x.key]) : show(f[x.key]) }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section" v-if="staffFields.some((x) => show(f[x.key]) !== '—') || staffTotal > 0">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-users" /> {{ L('Staff', 'কর্মচারী') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in staffFields" :key="x.key" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.fmt ? x.fmt(f[x.key]) : show(f[x.key]) }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section" v-if="bankFields.some((x) => show(f[x.key]) !== '—')">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-piggy-bank" /> {{ L('Bank Account', 'ব্যাংক হিসাব') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in bankFields" :key="x.key" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.fmt ? x.fmt(f[x.key]) : show(f[x.key]) }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-grid-2" /> {{ L('Facilities', 'সুবিধাদি') }}</h4>
        <div class="ipfp-facilities">
          <span
            v-for="key in FACILITY_KEYS"
            :key="key"
            class="ipfp-facility"
            :class="{ 'is-on': facilities[key], 'is-off': !facilities[key] }"
          >
            <i class="fa-duotone" :class="FACILITY_ICONS[key] ?? 'fa-circle'" />
            {{ t(FACILITY_LABELS[key]?.en ?? key) }}
            <i class="fa-solid ipfp-facility__mark" :class="facilities[key] ? 'fa-check' : 'fa-xmark'" />
          </span>
        </div>
      </div>

      <div class="ipfp-section" v-if="committee.length">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-people-group" /> {{ L('Committee Members', 'কমিটির সদস্য') }}
          <span class="ipfp-section__count">{{ committee.length }}</span>
        </h4>
        <div class="ipfp-committee">
          <div v-for="(m, i) in committee" :key="i" class="ipfp-member">
            <div class="ipfp-member__avatar">{{ (String(m.member_name ?? '') || '?').trim().charAt(0).toUpperCase() }}</div>
            <div class="ipfp-member__main">
              <span class="ipfp-member__name">{{ show(m.member_name) }}</span>
              <span class="ipfp-member__meta">
                {{ show(m.committee_position) }}
                <template v-if="m.gender"> · {{ m.gender }}</template>
              </span>
            </div>
            <div class="ipfp-member__side">
              <span v-if="m.joining_date" class="ipfp-member__date">
                <i class="fa-duotone fa-calendar" /> {{ fmtDate(m.joining_date) }}
              </span>
              <span v-if="m.phone" class="ipfp-member__phone">
                <i class="fa-duotone fa-phone" /> {{ m.phone }}
              </span>
              <span v-if="m.left_committee" class="ipfp-member__left">
                {{ t("Left") }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p v-if="!hasAnyValue" class="ipfp-empty">
        <i class="fa-duotone fa-folder-open" />
        {{ t("No information filled yet") }}
      </p>
    </div>
  </div>
</template>
