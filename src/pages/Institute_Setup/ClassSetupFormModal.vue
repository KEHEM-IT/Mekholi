<script setup lang="ts">
// Add / edit modal for Class / Section / Group / Shift — a single generic
// form that renders the fields for the active entity.
import { computed, onMounted, reactive, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import classNamesJson from '@/assets/jsons/class_names.json'
import {
  emptyItem,
  type ClassItem,
  type ClassSetupEntity,
  type ClassSetupItem,
  type GroupItem,
  type SectionItem,
  type ShiftItem,
} from '@/composables/Institute_Setup/useClassesSetup'

const props = defineProps<{
  entity: ClassSetupEntity
  item: ClassSetupItem | null
  /** Lookups for foreign-key comboboxes (classes / shifts / years / branches). */
  classes: ClassSetupItem[]
  shifts: ClassSetupItem[]
  years: { id?: number; year_name: string }[]
  branches: { id?: number; branch_name: string }[]
}>()

const emit = defineEmits<{
  save: [item: ClassSetupItem]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<Partial<ClassItem & SectionItem & GroupItem & ShiftItem>>({
  ...emptyItem(props.entity),
  ...(props.item ? (JSON.parse(JSON.stringify(props.item)) as Record<string, unknown>) : {}),
})

const PHASES = ['Primary', 'Secondary', 'Higher Secondary', 'Dakhil', 'Alim', 'Fazil', 'Kamil', 'SSC (Vocational)', 'HSC (Vocational)', 'Degree', 'Honours']
const VERSIONS = ['Bangla', 'English', 'Both']
const GROUP_TYPES = ['Academic', 'Vocational Trade', 'Madrasah']

const phaseOptions = PHASES.map((v) => ({ Id: v, LookupText: v, DisplayText: v }))
const versionOptions = VERSIONS.map((v) => ({ Id: v, LookupText: v, DisplayText: v }))
const groupTypeOptions = GROUP_TYPES.map((v) => ({ Id: v, LookupText: v, DisplayText: v }))
const yearOptions = computed(() => props.years.map((y) => ({ Id: String(y.id), LookupText: String(y.year_name), DisplayText: String(y.year_name) })))
const branchOptions = computed(() => props.branches.map((b) => ({ Id: String(b.id), LookupText: String(b.branch_name), DisplayText: String(b.branch_name) })))
const classOptions = computed(() =>
  props.classes.map((c) => {
    const r = c as unknown as { class_name?: string; class_name_bn?: string }
    return { Id: String(c.id), LookupText: String(c.id), DisplayText: `${r.class_name ?? ''}${r.class_name_bn ? ` - ${r.class_name_bn}` : ''}` }
  }),
)
const shiftOptions = computed(() =>
  props.shifts.map((s) => {
    const r = s as unknown as { shift_name?: string }
    return { Id: String(s.id), LookupText: String(s.id), DisplayText: String(r.shift_name ?? '') }
  }),
)

// ── Class-name presets (auto-fill phase / Bengali name / sort order) ──
const CLASS_PRESETS = classNamesJson as {
  Id: number
  Name: string
  NameInBangla: string
  Phase: string
  SortOrder: number
}[]

const classPresetOptions = CLASS_PRESETS.map((c) => ({
  Id: c.Name,
  Name: c.Name,
  NameInBangla: c.NameInBangla,
  LookupText: c.Name,
  DisplayText: `${c.Name} - ${c.NameInBangla}`,
}))

/** Auto-fill phase + Bengali name + sort order when a class is picked. */
function applyClassPreset(name: string) {
  const preset = CLASS_PRESETS.find((c) => c.Name === name)
  if (!preset) return
  form.class_name_bn = preset.NameInBangla
  form.phase = preset.Phase
  form.sort_order = preset.SortOrder
}

// When the user picks a class name, auto-fill the related fields
// (all remain editable afterwards).
watch(
  () => form.class_name,
  (val) => {
    if (props.entity === 'classes' && val) applyClassPreset(String(val))
  },
)

// Auto-select the current academic year when ADDING a class.
onMounted(() => {
  if (props.entity === 'classes' && !props.item) {
    const current = props.years.find((y) => (y as unknown as { is_current?: boolean }).is_current)
    if (current?.id != null) form.academic_year_id = current.id
  }
})

function validate(): boolean {
  const name = String(form[props.entity === 'classes' ? 'class_name' : props.entity === 'sections' ? 'section_name' : props.entity === 'groups' ? 'group_name' : 'shift_name'] ?? '').trim()
  if (!name) {
    toast.error(t('Name is required'))
    return false
  }
  if (props.entity === 'classes' && !form.phase) {
    toast.error(t('Phase is required'))
    return false
  }
  if (props.entity === 'shifts' && form.start_time && form.end_time && String(form.end_time) <= String(form.start_time)) {
    toast.error(t('End time must be after start time'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  const out: Record<string, unknown> = { ...form }
  // class_ids arrive as strings from the multi-combo — coerce to numbers.
  if (props.entity === 'groups' && Array.isArray(out.class_ids)) {
    out.class_ids = (out.class_ids as unknown[]).map((v) => Number(v)).filter((n) => !Number.isNaN(n))
  }
  emit('save', out as unknown as ClassSetupItem)
}

const isClasses = computed(() => props.entity === 'classes')
const isSections = computed(() => props.entity === 'sections')
const isGroups = computed(() => props.entity === 'groups')
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone" :class="isClasses ? 'fa-layer-group' : isSections ? 'fa-table-columns' : isGroups ? 'fa-object-group' : 'fa-clock'" />
          {{ t('Details') }}
        </h4>
        <div class="ipfp-grid">
          <!-- Class fields -->
          <template v-if="isClasses">
            <div class="form-field">
              <label>{{ t('Class Name') }} *</label>
              <BaseCombobox
                v-model="form.class_name"
                :options="classPresetOptions"
                option-value="LookupText"
                option-label="DisplayText"
                :placeholder="t('Select class name')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Phase / Level') }} *</label>
              <BaseCombobox v-model="form.phase" :options="phaseOptions" option-value="LookupText" option-label="DisplayText" :placeholder="t('Select phase')" />
            </div>
            <div class="form-field">
              <label>{{ t('Academic Year') }}</label>
              <BaseCombobox v-model="form.academic_year_id" :options="yearOptions" option-value="Id" option-label="DisplayText" :placeholder="t('Select year')" />
            </div>
            <div class="form-field ipf-field--span2">
              <label>{{ t('Branch') }}</label>
              <BaseCombobox v-model="form.branch_id" :options="branchOptions" option-value="Id" option-label="DisplayText" :placeholder="t('Select branch')" />
            </div>
            <div class="form-field">
              <label>{{ t('Active') }}</label>
              <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
            </div>
          </template>

          <!-- Section fields -->
          <template v-else-if="isSections">
            <div class="form-field">
              <label>{{ t('Section Name') }} *</label>
              <input v-model="form.section_name" type="text" :placeholder="t('e.g. A, B')" />
            </div>
            <div class="form-field">
              <label>{{ t('Section Name (Bangla)') }}</label>
              <input v-model="form.section_name_bn" type="text" :placeholder="t('e.g. ক, খ')" />
            </div>
            <div class="form-field">
              <label>{{ t('Class') }} *</label>
              <BaseCombobox v-model="form.class_id" :options="classOptions" option-value="Id" option-label="DisplayText" :placeholder="t('Select class')" />
            </div>
            <div class="form-field">
              <label>{{ t('Shift') }} *</label>
              <BaseCombobox v-model="form.shift_id" :options="shiftOptions" option-value="Id" option-label="DisplayText" :placeholder="t('Select shift')" />
            </div>
            <div class="form-field">
              <label>{{ t('Capacity') }}</label>
              <input v-model.number="form.capacity" type="number" :placeholder="t('Max students')" />
            </div>
            <div class="form-field">
              <label>{{ t('Home Room Id') }}</label>
              <input v-model.number="form.room_id" type="number" :placeholder="t('Optional room id')" />
            </div>
            <div class="form-field">
              <label>{{ t('Active') }}</label>
              <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
            </div>
          </template>

          <!-- Group fields -->
          <template v-else-if="isGroups">
            <div class="form-field">
              <label>{{ t('Group Name') }} *</label>
              <input v-model="form.group_name" type="text" :placeholder="t('e.g. Science - বিজ্ঞান')" />
            </div>
            <div class="form-field">
              <label>{{ t('Group Name (Bangla)') }}</label>
              <input v-model="form.group_name_bn" type="text" :placeholder="t('e.g. বিজ্ঞান')" />
            </div>
            <div class="form-field ipf-field--full">
              <label>{{ t('Applicable Classes') }} *</label>
              <BaseCombobox v-model="form.class_ids" multiple :options="classOptions" option-value="Id" option-label="DisplayText" :placeholder="t('Select one or more classes')" />
            </div>
            <div class="form-field">
              <label>{{ t('Version') }}</label>
              <BaseCombobox v-model="form.version" :options="versionOptions" option-value="LookupText" option-label="DisplayText" :placeholder="t('Select version')" />
            </div>
            <div class="form-field">
              <label>{{ t('Group Type') }}</label>
              <BaseCombobox v-model="form.group_type" :options="groupTypeOptions" option-value="LookupText" option-label="DisplayText" :placeholder="t('Select type')" />
            </div>
            <div class="form-field">
              <label>{{ t('Active') }}</label>
              <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
            </div>
          </template>

          <!-- Shift fields -->
          <template v-else>
            <div class="form-field">
              <label>{{ t('Shift Name') }} *</label>
              <input v-model="form.shift_name" type="text" :placeholder="t('e.g. Morning - সকাল')" />
            </div>
            <div class="form-field">
              <label>{{ t('Shift Name (Bangla)') }}</label>
              <input v-model="form.shift_name_bn" type="text" :placeholder="t('e.g. সকাল')" />
            </div>
            <div class="form-field">
              <label>{{ t('Start Time') }}</label>
              <input v-model="form.start_time" type="time" />
            </div>
            <div class="form-field">
              <label>{{ t('End Time') }}</label>
              <input v-model="form.end_time" type="time" />
            </div>
            <div class="form-field">
              <label>{{ t('Active') }}</label>
              <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('Cancel') }}
      </button>
      <button type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-floppy-disk" />
        {{ props.item ? t('Update') : t('Save') }}
      </button>
    </div>
  </div>
</template>
