<script setup lang="ts">
// Add / edit modal for an Admission Application — lets administrators review
// applications, log exam marks (written & viva), and update review statuses.
import { computed, reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'
import countriesJson from '@/assets/jsons/countries.json'
import { emptyApplication, type AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'

const props = defineProps<{
  application: AdmissionApplication | null
  years: { id?: number; year_name: string }[]
}>()

const emit = defineEmits<{
  save: [app: AdmissionApplication]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<AdmissionApplication>({
  ...emptyApplication(),
  ...(props.application ? (JSON.parse(JSON.stringify(props.application)) as Partial<AdmissionApplication>) : {}),
})

// Ensure default academic year if adding and years are loaded
if (!form.id && props.years.length > 0 && !form.academic_year_id) {
  form.academic_year_id = Number(props.years[0].id)
}

// ── Option Lists ────────────────────────────────────────────────────────

const yearOptions = computed(() =>
  props.years.map((y) => ({
    Id: Number(y.id),
    LookupText: String(y.year_name),
    DisplayText: String(y.year_name),
  })),
)

const classOptions = computed(() =>
  (classNamesJson as { Id: number; Name: string; NameInBangla: string; Phase: string; SortOrder: number }[]).map((c) => ({
    Id: String(c.Name),
    LookupText: `${c.Name} - ${c.NameInBangla}`,
    DisplayText: `${c.Name} - ${c.NameInBangla}`,
  })),
)

const countryOptions = computed(() =>
  countriesJson.map((c) => ({
    Id: c.name,
    LookupText: c.name,
    DisplayText: c.name,
  })),
)

const VERSION_PRESETS = [
  { Id: 'Bangla Version', bn: 'বাংলা ভার্সন' },
  { Id: 'English Version', bn: 'ইংলিশ ভার্সন' },
  { Id: 'Cambridge (O/A-Level)', bn: 'ক্যামব্রিজ (ও/এ-লেভেল)' },
  { Id: 'Edexcel', bn: 'এডেক্সেল' },
  { Id: 'IB (International Baccalaureate)', bn: 'আইবি কারিকুলাম' },
]
const versionOptions = computed(() =>
  VERSION_PRESETS.map((v) => ({
    Id: v.Id,
    LookupText: `${v.Id} - ${v.bn}`,
    DisplayText: `${v.Id} - ${v.bn}`,
  })),
)

const SHIFT_PRESETS = [
  { Id: 'Morning', bn: 'প্রভাতি শিফট' },
  { Id: 'Day', bn: 'দিবা শিফট' },
  { Id: 'Evening', bn: 'সান্ধ্যকালীন শিফট' },
]
const shiftOptions = computed(() =>
  SHIFT_PRESETS.map((s) => ({
    Id: s.Id,
    LookupText: `${s.Id} - ${s.bn}`,
    DisplayText: `${s.Id} - ${s.bn}`,
  })),
)

const PAYMENT_STATUS_PRESETS = [
  { Id: 'Pending', bn: 'পেন্ডিং' },
  { Id: 'Paid', bn: 'পরিশোধিত' },
  { Id: 'Failed', bn: 'ব্যর্থ' },
]
const paymentStatusOptions = computed(() =>
  PAYMENT_STATUS_PRESETS.map((p) => ({
    Id: p.Id,
    LookupText: `${p.Id} — ${p.bn}`,
    DisplayText: `${p.Id} — ${p.bn}`,
  })),
)

const PAYMENT_METHOD_PRESETS = [
  { Id: 'bKash', bn: 'বিকাশ' },
  { Id: 'Nagad', bn: 'নগদ' },
  { Id: 'Rocket', bn: 'রকেট' },
  { Id: 'SSLCommerz', bn: 'এসএসএল কমার্স' },
]
const paymentMethodOptions = computed(() =>
  PAYMENT_METHOD_PRESETS.map((p) => ({
    Id: p.Id,
    LookupText: `${p.Id} — ${p.bn}`,
    DisplayText: `${p.Id} — ${p.bn}`,
  })),
)

const APP_STATUS_PRESETS = [
  { Id: 'Submitted', bn: 'জমা দেওয়া হয়েছে' },
  { Id: 'Screening', bn: 'যাচাই-বাছাই চলছে' },
  { Id: 'Selected', bn: 'নির্বাচিত' },
  { Id: 'Rejected', bn: 'বাতিল' },
  { Id: 'Archived', bn: 'আর্কাইভকৃত' },
]
const appStatusOptions = computed(() =>
  APP_STATUS_PRESETS.map((s) => ({
    Id: s.Id,
    LookupText: `${s.Id} — ${s.bn}`,
    DisplayText: `${s.Id} — ${s.bn}`,
  })),
)

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (!form.candidate_name.trim()) {
    toast.error(t('Candidate name is required'))
    return false
  }
  if (!form.guardian_name.trim()) {
    toast.error(t('Guardian name is required'))
    return false
  }
  if (!form.phone.trim()) {
    toast.error(t('Contact phone is required'))
    return false
  }

  const isBD = form.country.trim().toLowerCase() === 'bangladesh' || form.country.trim() === 'বাংলাদেশ'
  if (isBD) {
    const rawDigits = form.phone.replace(/\D/g, '')
    if (rawDigits.length === 11 && rawDigits.startsWith('01')) {
      form.phone = rawDigits
    } else {
      toast.error(t('Bangladesh mobile number must be exactly 11 digits starting with 01'))
      return false
    }
  }

  if (!form.desired_class) {
    toast.error(t('Desired class is required'))
    return false
  }
  if (!form.academic_year_id) {
    toast.error(t('Academic year is required'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  emit('save', JSON.parse(JSON.stringify(form)) as AdmissionApplication)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Section 1: Candidate Basic Information -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-user-graduate" />
          {{ t('Candidate & Guardian Information') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Application No') }} *</label>
            <input
              v-model="form.application_no"
              type="text"
              :disabled="Boolean(form.id)"
              :placeholder="t('Leave empty for auto-generation')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Academic Intake Year') }} *</label>
            <BaseCombobox
              v-model="form.academic_year_id"
              :options="yearOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select year')"
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Candidate Name (English)') }} *</label>
            <input v-model="form.candidate_name" type="text" :placeholder="t('Enter full name in English')" />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Candidate Name (Bangla)') }}</label>
            <input v-model="form.candidate_name_bn" type="text" :placeholder="t('বাংলায় পুরো নাম লিখুন')" />
          </div>
          <div class="form-field">
            <label>{{ t('Guardian Name') }} *</label>
            <input v-model="form.guardian_name" type="text" :placeholder="t('Parent or legal guardian name')" />
          </div>
          <div class="form-field">
            <label>{{ t('Contact Phone') }} *</label>
            <input v-model="form.phone" type="tel" :placeholder="t('e.g. 017XXXXXXXX')" />
          </div>
          <div class="form-field">
            <label>{{ t('Email Address') }}</label>
            <input v-model="form.email" type="email" :placeholder="t('e.g. parent@example.com')" />
          </div>
          <div class="form-field">
            <label>{{ t('Previous School') }}</label>
            <input v-model="form.previous_school" type="text" :placeholder="t('Name of previous institution')" />
          </div>
        </div>
      </div>

      <!-- Section 2: Placement Details -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-school" />
          {{ t('Placement Preferences') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Desired Class') }} *</label>
            <BaseCombobox
              v-model="form.desired_class"
              :options="classOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select class')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Desired Version') }}</label>
            <BaseCombobox
              v-model="form.version"
              :options="versionOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select version')"
              clearable
            />
          </div>
          <div class="form-field">
            <label>{{ t('Preferred Shift') }}</label>
            <BaseCombobox
              v-model="form.shift"
              :options="shiftOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select shift')"
              clearable
            />
          </div>
          <div class="form-field">
            <label>{{ t('Country of Residence') }}</label>
            <BaseCombobox
              v-model="form.country"
              :options="countryOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select country')"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Payment Tracking -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-money-check-dollar" />
          {{ t('Application Processing Fee Payment') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Payment Status') }}</label>
            <BaseCombobox
              v-model="form.payment_status"
              :options="paymentStatusOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select status')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Payment Method') }}</label>
            <BaseCombobox
              v-model="form.payment_method"
              :options="paymentMethodOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select method')"
              clearable
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Payment Transaction ID') }}</label>
            <input v-model="form.payment_transaction_id" type="text" :placeholder="t('e.g. TRX928172')" />
          </div>
        </div>
      </div>

      <!-- Section 4: Admissions Review & Scores -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-clipboard-check" />
          {{ t('Admissions Screening & Results') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Written Exam Score') }}</label>
            <input v-model.number="form.written_marks" type="number" step="0.5" min="0" :placeholder="t('e.g. 85')" />
          </div>
          <div class="form-field">
            <label>{{ t('VIVA Voce Score') }}</label>
            <input v-model.number="form.viva_marks" type="number" step="0.5" min="0" :placeholder="t('e.g. 15')" />
          </div>
          <div class="form-field">
            <label>{{ t('Application Review Status') }}</label>
            <BaseCombobox
              v-model="form.application_status"
              :options="appStatusOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select status')"
            />
          </div>
          <div class="form-field ipf-field--full">
            <label>{{ t('Admissions Committee Notes') }}</label>
            <textarea
              v-model="form.remarks"
              rows="3"
              class="ipfp-remarks"
              :placeholder="t('Enter internal notes, screening feedback, or verification remarks...')"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('Cancel') }}
      </button>
      <button type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-floppy-disk" />
        {{ props.application ? t('Update Application') : t('Create Application') }}
      </button>
    </div>
  </div>
</template>
