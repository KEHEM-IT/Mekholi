<script setup lang="ts">
// Form modal to configure class seat intake capacity and quotas.
// Fully validates that the sum of all quota percentages must equal exactly 100%!
import { computed, reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import type { ClassItem } from '@/composables/Institute_Setup/useClassesSetup'

const props = defineProps<{
  classItem: ClassItem
}>()

const emit = defineEmits<{
  save: [item: ClassItem]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<ClassItem>({
  ...props.classItem,
})

// Initialize defaults if null/undefined
if (form.intake_capacity == null) form.intake_capacity = 40
if (form.quota_general == null) form.quota_general = 80
if (form.quota_freedom_fighter == null) form.quota_freedom_fighter = 10
if (form.quota_disabled == null) form.quota_disabled = 5
if (form.quota_staff == null) form.quota_staff = 5

// Computed sum of all quota percentages
const totalPercentage = computed(() => {
  return (
    Number(form.quota_general || 0) +
    Number(form.quota_freedom_fighter || 0) +
    Number(form.quota_disabled || 0) +
    Number(form.quota_staff || 0)
  )
})

const isSumValid = computed(() => totalPercentage.value === 100)

function validate(): boolean {
  if (form.intake_capacity == null || form.intake_capacity <= 0) {
    toast.error(t('Intake capacity must be greater than zero'))
    return false
  }
  if (!isSumValid.value) {
    toast.error(t('Total quota allocation percentage must sum up to exactly 100%'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  emit('save', JSON.parse(JSON.stringify(form)) as ClassItem)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Section 1: Seat Capacity -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-chair" />
          {{ t('Intake Seat Capacity') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Class Level') }}</label>
            <input :value="form.class_name" type="text" disabled class="is-disabled" />
          </div>
          <div class="form-field">
            <label>{{ t('Total Available Seats') }} *</label>
            <input v-model.number="form.intake_capacity" type="number" min="1" :placeholder="t('e.g. 40')" />
          </div>
        </div>
      </div>

      <!-- Section 2: Quota Distribution -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-sliders" />
          {{ t('Government & Institutional Quotas (%)') }} *
        </h4>
        <p class="fb-section-subtitle">
          {{ t('Define the intake percentage allocation for each quota. The sum of all quotas must equal exactly 100%.') }}
        </p>

        <div class="ipf-grid">
          <div class="form-field">
            <label>{{ t('General Merit Quota (%)') }}</label>
            <input v-model.number="form.quota_general" type="number" min="0" max="100" />
          </div>
          <div class="form-field">
            <label>{{ t('Freedom Fighter Quota (%)') }}</label>
            <input v-model.number="form.quota_freedom_fighter" type="number" min="0" max="100" />
          </div>
          <div class="form-field">
            <label>{{ t('Disabled / Special Needs (%)') }}</label>
            <input v-model.number="form.quota_disabled" type="number" min="0" max="100" />
          </div>
          <div class="form-field">
            <label>{{ t('Staff Sibling Quota (%)') }}</label>
            <input v-model.number="form.quota_staff" type="number" min="0" max="100" />
          </div>
        </div>

        <!-- Real-time Quota Percentage Sum Indicator -->
        <div class="quota-sum-card">
          <span class="quota-sum-card__label">{{ t('Cumulative Allocation:') }}</span>
          <span class="quota-sum-card__value" :class="{ 'is-error': !isSumValid }">
            {{ totalPercentage }}% <span v-if="isSumValid">✓</span> <span v-else>✕</span>
          </span>
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
        {{ t('Save Seat Allocations') }}
      </button>
    </div>
  </div>
</template>
