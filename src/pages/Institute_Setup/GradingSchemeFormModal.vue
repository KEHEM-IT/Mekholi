<script setup lang="ts">
// Add / edit modal for a Grading Scheme — scheme fields + repeatable grade
// rows (A+, A, A- … with point, min/max % and remarks).
import { computed, reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import gradingTypesJson from '@/assets/jsons/grading_types.json'
import {
  emptyScheme,
  type GradeRow,
  type GradingScheme,
} from '@/composables/Institute_Setup/useGradingSchemes'

const props = defineProps<{
  scheme: GradingScheme | null
  /** Class-level lookups for the multi-combo (Classes entity). */
  classes: { id?: number; class_name?: string; class_name_bn?: string }[]
}>()

const emit = defineEmits<{
  save: [scheme: GradingScheme]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<GradingScheme>({
  ...emptyScheme(),
  ...(props.scheme ? (JSON.parse(JSON.stringify(props.scheme)) as Partial<GradingScheme>) : {}),
})

// ── Option lists ───────────────────────────────────────────────────────

const typeOptions = computed(() =>
  (gradingTypesJson as { Id: string; LookupText: string }[]).map((x) => ({
    Id: x.Id,
    LookupText: x.LookupText,
    DisplayText: x.LookupText,
  })),
)

const BOARDS = ['General', 'Madrasah', 'Technical (BTEB)', 'Vocational', 'University', 'Other']
const boardOptions = computed(() =>
  BOARDS.map((b) => ({ Id: b, LookupText: b, DisplayText: b })),
)

const classOptions = computed(() =>
  props.classes.map((c) => ({
    Id: Number(c.id),
    LookupText: String(c.id),
    DisplayText: `${c.class_name ?? ''}${c.class_name_bn ? ` - ${c.class_name_bn}` : ''}`,
  })),
)

// ── Grade rows ─────────────────────────────────────────────────────────

function emptyGradeRow(): GradeRow {
  return { grade_name: '', grade_name_bn: '', grade_point: null, min_percent: null, max_percent: null, remarks: '' }
}

function addGradeRow() {
  form.grades.push(emptyGradeRow())
}

function removeGradeRow(i: number) {
  form.grades.splice(i, 1)
}

/** Fill the table with a sensible preset for the chosen grading type. */
function applyPreset() {
  const presets: Record<string, GradeRow[]> = {
    'GPA 5.00': [
      { grade_name: 'A+', grade_name_bn: 'এ প্লাস', grade_point: 5, min_percent: 80, max_percent: 100, remarks: 'Excellent' },
      { grade_name: 'A', grade_name_bn: 'এ', grade_point: 4, min_percent: 70, max_percent: 79, remarks: 'Very Good' },
      { grade_name: 'A-', grade_name_bn: 'এ মাইনাস', grade_point: 3.5, min_percent: 60, max_percent: 69, remarks: 'Good' },
      { grade_name: 'B', grade_name_bn: 'বি', grade_point: 3, min_percent: 50, max_percent: 59, remarks: 'Above Average' },
      { grade_name: 'C', grade_name_bn: 'সি', grade_point: 2, min_percent: 40, max_percent: 49, remarks: 'Average' },
      { grade_name: 'D', grade_name_bn: 'ডি', grade_point: 1, min_percent: 33, max_percent: 39, remarks: 'Pass' },
      { grade_name: 'F', grade_name_bn: 'এফ', grade_point: 0, min_percent: 0, max_percent: 32, remarks: 'Fail' },
    ],
    'CGPA 4.00': [
      { grade_name: 'A', grade_name_bn: 'এ', grade_point: 4, min_percent: 80, max_percent: 100, remarks: 'Excellent' },
      { grade_name: 'B+', grade_name_bn: 'বি প্লাস', grade_point: 3.5, min_percent: 75, max_percent: 79, remarks: 'Very Good' },
      { grade_name: 'B', grade_name_bn: 'বি', grade_point: 3, min_percent: 70, max_percent: 74, remarks: 'Good' },
      { grade_name: 'C+', grade_name_bn: 'সি প্লাস', grade_point: 2.5, min_percent: 65, max_percent: 69, remarks: 'Above Average' },
      { grade_name: 'C', grade_name_bn: 'সি', grade_point: 2, min_percent: 60, max_percent: 64, remarks: 'Average' },
      { grade_name: 'D', grade_name_bn: 'ডি', grade_point: 1, min_percent: 50, max_percent: 59, remarks: 'Pass' },
      { grade_name: 'F', grade_name_bn: 'এফ', grade_point: 0, min_percent: 0, max_percent: 49, remarks: 'Fail' },
    ],
    'Pass/Fail': [
      { grade_name: 'Pass', grade_name_bn: 'পাস', grade_point: 1, min_percent: 40, max_percent: 100, remarks: 'Passed' },
      { grade_name: 'Fail', grade_name_bn: 'ফেল', grade_point: 0, min_percent: 0, max_percent: 39, remarks: 'Failed' },
    ],
  }
  const preset = presets[form.grading_type]
  if (preset) form.grades = JSON.parse(JSON.stringify(preset))
}

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (!form.scheme_name.trim()) {
    toast.error(t('Scheme name is required'))
    return false
  }
  if (!form.grading_type) {
    toast.error(t('Grading type is required'))
    return false
  }
  if (form.class_level_ids.length === 0) {
    toast.error(t('Select at least one class level'))
    return false
  }
  if (form.pass_marks == null || form.pass_marks < 0) {
    toast.error(t('Pass marks is required'))
    return false
  }
  if (form.grades.length === 0) {
    toast.error(t('Add at least one grade row'))
    return false
  }
  for (const g of form.grades) {
    if (!g.grade_name.trim()) {
      toast.error(t('Grade name is required in every row'))
      return false
    }
    if (g.grade_point == null || g.min_percent == null || g.max_percent == null) {
      toast.error(t('Point and Min/Max % are required in every grade row'))
      return false
    }
    if (g.max_percent < g.min_percent) {
      toast.error(t('Max % must be greater than or equal to Min %'))
      return false
    }
  }
  return true
}

function submit() {
  if (!validate()) return
  const out: GradingScheme = JSON.parse(JSON.stringify(form))
  // class_level_ids arrive as strings from the multi-combo — coerce to numbers.
  out.class_level_ids = (out.class_level_ids as unknown as (string | number)[])
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n))
  emit('save', out)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Scheme details -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-chart-simple" />
          {{ t('Scheme Details') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Scheme Name') }} *</label>
            <input v-model="form.scheme_name" type="text" :placeholder="t('e.g. SSC Grade, Dakhil Grade')" />
          </div>
          <div class="form-field">
            <label>{{ t('Scheme Name (Bangla)') }}</label>
            <input v-model="form.scheme_name_bn" type="text" :placeholder="t('e.g. এসএসসি গ্রেড')" />
          </div>
          <div class="form-field">
            <label>{{ t('Grading Type') }} *</label>
            <BaseCombobox
              v-model="form.grading_type"
              :options="typeOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select grading type')"
              @change="applyPreset"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Applicable Board') }}</label>
            <BaseCombobox
              v-model="form.board_id"
              :options="boardOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select board')"
              clearable
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Applicable Class Levels') }} *</label>
            <BaseCombobox
              v-model="form.class_level_ids"
              :options="classOptions"
              option-value="Id"
              option-label="DisplayText"
              multiple
              :placeholder="t('Select class levels')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Pass Marks') }} *</label>
            <input v-model.number="form.pass_marks" type="number" min="0" max="100" :placeholder="t('e.g. 33')" />
          </div>
          <div class="form-field">
            <label>{{ t('Is Default') }}</label>
            <BaseToggle v-model="form.is_default" :yes-label="t('Yes')" :no-label="t('No')" />
          </div>
        </div>
      </div>

      <!-- Grade rows -->
      <div class="ipfp-section">
        <div class="ipfp-section__title-row">
          <h4 class="ipfp-section__title">
            <i class="fa-duotone fa-table-list" />
            {{ t('Grade Rows') }}
          </h4>
          <button type="button" class="btn btn--ghost br-card__btn" @click="addGradeRow">
            <i class="fa-duotone fa-plus" /> {{ t('Add Grade') }}
          </button>
        </div>
        <p class="form-hint">{{ t('Pick a Grading Type above to auto-fill common grades, then adjust.') }}</p>

        <div v-if="form.grades.length" class="gs-grades">
          <div v-for="(g, i) in form.grades" :key="i" class="gs-grade-row">
            <div class="form-field gs-grade-row__name">
              <label>{{ t('Grade') }}</label>
              <input v-model="g.grade_name" type="text" :placeholder="t('e.g. A+')" />
            </div>
            <div class="form-field">
              <label>{{ t('Bangla') }}</label>
              <input v-model="g.grade_name_bn" type="text" :placeholder="t('e.g. এ প্লাস')" />
            </div>
            <div class="form-field">
              <label>{{ t('Point') }}</label>
              <input v-model.number="g.grade_point" type="number" step="0.5" min="0" max="5" :placeholder="t('e.g. 5.00')" />
            </div>
            <div class="form-field">
              <label>{{ t('Min %') }}</label>
              <input v-model.number="g.min_percent" type="number" min="0" max="100" :placeholder="t('e.g. 80')" />
            </div>
            <div class="form-field">
              <label>{{ t('Max %') }}</label>
              <input v-model.number="g.max_percent" type="number" min="0" max="100" :placeholder="t('e.g. 100')" />
            </div>
            <div class="form-field">
              <label>{{ t('Remarks') }}</label>
              <input v-model="g.remarks" type="text" :placeholder="t('e.g. Excellent')" />
            </div>
            <button type="button" class="ipf-array-card__remove gs-grade-row__remove" :aria-label="t('Remove grade')" @click="removeGradeRow(i)">
              <i class="fa-duotone fa-trash" />
            </button>
          </div>
        </div>
        <div v-else class="gs-grades-empty">
          <i class="fa-duotone fa-table-list" />
          <span>{{ t('No grade rows yet — click “Add Grade” or pick a Grading Type.') }}</span>
        </div>
      </div>

      <div class="form-field ipf-field--full">
        <label>{{ t('Active') }}</label>
        <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
      </div>
    </div>

    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('Cancel') }}
      </button>
      <button type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-floppy-disk" />
        {{ props.scheme ? t('Update') : t('Save') }}
      </button>
    </div>
  </div>
</template>
