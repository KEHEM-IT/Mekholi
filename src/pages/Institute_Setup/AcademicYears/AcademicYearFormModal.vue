<script setup lang="ts">
// Add / edit academic year form modal — Pathshala/Cloud-Campus style fields:
// year name (EN+BN), session dates, registration window, current-year
// toggle (only one allowed), status, remarks.
import { reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import {
  emptyAcademicYear,
  type AcademicYear,
} from '@/composables/Institute_Setup/useAcademicYears'

const props = defineProps<{
  year: AcademicYear | null
  /** True when another year is already current — the toggle is then hidden
   *  on the add form (only one current year allowed). */
  currentExists?: boolean
}>()

const emit = defineEmits<{
  save: [year: AcademicYear]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<AcademicYear>(
  props.year ? JSON.parse(JSON.stringify(props.year)) : emptyAcademicYear(),
)

function validate(): boolean {
  if (!form.year_name.trim()) {
    toast.error(t('Year name is required'))
    return false
  }
  if (form.start_date && form.end_date && form.end_date < form.start_date) {
    toast.error(t('End date must be after the start date'))
    return false
  }
  if (form.reg_start && form.reg_end && form.reg_end < form.reg_start) {
    toast.error(t('Registration end must be after the registration start'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  emit('save', {
    ...form,
    year_name: form.year_name.trim(),
    year_name_bn: form.year_name_bn.trim(),
    remarks: form.remarks.trim(),
  })
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Identity -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-calendar-days" /> {{ t('Year Details') }}</h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Year Name') }} *</label>
            <input v-model="form.year_name" type="text" inputmode="numeric" maxlength="4" placeholder="2026" />
          </div>
          <div class="form-field">
            <label>{{ t('Year Name (Bangla)') }}</label>
            <input v-model="form.year_name_bn" type="text" :placeholder="t('e.g. শিক্ষাবর্ষ ২০২৬')" />
          </div>
          <div class="form-field">
            <label>{{ t('Start Date') }}</label>
            <BaseDatePicker v-model="form.start_date" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('End Date') }}</label>
            <BaseDatePicker v-model="form.end_date" :placeholder="t('DD/MM/YYYY')" />
          </div>
        </div>
      </div>

      <!-- Registration window -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-door-open" /> {{ t('Registration Window') }}</h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Registration From') }}</label>
            <BaseDatePicker v-model="form.reg_start" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Registration To') }}</label>
            <BaseDatePicker v-model="form.reg_end" :placeholder="t('DD/MM/YYYY')" />
          </div>
        </div>
      </div>

      <!-- Status -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-toggle-on" /> {{ t('Status') }}</h4>
        <div class="ipfp-grid">
          <!-- Current-year toggle: hidden when adding while one already exists -->
          <div v-if="props.year || !currentExists" class="form-field">
            <label>{{ t('Current Year') }}</label>
            <BaseToggle v-model="form.is_current" :yes-label="t('Yes')" :no-label="t('No')" />
          </div>
          <div class="form-field">
            <label>{{ t('Active') }}</label>
            <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
          </div>
          <div class="form-field ipf-field--full">
            <label>{{ t('Remarks') }}</label>
            <textarea v-model="form.remarks" rows="2" :placeholder="t('Optional notes about this academic year')" />
          </div>
        </div>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('Cancel') }}
      </button>
      <button type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-floppy-disk" />
        {{ props.year ? t('Update Year') : t('Save Year') }}
      </button>
    </div>
  </div>
</template>
