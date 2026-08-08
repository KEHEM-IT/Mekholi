<!-- Admission > Admission Tests Page -->
<script setup lang="ts">
// Admission Tests Schedule: manages the dates, times, venues, and caps for
// intake written/MCQ/viva exams. Fully integrated with physical classrooms,
// bilingual presets, and bulk Excel import/export.
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchAdmissionTests,
  saveAdmissionTest,
  deleteAdmissionTest,
  importAdmissionTests,
  type AdmissionTest,
} from '@/composables/Admission/useAdmissionTests'
import {
  exportTestsToExcel,
  importTestsFromExcel,
} from '@/composables/Admission/useAdmissionTestsExcel'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchItems, type Room } from '@/composables/Institute_Setup/useRoomsBuildings'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import AdmissionTestFormModal from './AdmissionTestFormModal.vue'

defineOptions({ name: 'AdmissionTestsView' })

const { t, lang } = useTranslator()
const toast = useToast()

const tests = ref<AdmissionTest[]>([])
const years = ref<AcademicYear[]>([])
const rooms = ref<Room[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingTest = ref<AdmissionTest | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning a test schedule to inactive
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<AdmissionTest | null>(null)

const roomLabel = computed(() => {
  return (id: unknown) => {
    const r = rooms.value.find((x) => x.id === Number(id))
    if (!r) return '—'
    return r.room_no_bn && lang.value === 'bn' ? `রুম ${r.room_no_bn}` : `Room ${r.room_no}`
  }
})

const yearLabel = computed(() => {
  return (id: unknown) => {
    const y = years.value.find((x) => x.id === Number(id))
    return y ? y.year_name : String(id ?? '')
  }
})

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'test_name', label: t('Test Name'), sortable: true, render: (r) => renderTestName(r as AdmissionTest) },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'academic_year_id', label: t('Year'), sortable: true, render: (r) => yearLabel.value((r as AdmissionTest).academic_year_id) },
  { key: 'test_date', label: t('Date'), sortable: true, render: (r) => formatDate((r as AdmissionTest).test_date) },
  { key: 'time', label: t('Time'), render: (r) => renderTime(r as AdmissionTest) },
  { key: 'room_id', label: t('Venue'), sortable: true, render: (r) => roomLabel.value((r as AdmissionTest).room_id) },
  { key: 'max_written_marks', label: t('Written'), sortable: true, align: 'center', render: (r) => ((r as AdmissionTest).has_written ? renderScore((r as AdmissionTest).max_written_marks) : '—') },
  { key: 'max_mcq_marks', label: t('MCQ'), sortable: true, align: 'center', render: (r) => ((r as AdmissionTest).has_mcq ? renderScore((r as AdmissionTest).max_mcq_marks) : '—') },
  { key: 'max_viva_marks', label: t('VIVA'), sortable: true, align: 'center', render: (r) => ((r as AdmissionTest).has_viva ? renderScore((r as AdmissionTest).max_viva_marks) : '—') },
  { key: 'is_active', label: t('Active'), align: 'center', sortable: true },
])

// ── Render Helpers ─────────────────────────────────────────────────────

function renderTestName(row: AdmissionTest): string {
  if (row.test_name_bn && lang.value === 'bn') {
    return row.test_name_bn
  }
  return row.test_name
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

function renderTime(row: AdmissionTest): string {
  if (!row.start_time) return '—'
  return row.end_time ? `${row.start_time} - ${row.end_time}` : row.start_time
}

function renderScore(score: number | null | undefined): string {
  if (score == null || score === 0) return '0'
  return String(score)
}

async function loadAll() {
  const [tData, y, r] = await Promise.all([fetchAdmissionTests(), fetchAcademicYears(), fetchItems('rooms')])
  tests.value = tData
  years.value = y
  rooms.value = r as Room[]
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingTest.value = null
  showForm.value = true
}

function openEdit(item: AdmissionTest) {
  editingTest.value = item
  showForm.value = true
}

async function onSave(test: AdmissionTest) {
  const saved = await saveAdmissionTest(test)
  if (saved) {
    toast.success(test.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: AdmissionTest) {
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete exam schedule for "{name}"?', { name: item.test_name }))
  if (!ok) return
  const deleted = await deleteAdmissionTest(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveAdmissionTest({ ...item, id: undefined })
        if (restored) {
          toast.success(t('Restored'))
          await loadAll()
        } else {
          toast.error(t('Restore failed'))
        }
      },
    })
  } else {
    toast.error(t('Delete failed'))
  }
}

