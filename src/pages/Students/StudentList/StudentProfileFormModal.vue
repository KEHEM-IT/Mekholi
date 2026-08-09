<script setup lang="ts">
// Form modal to create or update student profiles, supporting standard
// biographics, class assignments, and government unique ID sync logs.
import { computed, reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import classNamesJson from '@/assets/jsons/class_names.json'
import gendersJson from '@/assets/jsons/genders.json'
import { emptyStudent, type Student } from '@/composables/Students/useStudents'

const props = defineProps<{
  student: Student | null
  years: { id?: number; year_name: string }[]
}>()

const emit = defineEmits<{
  save: [item: Student]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<Student>({
  ...emptyStudent(),
  ...(props.student ? (JSON.parse(JSON.stringify(props.student)) as Partial<Student>) : {}),
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

const genderOptions = computed(() =>
  (gendersJson as { Id: number; LookupText: string }[]).map((g) => ({
    Id: String(g.Id),
    LookupText: g.LookupText,
    DisplayText: g.LookupText,
  })),
)

const bloodOptions = [
  { Id: 'A+', LookupText: 'A+' },
  { Id: 'A-', LookupText: 'A-' },
  { Id: 'B+', LookupText: 'B+' },
  { Id: 'B-', LookupText: 'B-' },
  { Id: 'AB+', LookupText: 'AB+' },
  { Id: 'AB-', LookupText: 'AB-' },
  { Id: 'O+', LookupText: 'O+' },
  { Id: 'O-', LookupText: 'O-' },
]

const religionOptions = [
  { Id: 'Islam', LookupText: 'Islam — ইসলাম' },
  { Id: 'Hinduism', LookupText: 'Hinduism — হিন্দু ধর্ম' },
  { Id: 'Buddhism', LookupText: 'Buddhism — বৌদ্ধ ধর্ম' },
  { Id: 'Christianity', LookupText: 'Christianity — খ্রিস্ট ধর্ম' },
]

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (!form.candidate_name.trim()) {
    toast.error(t('Student name is required'))
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

  // Bangladesh 11-digit mobile validation
  const rawDigits = form.phone.replace(/\D/g, '')
  if (rawDigits.length === 11 && rawDigits.startsWith('01')) {
    form.phone = rawDigits
  } else {
    toast.error(t('Bangladesh mobile number must be exactly 11 digits starting with 01'))
    return false
  }

  if (!form.class_name) {
    toast.error(t('Class name is required'))
    return false
  }
  if (form.roll_no === null || form.roll_no <= 0) {
    toast.error(t('Roll number must be greater than zero'))
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
  emit('save', JSON.parse(JSON.stringify(form)) as Student)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Section 1: Basic Identity -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-user-graduate" />
          {{ t('Student Identity & Contact') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Student ID') }} *</label>
            <input
              v-model="form.student_id"
              type="text"
              :disabled="Boolean(form.id)"
              :placeholder="t('Leave empty for auto-generation')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Academic Year') }} *</label>
            <BaseCombobox
              v-model="form.academic_year_id"
              :options="yearOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select year')"
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Student Name (English)') }} *</label>
            <input v-model="form.candidate_name" type="text" :placeholder="t('Enter full name in English')" />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Student Name (Bangla)') }}</label>
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
        </div>
      </div>

      <!-- Section 2: Class Placement & Roll -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-school" />
          {{ t('Class Placement') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Class Level') }} *</label>
            <BaseCombobox
              v-model="form.class_name"
              :options="classOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select class')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Section') }} *</label>
            <input v-model="form.section_name" type="text" :placeholder="t('e.g. A, B')" />
          </div>
          <div class="form-field">
            <label>{{ t('Roll No') }} *</label>
            <input v-model.number="form.roll_no" type="number" min="1" :placeholder="t('e.g. 7')" />
          </div>
        </div>
      </div>

      <!-- Section 3: Demographic Info -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-cake-candles" />
          {{ t('Demographics & Background') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Gender') }}</label>
            <BaseCombobox
              v-model="form.gender"
              :options="genderOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select gender')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Date of Birth') }}</label>
            <BaseDatePicker v-model="form.date_of_birth" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Blood Group') }}</label>
            <BaseCombobox
              v-model="form.blood_group"
              :options="bloodOptions"
              option-value="Id"
              option-label="LookupText"
              :placeholder="t('Select blood group')"
              clearable
            />
          </div>
          <div class="form-field">
            <label>{{ t('Religion') }}</label>
            <BaseCombobox
              v-model="form.religion"
              :options="religionOptions"
              option-value="Id"
              option-label="LookupText"
              :placeholder="t('Select religion')"
            />
          </div>
        </div>
      </div>

      <!-- Section 4: Government Unique ID (CRVS) -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-fingerprint" />
          {{ t('Government Unique ID (UID) Sync') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field ipf-field--span2">
            <label>{{ t('Government 17-digit UID') }}</label>
            <input v-model="form.government_uid" type="text" maxlength="17" :placeholder="t('e.g. 20158219381029381')" />
            <small class="form-hint">{{ t('Mandatory 17-digit government assigned CRVS unique ID.') }}</small>
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
        {{ props.student ? t('Update Profile') : t('Create Profile') }}
      </button>
    </div>
  </div>
</template>
