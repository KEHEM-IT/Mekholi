<script setup lang="ts">
// Form modal to confirm class seat capacity and bulk publish/lock merit-ranking rosters.
import { computed, ref } from 'vue'
import { useTranslator } from '@/Translator'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

const props = defineProps<{
  years: { id?: number; year_name: string }[]
}>()

const emit = defineEmits<{
  publish: [payload: { className: string; capacity: number; academicYearId: number }]
  close: []
}>()

const { t } = useTranslator()

const selectedClass = ref('')
const selectedYearId = ref<number | null>(null)
const seatCapacity = ref(30)

// Default year mapping
if (props.years.length > 0) {
  selectedYearId.value = Number(props.years[0].id)
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

function submit() {
  if (!selectedClass.value) {
    return
  }
  if (!selectedYearId.value) {
    return
  }
  emit('publish', {
    className: selectedClass.value,
    capacity: seatCapacity.value,
    academicYearId: selectedYearId.value,
  })
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Section 1: Parameters -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-sliders" />
          {{ t('Select Ranking Scope & Capacity') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Target Class') }} *</label>
            <BaseCombobox
              v-model="selectedClass"
              :options="classOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select class')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Academic Intake Year') }} *</label>
            <BaseCombobox
              v-model="selectedYearId"
              :options="yearOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select year')"
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Seat Intake Capacity (Winners Cap)') }} *</label>
            <input
              v-model.number="seatCapacity"
              type="number"
              min="1"
              :placeholder="t('e.g. 30')"
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
      <button type="button" class="btn btn--primary" :disabled="!selectedClass" @click="submit">
        <i class="fa-duotone fa-table-list" />
        {{ t('Compile Merit Roster') }}
      </button>
    </div>
  </div>
</template>
