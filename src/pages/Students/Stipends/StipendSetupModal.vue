<script setup lang="ts">
// Form modal to configure a student's stipend eligibility, verified MFS payment gateways,
// and advanced conditional scholarship structures.
import { reactive, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import type { Student } from '@/composables/Students/useStudents'

const props = defineProps<{
  student: Student
}>()

const emit = defineEmits<{
  save: [item: Student]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<Student>({
  ...props.student,
})

const mfsOptions = [
  { Id: 'bKash', LookupText: 'bKash — বিকাশ' },
  { Id: 'Nagad', LookupText: 'Nagad — নগদ' },
  { Id: 'Rocket', LookupText: 'Rocket — রকেট' },
  { Id: 'Upay', LookupText: 'Upay — উপায়' },
  { Id: 'CellFin', LookupText: 'CellFin — সেলফিন' },
]

const stipendTypeOptions = [
  { Id: 'PESP', LookupText: 'PESP — Primary Education Stipend' },
  { Id: 'SEIP', LookupText: 'SEIP — Secondary Education Investment' },
  { Id: 'Govt_Merit', LookupText: 'Govt. Board Merit Scholarship' },
  { Id: 'Govt_General', LookupText: 'Govt. Board General Scholarship' },
  { Id: 'Internal_Waiver', LookupText: 'Internal Tuition Waiver (Free)' },
  { Id: 'Corporate_Sponsor', LookupText: 'NGO / Corporate Sponsor Scholarship' },
]

const frequencyOptions = [
  { Id: 'Monthly', LookupText: 'Monthly — মাসিক' },
  { Id: 'Quarterly', LookupText: 'Quarterly — ত্রৈমাসিক' },
  { Id: 'Half-Yearly', LookupText: 'Half-Yearly — অর্ধবার্ষিক' },
  { Id: 'Annually', LookupText: 'Annually — বার্ষিক' },
]

const statusOptions = [
  { Id: 'Active', LookupText: 'Active — সক্রিয়' },
  { Id: 'Suspended', LookupText: 'Suspended (Low Attendance/Poor Grade)' },
  { Id: 'Terminated', LookupText: 'Terminated / Expired' },
]

const criteriaOptions = [
  { Id: 'General_Merit', LookupText: 'General Merit — সাধারণ মেধা' },
  { Id: 'Low_Income', LookupText: 'Low Income — দরিদ্র পরিবার' },
  { Id: 'Freedom_Fighter', LookupText: 'Freedom Fighter Quota — মুক্তিযোদ্ধা কোটা' },
  { Id: 'Disabled_Quota', LookupText: 'Disabled Quota — প্রতিবন্ধী কোটা' },
  { Id: 'Orphan_Tribal', LookupText: 'Orphan / Tribal Quota — এতিম ও উপজাতি কোটা' },
]

// Automatically clear MFS details and advanced configurations if not eligible
watch(
  () => form.stipend_eligible,
  (eligible) => {
    if (!eligible) {
      form.stipend_mfs_provider = ''
      form.stipend_mfs_number = ''
      form.stipend_type = ''
      form.stipend_amount = 0
      form.stipend_frequency = 'Quarterly'
      form.stipend_status = 'Active'
      form.stipend_criteria = 'General'
    }
  },
)

function validate(): boolean {
  if (form.stipend_eligible) {
    if (!form.stipend_type) {
      toast.error(t('Please select a Scholarship/Stipend Type'))
      return false
    }
    if (form.stipend_amount === undefined || form.stipend_amount === null || form.stipend_amount < 0) {
      toast.error(t('Disbursement amount must be greater than or equal to zero'))
      return false
    }
    if (!form.stipend_mfs_provider) {
      toast.error(t('Please select an MFS Provider for eligible recipients'))
      return false
    }
    if (!form.stipend_mfs_number || !form.stipend_mfs_number.trim()) {
      toast.error(t('MFS payment mobile number is required'))
      return false
    }
    // Bangladesh mobile format validation
    const rawDigits = form.stipend_mfs_number.replace(/\D/g, '')
    if (rawDigits.length === 11 && rawDigits.startsWith('01')) {
      form.stipend_mfs_number = rawDigits
    } else {
      toast.error(t('MFS mobile number must be exactly 11 digits starting with 01'))
      return false
    }
  }
  return true
}

function submit() {
  if (!validate()) return
  emit('save', JSON.parse(JSON.stringify(form)) as Student)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Section 1: Candidate Read-only Info -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-user-graduate" />
          {{ t('Student Identity') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Student Name') }}</label>
            <input :value="form.candidate_name" type="text" disabled class="is-disabled" />
          </div>
          <div class="form-field">
            <label>{{ t('Student ID') }}</label>
            <input :value="form.student_id" type="text" disabled class="is-disabled" />
          </div>
          <div class="form-field">
            <label>{{ t('Class Level') }}</label>
            <input :value="form.class_name" type="text" disabled class="is-disabled" />
          </div>
          <div class="form-field">
            <label>{{ t('Roll No') }}</label>
            <input :value="form.roll_no" type="text" disabled class="is-disabled" />
          </div>
        </div>
      </div>

      <!-- Section 2: Advanced Stipend Type & Valuation -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-coins" />
          {{ t('Scholarship Scheme & Financial Allocation') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Stipend Recipient Eligible') }}</label>
            <BaseToggle v-model="form.stipend_eligible" :yes-label="t('Yes')" :no-label="t('No')" />
          </div>

          <div class="form-field" :class="{ 'is-disabled-opacity': !form.stipend_eligible }">
            <label>{{ t('Scholarship/Stipend Type') }} *</label>
            <BaseCombobox
              v-model="form.stipend_type"
              :options="stipendTypeOptions"
              option-value="Id"
              option-label="LookupText"
              :placeholder="t('Select type')"
              :disabled="!form.stipend_eligible"
            />
          </div>

          <div class="form-field" :class="{ 'is-disabled-opacity': !form.stipend_eligible }">
            <label>{{ t('Disbursement Amount (BDT)') }} *</label>
            <input
              v-model.number="form.stipend_amount"
              type="number"
              min="0"
              :disabled="!form.stipend_eligible"
              :placeholder="t('e.g. 1500')"
            />
          </div>

          <div class="form-field" :class="{ 'is-disabled-opacity': !form.stipend_eligible }">
            <label>{{ t('Payment Frequency') }}</label>
            <BaseCombobox
              v-model="form.stipend_frequency"
              :options="frequencyOptions"
              option-value="Id"
              option-label="LookupText"
              :placeholder="t('Select frequency')"
              :disabled="!form.stipend_eligible"
            />
          </div>

          <div class="form-field" :class="{ 'is-disabled-opacity': !form.stipend_eligible }">
            <label>{{ t('Qualification Criteria') }}</label>
            <BaseCombobox
              v-model="form.stipend_criteria"
              :options="criteriaOptions"
              option-value="Id"
              option-label="LookupText"
              :placeholder="t('Select criteria')"
              :disabled="!form.stipend_eligible"
            />
          </div>

          <div class="form-field" :class="{ 'is-disabled-opacity': !form.stipend_eligible }">
            <label>{{ t('Stipend Active Status') }}</label>
            <BaseCombobox
              v-model="form.stipend_status"
              :options="statusOptions"
              option-value="Id"
              option-label="LookupText"
              :placeholder="t('Select status')"
              :disabled="!form.stipend_eligible"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: MFS Gateway Portal -->
      <div v-if="form.stipend_eligible" class="ipfp-section animate-fade-in">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-mobile-screen" />
          {{ t('MFS Mobile Banking Portal') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('MFS Payment Provider') }} *</label>
            <BaseCombobox
              v-model="form.stipend_mfs_provider"
              :options="mfsOptions"
              option-value="Id"
              option-label="LookupText"
              :placeholder="t('Select provider')"
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Verified Parent MFS Mobile Number') }} *</label>
            <input
              v-model="form.stipend_mfs_number"
              type="tel"
              :placeholder="t('e.g. 017XXXXXXXX')"
            />
            <small class="form-hint">{{ t('All disbursements are routed directly to this verified mobile MFS account.') }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Footer -->
    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('Cancel') }}
      </button>
      <button type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-floppy-disk" />
        {{ t('Save Stipend Setup') }}
      </button>
    </div>
  </div>
</template>
