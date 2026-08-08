<script setup lang="ts">
// Add / edit modal for an Admission Test schedule — lets administrators create or
// update written/viva exam schedules, and map them to physical classrooms.
import { computed, onMounted, reactive, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseTimePicker from '@/components/ui/BaseTimePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import classNamesJson from '@/assets/jsons/class_names.json'
import { emptyTest, type AdmissionTest } from '@/composables/Admission/useAdmissionTests'
import { fetchItems, type Room } from '@/composables/Institute_Setup/useRoomsBuildings'

const props = defineProps<{
  test: AdmissionTest | null
  years: { id?: number; year_name: string }[]
}>()

const emit = defineEmits<{
  save: [test: AdmissionTest]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<AdmissionTest>({
  ...emptyTest(),
  ...(props.test ? (JSON.parse(JSON.stringify(props.test)) as Partial<AdmissionTest>) : {}),
})

// Ensure default academic year if adding and years are loaded
if (!form.id && props.years.length > 0 && !form.academic_year_id) {
  form.academic_year_id = Number(props.years[0].id)
}

const rooms = ref<Room[]>([])

onMounted(async () => {
  // Fetch physical classrooms from DB
  const rawRooms = await fetchItems('rooms')
  rooms.value = rawRooms as Room[]
})

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

const roomOptions = computed(() =>
  rooms.value.map((r) => ({
    Id: Number(r.id),
    LookupText: r.room_no_bn ? `Room ${r.room_no} (${r.room_no_bn})` : `Room ${r.room_no}`,
    DisplayText: r.room_no_bn ? `Room ${r.room_no} (${r.room_no_bn})` : `Room ${r.room_no}`,
  })),
)

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (!form.test_name.trim()) {
    toast.error(t('Test name is required'))
    return false
  }
  if (!form.class_name) {
    toast.error(t('Desired class is required'))
    return false
  }
  if (!form.academic_year_id) {
    toast.error(t('Academic year is required'))
    return false
  }
  if (!form.test_date) {
    toast.error(t('Test date is required'))
    return false
  }
  if (!form.start_time) {
    toast.error(t('Start time is required'))
    return false
  }
  if (form.end_time && form.end_time < form.start_time) {
    toast.error(t('End time must be after start time'))
    return false
  }
  if (!form.has_written && !form.has_mcq && !form.has_viva) {
    toast.error(t('Please select at least one exam parameter (Written, MCQ, or VIVA)'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  emit('save', JSON.parse(JSON.stringify(form)) as AdmissionTest)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Section 1: Basic Schedule Info -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-calendar-clock" />
          {{ t('Test Information & Schedule') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field ipf-field--span2">
            <label>{{ t('Test Name (English)') }} *</label>
            <input v-model="form.test_name" type="text" :placeholder="t('e.g. Class 6 Intake Written Exam')" />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Test Name (Bangla)') }}</label>
            <input v-model="form.test_name_bn" type="text" :placeholder="t('যেমন: ৬ষ্ঠ শ্রেণি ভর্তি লিখিত পরীক্ষা')" />
          </div>
          <div class="form-field">
            <label>{{ t('Desired Class') }} *</label>
            <BaseCombobox
              v-model="form.class_name"
              :options="classOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select class')"
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
        </div>
      </div>

      <!-- Section 2: Logistics & Time -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-map-location-dot" />
          {{ t('Time & Location Preferences') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Test Date') }} *</label>
            <BaseDatePicker v-model="form.test_date" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Venue / Room') }}</label>
            <BaseCombobox
              v-model="form.room_id"
              :options="roomOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select room')"
              clearable
            />
          </div>
          <div class="form-field">
            <label>{{ t('Start Time') }} *</label>
            <BaseTimePicker v-model="form.start_time" :placeholder="t('HH:MM AM/PM')" />
          </div>
          <div class="form-field">
            <label>{{ t('End Time') }}</label>
            <BaseTimePicker v-model="form.end_time" :placeholder="t('HH:MM AM/PM')" />
          </div>
        </div>
      </div>

      <!-- Section 3: Grading & Marks Capping -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-ranking-star" />
          {{ t('Exam Parameters & Marks') }} *
        </h4>
        <p class="fb-section-subtitle">
          {{ t('Select which exam components are active (at least one) and define their maximum scores.') }}
        </p>
        
        <div class="ipf-toggle-grid">
          <!-- Written component -->
          <div class="ipf-toggle-row">
            <div class="ipf-toggle-row__label">
              <i class="fa-duotone fa-pen-nib" />
              <span>{{ t('Written Exam') }}</span>
            </div>
            <BaseToggle v-model="form.has_written" />
          </div>
          <!-- MCQ component -->
          <div class="ipf-toggle-row">
            <div class="ipf-toggle-row__label">
              <i class="fa-duotone fa-list-check" />
              <span>{{ t('MCQ Exam') }}</span>
            </div>
            <BaseToggle v-model="form.has_mcq" />
          </div>
          <!-- VIVA component -->
          <div class="ipf-toggle-row">
            <div class="ipf-toggle-row__label">
              <i class="fa-duotone fa-comments" />
              <span>{{ t('VIVA Interview') }}</span>
            </div>
            <BaseToggle v-model="form.has_viva" />
          </div>
        </div>

        <div class="ipf-grid fb-marks-grid">
          <div class="form-field" :class="{ 'is-disabled-opacity': !form.has_written }">
            <label>{{ t('Max Written Marks') }}</label>
            <input
              v-model.number="form.max_written_marks"
              type="number"
              min="0"
              :disabled="!form.has_written"
              :placeholder="t('e.g. 100')"
            />
          </div>
          <div class="form-field" :class="{ 'is-disabled-opacity': !form.has_mcq }">
            <label>{{ t('Max MCQ Marks') }}</label>
            <input
              v-model.number="form.max_mcq_marks"
              type="number"
              min="0"
              :disabled="!form.has_mcq"
              :placeholder="t('e.g. 100')"
            />
          </div>
          <div class="form-field" :class="{ 'is-disabled-opacity': !form.has_viva }">
            <label>{{ t('Max VIVA Marks') }}</label>
            <input
              v-model.number="form.max_viva_marks"
              type="number"
              min="0"
              :disabled="!form.has_viva"
              :placeholder="t('e.g. 50')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Schedule Active') }}</label>
            <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
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
        {{ props.test ? t('Update Test') : t('Create Test') }}
      </button>
    </div>
  </div>
</template>
