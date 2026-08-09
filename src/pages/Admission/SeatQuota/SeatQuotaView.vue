<!-- Admission > Seat/Quota Planning Page -->
<script setup lang="ts">
// Seat/Quota Planning: allows school administrators to plan and configure the
// available student seat intake capacities and individual quota distributions (General,
// Freedom Fighter, Sibling, Disabled) per class level.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchItems, saveItem, type ClassItem } from '@/composables/Institute_Setup/useClassesSetup'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import SeatQuotaFormModal from './SeatQuotaFormModal.vue'

defineOptions({ name: 'SeatQuotaView' })

const { t, lang } = useTranslator()
const toast = useToast()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const allClasses = ref<ClassItem[]>([])
const filteredClasses = ref<ClassItem[]>([])

// Selection state
const activeYearId = ref<number | null>(null)

const showForm = ref(false)
const editingClass = ref<ClassItem | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'class_name', label: t('Class Level'), sortable: true, render: (r) => renderClassName(r as ClassItem) },
  { key: 'intake_capacity', label: t('Total Seats'), sortable: true, align: 'center' },
  { key: 'quota_general', label: t('General Merit Quota (%)'), sortable: true, align: 'center', render: (r) => `${(r as ClassItem).quota_general ?? 80}%` },
  { key: 'quota_freedom_fighter', label: t('Freedom Fighter Quota (%)'), sortable: true, align: 'center', render: (r) => `${(r as ClassItem).quota_freedom_fighter ?? 10}%` },
  { key: 'quota_disabled', label: t('Disabled / Special Needs (%)'), sortable: true, align: 'center', render: (r) => `${(r as ClassItem).quota_disabled ?? 5}%` },
  { key: 'quota_staff', label: t('Staff Sibling Quota (%)'), sortable: true, align: 'center', render: (r) => `${(r as ClassItem).quota_staff ?? 5}%` },
])

const yearOptions = computed(() =>
  years.value.map((y) => ({
    Id: Number(y.id),
    LookupText: String(y.year_name),
    DisplayText: String(y.year_name),
  })),
)

// ── Render Helpers ─────────────────────────────────────────────────────

function renderClassName(row: ClassItem): string {
  if (row.class_name_bn && lang.value === 'bn') {
    return row.class_name_bn
  }
  return row.class_name
}

function filterRoster() {
  if (!activeYearId.value) {
    filteredClasses.value = []
    return
  }
  filteredClasses.value = allClasses.value.filter(
    (c) => Number(c.academic_year_id) === Number(activeYearId.value),
  )
}

// Watch selection states to filter roster
watch([activeYearId, allClasses], () => {
  filterRoster()
})

async function loadAll() {
  const [classes, y] = await Promise.all([fetchItems('classes'), fetchAcademicYears()])
  allClasses.value = classes as ClassItem[]
  years.value = y
  if (y.length > 0) {
    activeYearId.value = Number(y[0].id)
  }
  filterRoster()
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openEdit(item: ClassItem) {
  editingClass.value = item
  showForm.value = true
}

async function onSave(item: ClassItem) {
  const saved = await saveItem('classes', item)
  if (saved) {
    toast.success(t('Successfully updated seat and quota allocations!'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}
</script>

<template>
  <!-- Skeleton Loader matching established standards -->
  <section v-if="isPageLoading" class="ipf-skeleton" aria-busy="true">
    <div class="ipf-skeleton__header">
      <div class="ipf-skeleton__titles">
        <span class="skeleton ipf-skeleton__title" />
        <span class="skeleton ipf-skeleton__subtitle" />
      </div>
      <div class="ipf-skeleton__actions">
        <span class="skeleton ipf-skeleton__pill" />
      </div>
    </div>
    <div class="skeleton skeleton--card ipf-sk-section">
      <span class="skeleton ipf-sk-section-title" />
      <div class="ipf-sk-grid ipf-sk-grid--three">
        <span v-for="m in 6" :key="m" class="skeleton ipf-sk-field" />
      </div>
    </div>
  </section>

  <section v-else class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Seat/Quota Planning') }}</h1>
        <p>{{ t('Define available seat intake capacities and map quota percentage boundaries for each class level.') }}</p>
      </div>
    </header>

    <!-- Selection filters -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-sliders" />
        {{ t('Select Intake Scope') }}
      </h4>
      <div class="ipf-grid">
        <div class="form-field">
          <label>{{ t('Academic Intake Year') }} *</label>
          <BaseCombobox
            v-model="activeYearId"
            :options="yearOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select year')"
          />
        </div>
      </div>
    </div>

    <!-- Data table (reusable, sticky head, sortable) -->
    <DataTable
      :columns="tableColumns"
      :rows="filteredClasses"
      row-key="id"
      default-sort-key="class_name"
      :empty-text="t('No class levels found in the selected sessional year.')"
    >
      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as ClassItem)">
          <i class="fa-duotone fa-sliders" /> {{ t('Configure') }}
        </button>
      </template>
    </DataTable>

    <!-- Form modal (Audit Seat/Quota Allocation) -->
    <BaseModal
      v-if="showForm"
      :title="t('Configure Class Intake Capacity')"
      wide
      panel-class="seat-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <SeatQuotaFormModal
        v-if="editingClass"
        :class-item="editingClass"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
