<script setup lang="ts">
// Beautiful read-only preview of an academic year.
import { computed } from 'vue'
import { useTranslator } from '@/Translator'
import type { AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'

const props = defineProps<{
  year: AcademicYear
}>()

const { t } = useTranslator()
const f = computed(() => props.year)

function show(v: unknown): string {
  if (v == null || v === '') return '—'
  return String(v)
}
const yesNo = (v: unknown) => (v ? t('Yes') : t('No'))
function fmtDate(v: unknown): string {
  const s = String(v ?? '')
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : show(v)
}

interface Field { label: string; value: string }

const dateFields = computed<Field[]>(() => [
  { label: t('Start Date'), value: fmtDate(f.value.start_date) },
  { label: t('End Date'), value: fmtDate(f.value.end_date) },
  { label: t('Registration From'), value: fmtDate(f.value.reg_start) },
  { label: t('Registration To'), value: fmtDate(f.value.reg_end) },
])

const statusFields = computed<Field[]>(() => [
  { label: t('Current Year'), value: yesNo(f.value.is_current) },
  { label: t('Active'), value: yesNo(f.value.is_active) },
])
</script>

<template>
  <div class="ipfp">
    <!-- Hero -->
    <div class="ipfp-hero">
      <div class="ipfp-hero__logo">
        <span>{{ (f.year_name || 'YY').trim().slice(-2) }}</span>
      </div>
      <div class="ipfp-hero__titles">
        <h2 class="ipfp-hero__name-en">{{ show(f.year_name) }}</h2>
        <p class="ipfp-hero__name-bn">{{ show(f.year_name_bn) }}</p>
        <div class="ipfp-hero__chips">
          <span v-if="f.is_current" class="ipfp-chip ipfp-chip--eiin">
            <i class="fa-duotone fa-star" /> {{ t('Current Year') }}
          </span>
          <span class="ipfp-chip" :class="f.is_active ? 'ipfp-chip--on' : 'ipfp-chip--off'">
            <i class="fa-duotone" :class="f.is_active ? 'fa-circle-check' : 'fa-circle-xmark'" />
            {{ f.is_active ? t('Active') : t('Inactive') }}
          </span>
        </div>
      </div>
    </div>

    <div class="ipfp-body">
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-calendar-days" /> {{ t('Session Dates') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in dateFields" :key="x.label" class="ipfp-field">
            <span class="ipfp-field__label">{{ x.label }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-toggle-on" /> {{ t('Status') }}</h4>
        <div class="ipfp-grid">
          <div v-for="x in statusFields" :key="x.label" class="ipfp-field">
            <span class="ipfp-field__label">{{ x.label }}</span>
            <span class="ipfp-field__value">{{ x.value }}</span>
          </div>
        </div>
      </div>

      <div v-if="f.remarks" class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-note-sticky" /> {{ t('Remarks') }}</h4>
        <p class="ipfp-remarks">{{ f.remarks }}</p>
      </div>
    </div>
  </div>
</template>
