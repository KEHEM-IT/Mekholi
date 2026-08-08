<script setup lang="ts">
// Add / edit modal for an Exam Term — comboboxes everywhere (name, type,
// board, term, classes, grading scheme) + dates + toggles.
import { computed, reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import examNamesJson from '@/assets/jsons/exam_names.json'
import examTypeCatsJson from '@/assets/jsons/exam_type_categories.json'
import {
  emptyExamTerm,
  type ExamTerm,
} from '@/composables/Institute_Setup/useExamTerms'

interface ExamNamePreset {
  Id: string
  bn: string
  type: string
}

const props = defineProps<{
  exam: ExamTerm | null
  boards: { id?: number; board_name: string; board_name_bn?: string }[]
  schemes: { id?: number; scheme_name: string }[]
  classes: { id?: number; class_name?: string; class_name_bn?: string }[]
}>()

const emit = defineEmits<{
  save: [exam: ExamTerm]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<ExamTerm>({
  ...emptyExamTerm(),
  ...(props.exam ? (JSON.parse(JSON.stringify(props.exam)) as Partial<ExamTerm>) : {}),
})

// ── Combobox options ───────────────────────────────────────────────────

const nameOptions = computed(() => {
  const presets = (examNamesJson as ExamNamePreset[]).map((x) => ({
    Id: x.Id,
    LookupText: `${x.Id} - ${x.bn}`,
    DisplayText: `${x.Id} - ${x.bn}`,
  }))
  if (form.exam_name && !presets.some((o) => o.Id === form.exam_name)) {
    presets.unshift({ Id: form.exam_name, LookupText: form.exam_name, DisplayText: form.exam_name })
  }
  return presets
})

const typeOptions = computed(() =>
  (examTypeCatsJson as { Id: string; LookupText: string }[]).map((x) => ({
    Id: x.Id,
    LookupText: x.LookupText,
    DisplayText: x.LookupText,
  })),
)

const boardOptions = computed(() =>
  props.boards.map((b) => ({
    Id: Number(b.id),
    LookupText: `${b.board_name}${b.board_name_bn ? ` - ${b.board_name_bn}` : ''}`,
    DisplayText: `${b.board_name}${b.board_name_bn ? ` - ${b.board_name_bn}` : ''}`,
  })),
)

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'First Term', 'Mid Term', 'Final Term']
const TERM_BN: Record<string, string> = { 'Term 1': '১ম টার্ম', 'Term 2': '২য় টার্ম', 'Term 3': '৩য় টার্ম', 'Term 4': '৪র্থ টার্ম', 'First Term': 'প্রথম সাময়িক', 'Mid Term': 'মধ্য সাময়িক', 'Final Term': 'চূড়ান্ত সাময়িক' }
const termOptions = computed(() => [
  { Id: 0, LookupText: t('No Term'), DisplayText: t('No Term') },
  ...TERMS.map((term) => ({
    Id: TERMS.indexOf(term) + 1,
    LookupText: `${term} - ${TERM_BN[term]}`,
    DisplayText: `${term} - ${TERM_BN[term]}`,
  })),
])

const schemeOptions = computed(() =>
  props.schemes.map((s) => ({
    Id: Number(s.id),
    LookupText: String(s.scheme_name),
    DisplayText: String(s.scheme_name),
  })),
)

const classOptions = computed(() =>
  props.classes.map((c) => {
    const r = c as unknown as { class_name?: string; class_name_bn?: string }
    return {
      Id: Number(c.id),
      LookupText: `${r.class_name ?? ''}${r.class_name_bn ? ` - ${r.class_name_bn}` : ''}`,
      DisplayText: `${r.class_name ?? ''}${r.class_name_bn ? ` - ${r.class_name_bn}` : ''}`,
    }
  }),
)

/** Picking an exam name auto-fills its category type. */
function onNameChange(opt: Record<string, unknown> | null) {
  const preset = (examNamesJson as ExamNamePreset[]).find((x) => x.Id === opt?.Id)
  if (!preset) return
  form.exam_name_bn = preset.bn
  form.exam_type = preset.type
}

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (!form.exam_name.trim()) {
    toast.error(t('Exam name is required'))
    return false
  }
  if (!form.exam_type) {
    toast.error(t('Exam type is required'))
    return false
  }
  if (!form.board_id) {
    toast.error(t('Board is required'))
    return false
  }
  if (form.class_ids.length === 0) {
    toast.error(t('Select at least one class'))
    return false
  }
  if (!form.scheme_id) {
    toast.error(t('Grading scheme is required'))
    return false
  }
  if (!form.exam_start) {
    toast.error(t('Exam start date is required'))
    return false
  }
  if (form.exam_end && form.exam_end < form.exam_start) {
    toast.error(t('End date cannot be before start date'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  const out: ExamTerm = JSON.parse(JSON.stringify(form))
  out.class_ids = (out.class_ids as unknown as (string | number)[])
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n))
  emit('save', out)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-clipboard-list" />
          {{ t('Exam Details') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field ipf-field--span2">
            <label>{{ t('Exam Name') }} *</label>
            <BaseCombobox
              v-model="form.exam_name"
              :options="nameOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select exam name')"
              @change="onNameChange"
            />
            <small class="form-hint">{{ t('Auto-fills type — you can change it.') }}</small>
          </div>
          <div class="form-field">
            <label>{{ t('Exam Type') }} *</label>
            <BaseCombobox
              v-model="form.exam_type"
              :options="typeOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select exam type')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Board') }} *</label>
            <BaseCombobox
              v-model="form.board_id"
              :options="boardOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select board')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Academic Term') }}</label>
            <BaseCombobox
              v-model="form.term_id"
              :options="termOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('No Term')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Grading Scheme') }} *</label>
            <BaseCombobox
              v-model="form.scheme_id"
              :options="schemeOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select scheme')"
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Applicable Classes') }} *</label>
            <BaseCombobox
              v-model="form.class_ids"
              :options="classOptions"
              option-value="Id"
              option-label="DisplayText"
              multiple
              :placeholder="t('Select classes')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Exam Start') }} *</label>
            <BaseDatePicker v-model="form.exam_start" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Exam End') }}</label>
            <BaseDatePicker v-model="form.exam_end" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Publish to Parents') }}</label>
            <BaseToggle v-model="form.publish_to_portal" :yes-label="t('Yes')" :no-label="t('No')" />
          </div>
          <div class="form-field">
            <label>{{ t('Is Board Exam') }}</label>
            <BaseToggle v-model="form.is_board_exam" :yes-label="t('Yes')" :no-label="t('No')" />
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
        {{ props.exam ? t('Update') : t('Save') }}
      </button>
    </div>
  </div>
</template>
