<script setup lang="ts">
// Add / edit modal for a Subject — comboboxes everywhere (name, code, type,
// board, group, version, class levels) + repeatable marks-distribution rows
// per class level (theory / practical / CA / pass / periods / books).
import { computed, reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import subjectTypesJson from '@/assets/jsons/subject_types.json'
import subjectsJson from '@/assets/jsons/subjects.json'
import {
  emptySubject,
  type MarksRow,
  type Subject,
} from '@/composables/Institute_Setup/useSubjects'

interface SubjectPreset {
  Id: string
  code: string
  type: string
  board: string
}

const props = defineProps<{
  subject: Subject | null
  boards: { id?: number; board_name: string; board_type?: string }[]
  groups: { id?: number; group_name?: string }[]
  classes: { id?: number; class_name?: string }[]
}>()

const emit = defineEmits<{
  save: [subject: Subject]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<Subject>({
  ...emptySubject(),
  ...(props.subject ? (JSON.parse(JSON.stringify(props.subject)) as Partial<Subject>) : {}),
})

// ── Combobox options ───────────────────────────────────────────────────

const VERSIONS = ['Bangla', 'English', 'Both']
const versionOptions = computed(() => VERSIONS.map((v) => ({ Id: v, LookupText: v, DisplayText: v })))

const typeOptions = computed(() =>
  (subjectTypesJson as { Id: string; LookupText: string }[]).map((x) => ({
    Id: x.Id,
    LookupText: x.LookupText,
    DisplayText: x.LookupText,
  })),
)

const boardOptions = computed(() =>
  props.boards.map((b) => ({
    Id: Number(b.id),
    LookupText: String(b.board_name),
    DisplayText: String(b.board_name),
  })),
)

const groupOptions = computed(() => [
  { Id: 0, LookupText: t('All Groups'), DisplayText: t('All Groups') },
  ...props.groups.map((g) => ({
    Id: Number(g.id),
    LookupText: String(g.group_name ?? ''),
    DisplayText: String(g.group_name ?? ''),
  })),
])

const classOptions = computed(() =>
  props.classes.map((c) => ({
    Id: Number(c.id),
    LookupText: String(c.class_name ?? ''),
    DisplayText: String(c.class_name ?? ''),
  })),
)

// Subject Name — combobox of the Bangladesh curriculum presets.
const nameOptions = computed(() => {
  const presets = (subjectsJson as SubjectPreset[]).map((x) => ({
    Id: x.Id,
    LookupText: x.Id,
    DisplayText: x.Id,
  }))
  if (form.subject_name && !presets.some((o) => o.Id === form.subject_name)) {
    presets.unshift({ Id: form.subject_name, LookupText: form.subject_name, DisplayText: form.subject_name })
  }
  return presets
})

// Subject Code — combobox of common board codes.
const COMMON_CODES = ['101', '102', '107', '108', '109', '110', '117', '129', '134', '136', '137', '138', '139', '140', '141', '142', '143', '144', '145', '146', '147', '148', '149', '150', '151', '152', '153', '154', '155', '156', '161', '165', '167', '172', '175', '176', '177', '178', '179', '180', '181', '182', '183', '184', '185', '186', '187', '188', '190', '191', '192', '193', '194']
const codeOptions = computed(() => {
  const opts = COMMON_CODES.map((c) => ({ Id: c, LookupText: c, DisplayText: c }))
  if (form.subject_code && !opts.some((o) => o.Id === form.subject_code)) {
    opts.unshift({ Id: form.subject_code, LookupText: form.subject_code, DisplayText: form.subject_code })
  }
  return opts
})

/** Picking a preset auto-fills code + type; board too when unambiguous. */
function onNameChange(opt: Record<string, unknown> | null) {
  const preset = (subjectsJson as SubjectPreset[]).find((x) => x.Id === opt?.Id)
  if (!preset) return
  form.subject_code = preset.code
  form.subject_type = preset.type
  if (preset.board && form.board_id == null) {
    const target = props.boards.find((b) => (b.board_type ?? '').startsWith(preset.board) || b.board_name.includes(preset.board))
    if (target?.id != null) form.board_id = Number(target.id)
  }
}

// ── Marks distribution rows ────────────────────────────────────────────

function emptyMarksRow(): MarksRow {
  return { class_id: null, full_marks_theory: null, full_marks_practical: null, full_marks_ca: null, pass_marks: null, periods_week: null, book_names: '' }
}

function addMarksRow() {
  form.marks_distribution.push(emptyMarksRow())
}

function removeMarksRow(i: number) {
  form.marks_distribution.splice(i, 1)
}

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (!form.subject_name.trim()) {
    toast.error(t('Subject name is required'))
    return false
  }
  if (!form.subject_code.trim()) {
    toast.error(t('Subject code is required'))
    return false
  }
  if (!form.subject_type) {
    toast.error(t('Subject type is required'))
    return false
  }
  if (!form.board_id) {
    toast.error(t('Board is required'))
    return false
  }
  for (const m of form.marks_distribution) {
    if (!m.class_id) {
      toast.error(t('Select a class level in every marks row'))
      return false
    }
    const theory = m.full_marks_theory ?? 0
    const practical = m.full_marks_practical ?? 0
    const ca = m.full_marks_ca ?? 0
    const total = theory + practical + ca
    if (total <= 0) {
      toast.error(t('Marks total must be greater than zero'))
      return false
    }
    if (m.pass_marks != null && m.pass_marks > total) {
      toast.error(t('Pass marks cannot exceed the total marks'))
      return false
    }
  }
  return true
}

function submit() {
  if (!validate()) return
  const out: Subject = JSON.parse(JSON.stringify(form))
  out.class_level_ids = (out.class_level_ids as unknown as (string | number)[])
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n))
  out.marks_distribution = out.marks_distribution.map((m) => ({
    ...m,
    class_id: Number(m.class_id),
  }))
  emit('save', out)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Subject details -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-book-open" />
          {{ t('Subject Details') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field ipf-field--span2">
            <label>{{ t('Subject Name') }} *</label>
            <BaseCombobox
              v-model="form.subject_name"
              :options="nameOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select subject name')"
              @change="onNameChange"
            />
            <small class="form-hint">{{ t('Auto-fills code and type — you can change them.') }}</small>
          </div>
          <div class="form-field">
            <label>{{ t('Subject Code') }} *</label>
            <BaseCombobox
              v-model="form.subject_code"
              :options="codeOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select code')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Subject Type') }} *</label>
            <BaseCombobox
              v-model="form.subject_type"
              :options="typeOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select type')"
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
            <label>{{ t('Group') }}</label>
            <BaseCombobox
              v-model="form.group_id"
              :options="groupOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('All Groups')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Version') }}</label>
            <BaseCombobox
              v-model="form.version"
              :options="versionOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select version')"
              clearable
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Class Levels') }}</label>
            <BaseCombobox
              v-model="form.class_level_ids"
              :options="classOptions"
              option-value="Id"
              option-label="DisplayText"
              multiple
              :placeholder="t('Select class levels')"
            />
          </div>
        </div>
      </div>

      <!-- Marks distribution -->
      <div class="ipfp-section">
        <div class="ipfp-section__title-row">
          <h4 class="ipfp-section__title">
            <i class="fa-duotone fa-chart-column" />
            {{ t('Marks Distribution') }}
          </h4>
          <button type="button" class="btn btn--ghost br-card__btn" @click="addMarksRow">
            <i class="fa-duotone fa-plus" /> {{ t('Add Row') }}
          </button>
        </div>
        <p class="form-hint">{{ t('Per-class marks for this subject — optional until classes are set.') }}</p>

        <div v-if="form.marks_distribution.length" class="gs-grades">
          <div v-for="(m, i) in form.marks_distribution" :key="i" class="gs-grade-row">
            <div class="form-field">
              <label>{{ t('Class Level') }} *</label>
              <BaseCombobox
                v-model="m.class_id"
                :options="classOptions"
                option-value="Id"
                option-label="DisplayText"
                :placeholder="t('Select class')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Theory') }}</label>
              <input v-model.number="m.full_marks_theory" type="number" min="0" :placeholder="t('e.g. 70')" />
            </div>
            <div class="form-field">
              <label>{{ t('Practical') }}</label>
              <input v-model.number="m.full_marks_practical" type="number" min="0" :placeholder="t('e.g. 30')" />
            </div>
            <div class="form-field">
              <label>{{ t('Continuous Assessment') }}</label>
              <input v-model.number="m.full_marks_ca" type="number" min="0" :placeholder="t('e.g. 10')" />
            </div>
            <div class="form-field">
              <label>{{ t('Pass Marks') }}</label>
              <input v-model.number="m.pass_marks" type="number" min="0" :placeholder="t('e.g. 33')" />
            </div>
            <div class="form-field">
              <label>{{ t('Periods / Week') }}</label>
              <input v-model.number="m.periods_week" type="number" min="0" :placeholder="t('e.g. 6')" />
            </div>
            <div class="form-field gs-grade-row__books">
              <label>{{ t('Textbooks') }}</label>
              <input v-model="m.book_names" type="text" :placeholder="t('e.g. NCTB Physics Book')" />
            </div>
            <button type="button" class="ipf-array-card__remove gs-grade-row__remove" :aria-label="t('Remove row')" @click="removeMarksRow(i)">
              <i class="fa-duotone fa-trash" />
            </button>
          </div>
        </div>
        <div v-else class="gs-grades-empty">
          <i class="fa-duotone fa-chart-column" />
          <span>{{ t('No marks rows yet — click “Add Row”.') }}</span>
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
        {{ props.subject ? t('Update') : t('Save') }}
      </button>
    </div>
  </div>
</template>
