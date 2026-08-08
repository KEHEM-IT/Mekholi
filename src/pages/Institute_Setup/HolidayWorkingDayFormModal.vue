<script setup lang="ts">
// Add / edit modal for Holidays & Working Days — one generic form that
// renders the fields of the active entity (Pathsala-style field set).
import { computed, reactive, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseTimePicker from '@/components/ui/BaseTimePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import holidayTypesJson from '@/assets/jsons/holiday_types.json'
import {
  emptyItem,
  type Holiday,
  type HolidayEntity,
  type HolidayItem,
  type WorkingDay,
} from '@/composables/Institute_Setup/useHolidaysWorkingDays'

const props = defineProps<{
  entity: HolidayEntity
  item: HolidayItem | null
  /** Branch lookups for the "Applicable Branch" combobox. */
  branches: { id?: number; branch_name: string }[]
}>()

const emit = defineEmits<{
  save: [item: HolidayItem]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

// Concrete union so v-model bindings are typed (all fields of both entities).
const form = reactive<Partial<WorkingDay & Holiday>>({
  ...emptyItem(props.entity),
  ...(props.item ? (JSON.parse(JSON.stringify(props.item)) as Partial<WorkingDay & Holiday>) : {}),
})

// ── Option lists ───────────────────────────────────────────────────────

const WEEKDAYS: { en: string; bn: string }[] = [
  { en: 'Sunday', bn: 'রবিবার' },
  { en: 'Monday', bn: 'সোমবার' },
  { en: 'Tuesday', bn: 'মঙ্গলবার' },
  { en: 'Wednesday', bn: 'বুধবার' },
  { en: 'Thursday', bn: 'বৃহস্পতিবার' },
  { en: 'Friday', bn: 'শুক্রবার' },
  { en: 'Saturday', bn: 'শনিবার' },
]

const dayOptions = computed(() =>
  WEEKDAYS.map((d) => ({ Id: d.en, LookupText: d.en, DisplayText: `${d.en} - ${d.bn}` })),
)
const typeOptions = computed(() =>
  (holidayTypesJson as { Id: string; Name: string; Name_bn: string; LookupText: string }[]).map(
    (x) => ({ Id: x.Id, LookupText: x.LookupText, DisplayText: x.LookupText }),
  ),
)
const branchOptions = computed(() => [
  { Id: 0, LookupText: t('All Branches'), DisplayText: t('All Branches') },
  ...props.branches.map((b) => ({
    Id: Number(b.id),
    LookupText: String(b.branch_name),
    DisplayText: String(b.branch_name),
  })),
])

const isHolidays = computed(() => props.entity === 'holidays')

// When Date From changes and Date To is still empty (or pointed at the old
// From), auto-follow it — single-day holidays are the common case.
let lastFrom = String(form.date_from ?? '')
watch(
  () => form.date_from,
  (val, old) => {
    const from = String(val ?? '')
    const to = String(form.date_to ?? '')
    if (from && (!to || to === old || to === lastFrom)) {
      form.date_to = from
    }
    lastFrom = from
  },
)

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  const nameField = props.entity === 'working_days' ? 'day_of_week' : 'holiday_name'
  if (!String(form[nameField] ?? '').trim()) {
    toast.error(props.entity === 'working_days' ? t('Day of week is required') : t('Holiday name is required'))
    return false
  }
  if (props.entity === 'holidays') {
    if (!String(form.date_from ?? '').trim()) {
      toast.error(t('Date from is required'))
      return false
    }
    if (!String(form.holiday_type ?? '').trim()) {
      toast.error(t('Holiday type is required'))
      return false
    }
    const from = String(form.date_from ?? '')
    const to = String(form.date_to ?? '')
    if (to && to < from) {
      toast.error(t('Date to must be on or after date from'))
      return false
    }
  } else {
    const open = String(form.open_time ?? '')
    const close = String(form.close_time ?? '')
    if (open && close && close <= open) {
      toast.error(t('Close time must be after open time'))
      return false
    }
  }
  return true
}

function submit() {
  if (!validate()) return
  const out: Record<string, unknown> = { ...form }
  if (props.entity === 'holidays') {
    // 0 = All Branches
    if (!out.branch_id) out.branch_id = 0
  }
  emit('save', out as unknown as HolidayItem)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone" :class="isHolidays ? 'fa-umbrella-beach' : 'fa-calendar-days'" />
          {{ t('Details') }}
        </h4>
        <div class="ipfp-grid">
          <!-- ── Working day fields ─────────────────────────────────── -->
          <template v-if="!isHolidays">
            <div class="form-field">
              <label>{{ t('Day of Week') }} *</label>
              <BaseCombobox
                v-model="form.day_of_week"
                :options="dayOptions"
                option-value="Id"
                option-label="DisplayText"
                :placeholder="t('Select day')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Is Working') }}</label>
              <BaseToggle v-model="form.is_working" :yes-label="t('Yes')" :no-label="t('No')" />
            </div>
            <div class="form-field">
              <label>{{ t('Start Time') }}</label>
              <BaseTimePicker v-model="form.open_time" :placeholder="t('HH:MM AM/PM')" />
            </div>
            <div class="form-field">
              <label>{{ t('End Time') }}</label>
              <BaseTimePicker v-model="form.close_time" :placeholder="t('HH:MM AM/PM')" />
            </div>
          </template>

          <!-- ── Holiday fields (Pathsala-style) ─────────────────────── -->
          <template v-else>
            <div class="form-field">
              <label>{{ t('Holiday Name') }} *</label>
              <input v-model="form.holiday_name" type="text" :placeholder="t('e.g. Independence Day')" />
            </div>
            <div class="form-field">
              <label>{{ t('Holiday Name (Bangla)') }}</label>
              <input v-model="form.holiday_name_bn" type="text" :placeholder="t('e.g. স্বাধীনতা দিবস')" />
            </div>
            <div class="form-field">
              <label>{{ t('Date From') }} *</label>
              <BaseDatePicker v-model="form.date_from" :placeholder="t('DD/MM/YYYY')" />
            </div>
            <div class="form-field">
              <label>{{ t('Date To') }}</label>
              <BaseDatePicker v-model="form.date_to" :placeholder="t('DD/MM/YYYY')" />
            </div>
            <div class="form-field">
              <label>{{ t('Holiday Type') }} *</label>
              <BaseCombobox
                v-model="form.holiday_type"
                :options="typeOptions"
                option-value="Id"
                option-label="DisplayText"
                :placeholder="t('Select type')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Applicable Branch') }}</label>
              <BaseCombobox
                v-model="form.branch_id"
                :options="branchOptions"
                option-value="Id"
                option-label="DisplayText"
                :placeholder="t('All Branches')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Repeats Every Year') }}</label>
              <BaseToggle v-model="form.is_recurring" :yes-label="t('Yes')" :no-label="t('No')" />
              <small class="form-hint">{{ t('Fixed-date holidays repeat automatically (e.g. 21 Feb, 16 Dec)') }}</small>
            </div>
            <div class="form-field">
              <label>{{ t('Special Working Day') }}</label>
              <BaseToggle v-model="form.is_working_override" :yes-label="t('Yes')" :no-label="t('No')" />
              <small class="form-hint">{{ t('A closed day that will remain open (e.g. Friday class)') }}</small>
            </div>
            <div class="form-field ipf-field--span2">
              <label>{{ t('Remarks') }}</label>
              <textarea
                v-model="form.remarks"
                rows="3"
                :placeholder="t('Optional notes…')"
              />
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
