<script setup lang="ts">
// Add / edit modal for an Admission Enquiry — supports national (Bangladesh)
// and international structures with bilingually translated options.
import { computed, reactive, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import classNamesJson from '@/assets/jsons/class_names.json'
import countriesJson from '@/assets/jsons/countries.json'
import { emptyEnquiry, type AdmissionEnquiry } from '@/composables/Admission/useAdmissionEnquiries'

const props = defineProps<{
  enquiry: AdmissionEnquiry | null
  years: { id?: number; year_name: string }[]
}>()

const emit = defineEmits<{
  save: [enquiry: AdmissionEnquiry]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<AdmissionEnquiry>({
  ...emptyEnquiry(),
  ...(props.enquiry ? (JSON.parse(JSON.stringify(props.enquiry)) as Partial<AdmissionEnquiry>) : {}),
})

// Ensure default academic year if adding and years are loaded
if (!form.id && props.years.length > 0 && !form.academic_year_id) {
  form.academic_year_id = Number(props.years[0].id)
}

// Local state for the date picker of Academic Intake Year
const intakeDate = ref('')

// Initialize intakeDate from existing academic_year_id
if (form.academic_year_id) {
  const yearObj = props.years.find(y => Number(y.id) === Number(form.academic_year_id))
  if (yearObj) {
    intakeDate.value = `${yearObj.year_name}-01-01`
  }
} else if (props.years.length > 0) {
  const defaultYear = props.years[0]
  intakeDate.value = `${defaultYear.year_name}-01-01`
  form.academic_year_id = Number(defaultYear.id)
}

// Watch intakeDate: when it changes, find the matching academic_year_id
watch(intakeDate, (newVal) => {
  if (!newVal) {
    form.academic_year_id = null
    return
  }
  const yearStr = newVal.split('-')[0] // Get "YYYY"
  const matched = props.years.find((y) => String(y.year_name) === yearStr)
  if (matched) {
    form.academic_year_id = Number(matched.id)
  } else {
    form.academic_year_id = null
  }
})

// ── Option Lists ────────────────────────────────────────────────────────



// Presets for desired classes (Bangla + English support)
const classOptions = computed(() =>
  (classNamesJson as { Id: number; Name: string; NameInBangla: string; Phase: string; SortOrder: number }[]).map((c) => ({
    Id: String(c.Name),
    LookupText: `${c.Name} - ${c.NameInBangla}`,
    DisplayText: `${c.Name} - ${c.NameInBangla}`,
  })),
)

// Country options loaded from countries.json
const countryOptions = computed(() =>
  countriesJson.map((c) => ({
    Id: c.name,
    LookupText: c.name,
    DisplayText: c.name,
  })),
)

// Version options including Cambridge curriculum
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

// Shift presets
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

// Enquiry sources
const SOURCE_PRESETS = [
  { Id: 'Walk-in', bn: 'সরাসরি অফিসে আগমন' },
  { Id: 'Phone Call', bn: 'ফোন কল' },
  { Id: 'Website', bn: 'ওয়েবসাইট আবেদন' },
  { Id: 'Social Media', bn: 'সোশ্যাল মিডিয়া (ফেসবুক)' },
  { Id: 'Reference', bn: 'রেফারেন্স / সুপারিশ' },
]
const sourceOptions = computed(() =>
  SOURCE_PRESETS.map((s) => ({
    Id: s.Id,
    LookupText: `${s.Id} - ${s.bn}`,
    DisplayText: `${s.Id} - ${s.bn}`,
  })),
)

// Status presets (Colored badges in main table)
const STATUS_PRESETS = [
  { Id: 'New', bn: 'নতুন আবেদন' },
  { Id: 'Follow-up', bn: 'ফলো-আপে রয়েছে' },
  { Id: 'Selected', bn: 'মনোনীত' },
  { Id: 'Converted', bn: 'ভর্তি সম্পন্ন' },
  { Id: 'Rejected', bn: 'বাতিলকৃত' },
]
const statusOptions = computed(() =>
  STATUS_PRESETS.map((s) => ({
    Id: s.Id,
    LookupText: `${s.Id} - ${s.bn}`,
    DisplayText: `${s.Id} - ${s.bn}`,
  })),
)

// Watch Country: auto-updates nationality when toggled between Bangladesh and others
watch(
  () => form.country,
  (newCountry) => {
    const c = newCountry.trim().toLowerCase()
    if (c === 'bangladesh' || c === 'বাংলাদেশ') {
      form.nationality = 'Bangladeshi'
    } else if (form.nationality === 'Bangladeshi') {
      form.nationality = '' // Reset so user enters foreign nationality
    }
  },
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
  
  // Bangladesh 11-digit mobile validation helper
  const isBD = form.country.trim().toLowerCase() === 'bangladesh' || form.country.trim() === 'বাংলাদেশ'
  if (isBD) {
    const rawDigits = form.phone.replace(/\D/g, '')
    // Match common BD format: 11 digits starting with 01
    if (rawDigits.length === 11 && rawDigits.startsWith('01')) {
      // Re-format clean
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
  if (!form.enquiry_date) {
    toast.error(t('Enquiry date is required'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  emit('save', JSON.parse(JSON.stringify(form)) as AdmissionEnquiry)
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
            <label>{{ t('Previous School / Board') }}</label>
            <input v-model="form.previous_school" type="text" :placeholder="t('Name of previous institution')" />
          </div>
        </div>
      </div>

      <!-- Section 2: Admissions Placement & Logistics -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-school" />
          {{ t('Intake & Preferences') }}
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
            <label>{{ t('Shift') }}</label>
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
            <label>{{ t('Academic Intake Year') }} *</label>
            <BaseDatePicker v-model="intakeDate" :placeholder="t('DD/MM/YYYY')" />
          </div>
        </div>
      </div>

      <!-- Section 3: National / International Origin -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-globe" />
          {{ t('Nationality & Residency') }}
        </h4>
        <div class="ipfp-grid">
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
          <div class="form-field">
            <label>{{ t('Nationality') }}</label>
            <input v-model="form.nationality" type="text" :placeholder="t('e.g. Bangladeshi')" />
          </div>
        </div>
      </div>

      <!-- Section 4: Enquiry Status & Counseling Records -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-clipboard-question" />
          {{ t('Enquiry Logs & Actions') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Enquiry Date') }} *</label>
            <BaseDatePicker v-model="form.enquiry_date" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Enquiry Source') }}</label>
            <BaseCombobox
              v-model="form.source"
              :options="sourceOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('e.g. Walk-in')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Enquiry Status') }}</label>
            <BaseCombobox
              v-model="form.status"
              :options="statusOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select status')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Is Active Enquiry') }}</label>
            <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
          </div>
          <div class="form-field ipf-field--full">
            <label>{{ t('Counseling / Remarks Notes') }}</label>
            <textarea
              v-model="form.remarks"
              rows="3"
              class="ipfp-remarks"
              :placeholder="t('Log parents query, followup times, or eligibility checks...')"
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
        {{ props.enquiry ? t('Update Enquiry') : t('Create Enquiry') }}
      </button>
    </div>
  </div>
</template>