/** Active toggle — turning OFF asks for confirmation. */
function onToggleActive(item: AdmissionTest) {
  const currentlyOn = Boolean(item.is_active)
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: AdmissionTest, value: boolean) {
  const updated = { ...item, is_active: value }
  const saved = await saveAdmissionTest(updated)
  if (saved) {
    toast.success(t('Updated'))
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

function confirmDeactivate() {
  const target = activeToggleTarget.value
  if (target) void applyActive(target, false)
  showActiveConfirm.value = false
  activeToggleTarget.value = null
}

// ── Excel ──────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportTestsToExcel(tests.value)
    toast.success(t('Excel downloaded'))
  } catch (err) {
    toast.error(t('Export failed: {error}', { error: err instanceof Error ? err.message : 'unknown' }))
  }
}

function triggerImport() {
  if (!isImporting.value) excelInput.value?.click()
}

async function onImportPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  isImporting.value = true
  try {
    const { tests: imported } = await importTestsFromExcel(file)
    const result = await importAdmissionTests(imported)
    if (!result.ok) throw new Error('server')
    if (result.inserted === 0 && imported.length > 0) {
      toast.success(t('All {count} rows already existed — nothing new added', { count: imported.length }))
    } else {
      toast.success(
        t('{added} added · {skipped} already existed', {
          added: result.inserted,
          skipped: result.skipped.length,
        }),
      )
    }
    await loadAll()
  } catch (err) {
    toast.error(t('Import failed: {error}', { error: err instanceof Error ? err.message : 'invalid file' }))
  } finally {
    isImporting.value = false
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
        <span class="skeleton ipf-skeleton__pill" />
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
        <h1>{{ t('Admission Tests') }}</h1>
        <p>{{ t('Define written and viva exam schedules, assign classroom/venue, and allocate maximum marks per class.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Exam Schedule') }}
        </button>
        <button type="button" class="btn ipf-header__export" @click="handleExport">
          <i class="fa-duotone fa-file-excel" /> {{ t('Export') }}
        </button>
        <button type="button" class="btn ipf-header__import" :disabled="isImporting" @click="triggerImport">
          <i class="fa-duotone" :class="isImporting ? 'fa-spinner fa-spin' : 'fa-file-import'" />
          {{ t('Import') }}
        </button>
      </div>
      <input ref="excelInput" type="file" accept=".xlsx,.xls" class="ipf-logo__input" @change="onImportPicked" />
    </header>

    <!-- Data table (reusable, sticky head, sortable) -->
    <DataTable
      :columns="tableColumns"
      :rows="tests"
      row-key="id"
      default-sort-key="test_date"
      :empty-text="t('No admission test schedules defined yet. Click “Add Exam Schedule” to create the first one.')"
    >
      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean((row as AdmissionTest).is_active)"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as AdmissionTest)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as AdmissionTest)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as AdmissionTest)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating a test schedule -->
    <BaseModal
      v-if="showActiveConfirm"
      :title="t('Deactivate schedule')"
      @close="showActiveConfirm = false"
    >
      <div class="cm-confirm">
        <div class="cm-confirm__icon"><i class="fa-duotone fa-triangle-exclamation" /></div>
        <p class="cm-confirm__text">
          {{
            t('Are you sure you want to deactivate "{name}"? It will hide this schedule from parents and public dashboards.', {
              name: activeToggleTarget ? activeToggleTarget.test_name : '',
            })
          }}
        </p>
      </div>
      <template #footer>
        <button type="button" class="btn" @click="showActiveConfirm = false">
          {{ t('Cancel') }}
        </button>
        <button type="button" class="btn btn--danger" @click="confirmDeactivate">
          <i class="fa-duotone fa-power-off" /> {{ t('Deactivate') }}
        </button>
      </template>
    </BaseModal>

    <!-- Form modal (Add/Edit admission test) -->
    <BaseModal
      v-if="showForm"
      :title="editingTest ? t('Edit Exam Schedule') : t('Add Exam Schedule')"
      wide
      panel-class="test-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <AdmissionTestFormModal
        :test="editingTest"
        :years="years"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
