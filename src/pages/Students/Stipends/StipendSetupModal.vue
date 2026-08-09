<script setup lang="ts">
// Form modal to configure a student's stipend eligibility and verified MFS payment gateways.
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
]

// Automatically clear MFS details if not eligible
watch(
  () => form.stipend_eligible,
  (eligible) => {
    if (!eligible) {
      form.stipend_mfs_provider = ''
      form.stipend_mfs_number = ''
    }
  },
)

function validate(): boolean {
  if (form.stipend_eligible) {
    if (!form.stipend_mfs_provider) {
      toast.error(t('Please select an MFS Provider for eligible recipients'))
      return false
    }
    if (!form.stipend_mfs_number.trim()) {
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

      <!-- Section 2: Eligibility & MFS Portal -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-hand-holding-dollar" />
          {{ t('PESP / SEIP Stipend Configurations') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Stipend Recipient Eligible') }}</label>
            <BaseToggle v-model="form.stipend_eligible" :yes-label="t('Yes')" :no-label="t('No')" />
          </div>
          <div class="form-field" :class="{ 'is-disabled-opacity': !form.stipend_eligible }">
            <label>{{ t('MFS Payment Provider') }}</label>
            <BaseCombobox
              v-model="form.stipend_mfs_provider"
              :options="mfsOptions"
              option-value="Id"
              option-label="LookupText"
              :placeholder="t('Select provider')"
              :disabled="!form.stipend_eligible"
            />
          </div>
          <div class="form-field ipf-field--span2" :class="{ 'is-disabled-opacity': !form.stipend_eligible }">
            <label>{{ t('Verified Parent MFS Mobile Number') }}</label>
            <input
              v-model="form.stipend_mfs_number"
              type="tel"
              :disabled="!form.stipend_eligible"
              :placeholder="t('e.g. 017XXXXXXXX')"
            />
            <small class="form-hint">{{ t('Disbursed stipends are routed directly to this verified mobile account.') }}</small>
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
