<script setup lang="ts">
// Add / edit modal for an Academic Session Term — comboboxes for session
// name, academic year, term name + dates + toggles.
import { computed, reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import resultTypesJson from '@/assets/jsons/result_types.json'
import {
  emptySession,
  type AcademicSessionTerm,
} from '@/composables/Institute_Setup/useAcademicSessions'

const props = defineProps<{
  session: AcademicSessionTerm | null
  years: { id?: number; year_name: string }[]
}>()

const emit = defineEmits<{
  save: [session: AcademicSessionTerm]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<AcademicSessionTerm>({
  ...emptySession(),
  ...(props.session ? (JSON.parse(JSON.stringify(props.session)) as Partial<AcademicSessionTerm>) : {}),
})

// ── Option lists (EN - বাংলা) ──────────────────────────────────────────

const SESSION_PRESETS = [
  { Id: '2026 Session', bn: '২০২৬ সেশন', year: '2026' },
  { Id: '2025 Session', bn: '২০২৫ সেশন', year: '2025' },
  { Id: '2027 Session', bn: '২০২৭ সেশন', year: '2027' },
  { Id: '2026-2027 Session', bn: '২০২৬-২০২৭ সেশন', year: '2026' },
  { Id: '2025-2026 Session', bn: '২০২৫-২০২৬ সেশন', year: '2025' },
  { Id: '2024 Session', bn: '২০২৪ সেশন', year: '2024' },
]
const sessionOptions = computed(() => {
  const presets = SESSION_PRESETS.map((x) => ({
    Id: x.Id,
    LookupText: `${x.Id} - ${x.bn}`,
    DisplayText: `${x.Id} - ${x.bn}`,
  }))
  if (form.session_name && !presets.some((o) => o.Id === form.session_name)) {
    presets.unshift({ Id: form.session_name, LookupText: form.session_name, DisplayText: form.session_name })
  }
  return presets
})

const yearOptions = computed(() =>
  props.years.map((y) => ({
    Id: Number(y.id),
    LookupText: String(y.year_name),
    DisplayText: String(y.year_name),
  })),
)

const TERMS = [
  { Id: 'Term 1', bn: 'প্রথম সাময়িক', order: 1 },
  { Id: 'Term 2', bn: 'দ্বিতীয় সাময়িক', order: 2 },
  { Id: 'Term 3', bn: 'তৃতীয় সাময়িক', order: 3 },
  { Id: 'Term 4', bn: 'চতুর্থ সাময়িক', order: 4 },
  { Id: 'First Term', bn: 'প্রথম সাময়িক', order: 1 },
  { Id: 'Mid Term', bn: 'মধ্য সাময়িক', order: 2 },
  { Id: 'Final Term', bn: 'চূড়ান্ত সাময়িক', order: 3 },
]
const termOptions = computed(() => {
  const presets = TERMS.map((x) => ({
    Id: x.Id,
    LookupText: `${x.Id} - ${x.bn}`,
    DisplayText: `${x.Id} - ${x.bn}`,
  }))
  if (form.term_name && !presets.some((o) => o.Id === form.term_name)) {
    presets.unshift({ Id: form.term_name, LookupText: form.term_name, DisplayText: form.term_name })
  }
  return presets
})

const resultTypeOptions = computed(() =>
  (resultTypesJson as { Id: string; LookupText: string }[]).map((x) => ({
    Id: x.Id,
    LookupText: x.LookupText,
    DisplayText: x.LookupText,
  })),
)

/** Picking a session name auto-fills its Bangla + the matching academic year. */
function onSessionChange(opt: Record<string, unknown> | null) {
  const preset = SESSION_PRESETS.find((x) => x.Id === opt?.Id)
  if (!preset) return
  form.session_name_bn = preset.bn
  if (form.academic_year_id == null) {
    const match = props.years.find((y) => String(y.year_name).includes(preset.year))
    if (match?.id != null) form.academic_year_id = Number(match.id)
  }
}

/** Picking a term name auto-fills its Bangla + order. */
function onTermChange(opt: Record<string, unknown> | null) {
  const preset = TERMS.find((x) => x.Id === opt?.Id)
  if (!preset) return
  form.term_name_bn = preset.bn
  form.term_order = preset.order
}

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (!form.session_name.trim()) {
    toast.error(t('Session name is required'))
    return false
  }
  if (!form.academic_year_id) {
    toast.error(t('Academic year is required'))
    return false
  }
  if (!form.term_name.trim()) {
    toast.error(t('Term name is required'))
    return false
  }
  if (form.term_order == null || form.term_order < 1) {
    toast.error(t('Term order is required'))
    return false
  }
  if (!form.term_start) {
    toast.error(t('Term start date is required'))
    return false
  }
  if (form.term_end && form.term_end < form.term_start) {
    toast.error(t('End date cannot be before start date'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  emit('save', JSON.parse(JSON.stringify(form)) as AcademicSessionTerm)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-calendar-star" />
          {{ t('Session & Term Details') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field ipf-field--span2">
            <label>{{ t('Session Name') }} *</label>
            <BaseCombobox
              v-model="form.session_name"
              :options="sessionOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select session name')"
              @change="onSessionChange"
            />
            <small class="form-hint">{{ t('Auto-fills the academic year — you can change it.') }}</small>
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
          <div class="form-field">
            <label>{{ t('Term Name') }} *</label>
            <BaseCombobox
              v-model="form.term_name"
              :options="termOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select term')"
              @change="onTermChange"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Term Order') }} *</label>
            <input v-model.number="form.term_order" type="number" min="1" :placeholder="t('e.g. 1')" />
          </div>
          <div class="form-field">
            <label>{{ t('Term Start') }} *</label>
            <BaseDatePicker v-model="form.term_start" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Term End') }}</label>
            <BaseDatePicker v-model="form.term_end" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Result Type') }}</label>
            <BaseCombobox
              v-model="form.result_type"
              :options="resultTypeOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select result type')"
              clearable
            />
          </div>
          <div class="form-field">
            <label>{{ t('Is Current') }}</label>
            <BaseToggle v-model="form.is_current" :yes-label="t('Yes')" :no-label="t('No')" />
            <small class="form-hint">{{ t('Only one term can be current — others are turned off automatically.') }}</small>
          </div>
          <div class="form-field">
            <label>{{ t('Active') }}</label>
            <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
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
        {{ props.session ? t('Update') : t('Save') }}
      </button>
    </div>
  </div>
</template>
