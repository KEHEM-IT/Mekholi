<script setup lang="ts">
// Verification Modal — allows administrators to audit and verify digital and physical
// document submissions, toggle checklist states, and record verification status.
import { reactive, watch } from 'vue'
import { useTranslator } from '@/Translator'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import type { AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'

const props = defineProps<{
  application: AdmissionApplication
}>()

const emit = defineEmits<{
  save: [app: AdmissionApplication]
  close: []
}>()

const { t } = useTranslator()

const form = reactive<AdmissionApplication>({
  ...props.application,
  // Ensure verification_checklist is initialized
  verification_checklist: props.application.verification_checklist && typeof props.application.verification_checklist === 'object'
    ? { ...props.application.verification_checklist }
    : { photo: false, birth_certificate: false, transcript: false, tc: false },
})

// Ensure default fields inside checklist
if (form.verification_checklist.photo === undefined) form.verification_checklist.photo = false
if (form.verification_checklist.birth_certificate === undefined) form.verification_checklist.birth_certificate = false
if (form.verification_checklist.transcript === undefined) form.verification_checklist.transcript = false
if (form.verification_checklist.tc === undefined) form.verification_checklist.tc = false

const statusOptions = [
  { Id: 'Unverified', LookupText: 'Unverified — Documents pending audit', DisplayText: 'Unverified' },
  { Id: 'Partially Verified', LookupText: 'Partially Verified — Some documents cleared', DisplayText: 'Partially Verified' },
  { Id: 'Verified', LookupText: 'Fully Verified — All documents cleared', DisplayText: 'Fully Verified' },
]

// Auto-evaluate verification status when checkboxes change
watch(
  () => form.verification_checklist,
  (checklist) => {
    const vals = Object.values(checklist)
    const checkedCount = vals.filter(Boolean).length
    if (checkedCount === vals.length) {
      form.verification_status = 'Verified'
    } else if (checkedCount > 0) {
      form.verification_status = 'Partially Verified'
    } else {
      form.verification_status = 'Unverified'
    }
  },
  { deep: true },
)

function submit() {
  emit('save', JSON.parse(JSON.stringify(form)) as AdmissionApplication)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Section 1: Candidate Read-only Info -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-user-graduate" />
          {{ t('Applicant Identity') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Candidate Name') }}</label>
            <input :value="form.candidate_name" type="text" disabled class="is-disabled" />
          </div>
          <div class="form-field">
            <label>{{ t('Application No') }}</label>
            <input :value="form.application_no" type="text" disabled class="is-disabled" />
          </div>
          <div class="form-field">
            <label>{{ t('Desired Class') }}</label>
            <input :value="form.desired_class" type="text" disabled class="is-disabled" />
          </div>
          <div class="form-field">
            <label>{{ t('Contact Phone') }}</label>
            <input :value="form.phone" type="text" disabled class="is-disabled" />
          </div>
        </div>
      </div>

      <!-- Section 2: Verification Checklist -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-file-circle-check" />
          {{ t('Mandatory Documents Checklist') }}
        </h4>
        <p class="fb-section-subtitle">
          {{ t('Audit and verify each mandatory document below. Check file attachments where available.') }}
        </p>

        <div class="verify-checklist">
          <!-- Photo -->
          <div class="verify-checklist-item">
            <div class="verify-checklist-item__label">
              <i class="fa-duotone fa-image" />
              <span>{{ t('Applicant Passport Photo') }}</span>
            </div>
            <div class="verify-checklist-item__actions">
              <a
                v-if="form.photo"
                :href="form.photo"
                target="_blank"
                class="verify-checklist-item__view-btn"
              >
                <i class="fa-duotone fa-eye" /> {{ t('View File') }}
              </a>
              <BaseToggle v-model="form.verification_checklist.photo" />
            </div>
          </div>

          <!-- Birth Certificate -->
          <div class="verify-checklist-item">
            <div class="verify-checklist-item__label">
              <i class="fa-duotone fa-file-invoice" />
              <span>{{ t('Birth Certificate Scan') }}</span>
            </div>
            <div class="verify-checklist-item__actions">
              <a
                v-if="form.birth_certificate"
                :href="form.birth_certificate"
                target="_blank"
                class="verify-checklist-item__view-btn"
              >
                <i class="fa-duotone fa-eye" /> {{ t('View File') }}
              </a>
              <BaseToggle v-model="form.verification_checklist.birth_certificate" />
            </div>
          </div>

          <!-- Academic Transcript -->
          <div class="verify-checklist-item">
            <div class="verify-checklist-item__label">
              <i class="fa-duotone fa-file-chart-column" />
              <span>{{ t('Previous Academic Transcript / Marksheet') }}</span>
            </div>
            <div class="verify-checklist-item__actions">
              <BaseToggle v-model="form.verification_checklist.transcript" />
            </div>
          </div>

          <!-- TC -->
          <div class="verify-checklist-item">
            <div class="verify-checklist-item__label">
              <i class="fa-duotone fa-certificate" />
              <span>{{ t('Transfer Certificate (TC)') }}</span>
            </div>
            <div class="verify-checklist-item__actions">
              <BaseToggle v-model="form.verification_checklist.tc" />
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Verification Status & Remarks -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-clipboard-check" />
          {{ t('Auditor Approvals & Sign-off') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field ipf-field--span2">
            <label>{{ t('Verification Audit Status') }}</label>
            <BaseCombobox
              v-model="form.verification_status"
              :options="statusOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select status')"
            />
          </div>
          <div class="form-field ipf-field--full">
            <label>{{ t('Internal Auditor Notes / remarks') }}</label>
            <textarea
              v-model="form.remarks"
              rows="3"
              class="ipfp-remarks"
              :placeholder="t('Log detailed audit comments, missing document followups, or verification timestamps...')"
            />
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
        {{ t('Save Verification Audit') }}
      </button>
    </div>
  </div>
</template>
