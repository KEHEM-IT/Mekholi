<script setup lang="ts">
// Beautiful read-only preview of a branch/campus — hero band + grouped
// sections, bilingual, matching the Institute Profile preview design.
import { computed } from 'vue'
import { useTranslator } from '@/Translator'
import { BD_GEO_DIVISIONS, BD_GEO_DISTRICTS, BD_GEO_UPAZILAS, BD_GEO_UNIONS } from '@/utils/bdGeo'
import type { Branch } from '@/composables/Institute_Setup/useBranches'

const props = defineProps<{
  branch: Branch
}>()

const f = computed(() => props.branch)
const { t } = useTranslator()

function show(v: unknown): string {
  if (v == null || v === '') return '—'
  return String(v)
}
const yesNo = (v: unknown) => (v ? t('common.yes') : t('common.no'))
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

interface Field { label: string; value: string }

const addressFields = computed<Field[]>(() => [
  { label: 'branches.division', value: divisionName.value },
  { label: 'branches.district', value: districtName.value },
  { label: 'branches.upazila', value: upazilaName.value },
  { label: 'branches.union', value: unionName.value },
  { label: 'branches.village', value: show(f.value.village_road_holding_no) },
  { label: 'branches.postOffice', value: show(f.value.post_office) },
  { label: 'branches.postCode', value: show(f.value.post_code) },
])

const contactFields = computed<Field[]>(() => [
  { label: 'branches.phone', value: show(f.value.phone) },
  { label: 'branches.email', value: show(f.value.email) },
  { label: 'branches.website', value: show(f.value.website) },
])

const headFields = computed<Field[]>(() => [
  { label: 'branches.headName', value: show(f.value.head_name) },
  { label: 'branches.headDesignation', value: show(f.value.head_designation) },
  { label: 'branches.headPhone', value: show(f.value.head_phone) },
  { label: 'branches.headEmail', value: show(f.value.head_email) },
])

const regFields = computed<Field[]>(() => [
  { label: 'branches.eiin', value: show(f.value.eiin) },
  { label: 'branches.board', value: show(f.value.board) },
  { label: 'branches.instituteType', value: show(f.value.institute_type) },
  { label: 'branches.shift', value: show(f.value.shift) },
  { label: 'branches.estDate', value: fmtDate(f.value.established_date) },
])

const statusFields = computed<Field[]>(() => [
  { label: 'branches.isMain', value: yesNo(f.value.is_main) },
  { label: 'common.active', value: yesNo(f.value.is_active) },
  { label: 'common.admissionOpen', value: yesNo(f.value.admission_open) },
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
          <span v-if="f.is_main" class="ipfp-chip"><i class="fa-duotone fa-star" /> {{ t('branches.isMain') }}</span>
          <span class="ipfp-chip" :class="f.is_active ? 'ipfp-chip--on' : 'ipfp-chip--off'">
            <i class="fa-duotone" :class="f.is_active ? 'fa-circle-check' : 'fa-circle-xmark'" />
            {{ f.is_active ? t('common.active') : t('common.inactive') }}
          </span>
        </div>
      </div>
    </div>

    <div class="ipfp-body">
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-location-dot" /> {{ t('branches.address') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in addressFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ t(x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-phone" /> {{ t('branches.contact') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in contactFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ t(x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-user-tie" /> {{ t('branches.headOf') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in headFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ t(x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-landmark" /> {{ t('branches.regulatory') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in regFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ t(x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-toggle-on" /> {{ t('common.status') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in statusFields" :key="x.label[0]" class="ipfp-field">
            <span class="ipfp-field__label">{{ t(x.label) }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
