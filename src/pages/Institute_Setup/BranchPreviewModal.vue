<script setup lang="ts">
// Beautiful read-only preview of a branch/campus — hero band + grouped
// sections, bilingual, matching the Institute Profile preview design.
import { computed } from 'vue'
import { useAppPreferences } from '@/composables/useAppPreferences'
import { BD_GEO_DIVISIONS, BD_GEO_DISTRICTS, BD_GEO_UPAZILAS, BD_GEO_UNIONS } from '@/utils/bdGeo'
import type { Branch } from '@/composables/Institute_Setup/useBranches'

const props = defineProps<{
  branch: Branch
}>()

const { preferences } = useAppPreferences()
const isBn = computed(() => preferences.uiLanguage === 'bn')
const f = computed(() => props.branch)
const L = (en: string, bn: string) => (isBn.value ? bn : en)

function show(v: unknown): string {
  if (v == null || v === '') return '—'
  return String(v)
}
function yesNo(v: unknown): string {
  return isBn.value ? (v ? 'হ্যাঁ' : 'না') : v ? 'Yes' : 'No'
}
function fmtDate(v: unknown): string {
  const s = String(v ?? '')
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
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

const initials = computed(() => {
  const en = String(f.value.branch_name ?? '')
  return en.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'BR'
})

interface Field { label: [string, string]; value: string }

const addressFields = computed<Field[]>(() => [
  { label: ['Division', 'বিভাগ'], value: divisionName.value },
  { label: ['District', 'জেলা'], value: districtName.value },
  { label: ['Upazila / Thana', 'উপজেলা / থানা'], value: upazilaName.value },
  { label: ['Union', 'ইউনিয়ন'], value: unionName.value },
  { label: ['Village / Road / Holding', 'গ্রাম / রোড / হোল্ডিং'], value: show(f.value.village_road_holding_no) },
  { label: ['Post Office', 'ডাকঘর'], value: show(f.value.post_office) },
  { label: ['Post Code', 'পোস্ট কোড'], value: show(f.value.post_code) },
])

const contactFields = computed<Field[]>(() => [
  { label: ['Phone', 'ফোন'], value: show(f.value.phone) },
  { label: ['Email', 'ইমেইল'], value: show(f.value.email) },
  { label: ['Website', 'ওয়েবসাইট'], value: show(f.value.website) },
])

const headFields = computed<Field[]>(() => [
  { label: ['Head Name', 'প্রধানের নাম'], value: show(f.value.head_name) },
  { label: ['Designation', 'পদবি'], value: show(f.value.head_designation) },
  { label: ['Head Phone', 'প্রধানের ফোন'], value: show(f.value.head_phone) },
  { label: ['Head Email', 'প্রধানের ইমেইল'], value: show(f.value.head_email) },
])

const regFields = computed<Field[]>(() => [
  { label: ['EIIN', 'EIIN'], value: show(f.value.eiin) },
  { label: ['Board', 'বোর্ড'], value: show(f.value.board) },
  { label: ['Institute Type', 'প্রতিষ্ঠানের ধরন'], value: show(f.value.institute_type) },
  { label: ['Shift', 'শিফট'], value: show(f.value.shift) },
  { label: ['Established', 'প্রতিষ্ঠার তারিখ'], value: fmtDate(f.value.established_date) },
])

const statusFields = computed<Field[]>(() => [
  { label: ['Main Branch', 'প্রধান শাখা'], value: yesNo(f.value.is_main) },
  { label: ['Active', 'সক্রিয়'], value: yesNo(f.value.is_active) },
  { label: ['Admission Open', 'ভর্তি চলছে'], value: yesNo(f.value.admission_open) },
])
</script>

<template>
  <div class="ipfp">
    <!-- Hero -->
    <div class="ipfp-hero">
      <div class="ipfp-hero__logo">
        <img v-if="f.logo" :src="f.logo" alt="branch logo" />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="ipfp-hero__titles">
        <h2 class="ipfp-hero__name-en">{{ show(f.branch_name) }}</h2>
        <p class="ipfp-hero__name-bn">{{ show(f.branch_name_bn) }}</p>
        <div class="ipfp-hero__chips">
          <span v-if="f.branch_code" class="ipfp-chip ipfp-chip--eiin">
            <i class="fa-duotone fa-hashtag" /> {{ f.branch_code }}
          </span>
          <span class="ipfp-chip"><i class="fa-duotone fa-building-columns" /> {{ show(f.campus_type) }}</span>
          <span v-if="f.is_main" class="ipfp-chip"><i class="fa-duotone fa-star" /> {{ L('Main Branch', 'প্রধান শাখা') }}</span>
          <span class="ipfp-chip" :class="f.is_active ? 'ipfp-chip--on' : 'ipfp-chip--off'">
            <i class="fa-duotone" :class="f.is_active ? 'fa-circle-check' : 'fa-circle-xmark'" />
            {{ f.is_active ? L('Active', 'সক্রিয়') : L('Inactive', 'নিষ্ক্রিয়') }}
          </span>
        </div>
      </div>
    </div>

    <div class="ipfp-body">
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-location-dot" /> {{ L('Address', 'ঠিকানা') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in addressFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-phone" /> {{ L('Contact', 'যোগাযোগ') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in contactFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-user-tie" /> {{ L('Head of Campus', 'ক্যাম্পাস প্রধান') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in headFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-landmark" /> {{ L('Regulatory & Academic', 'নিয়ন্ত্রক ও একাডেমিক') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in regFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-toggle-on" /> {{ L('Status', 'অবস্থা') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in statusFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ L(...x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
