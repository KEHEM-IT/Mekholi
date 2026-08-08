<!-- Admission > Applications Page -->
<script setup lang="ts">
// Admission Applications: displays a responsive list of submitted online
// applications, handles screening status, payment matching, exam marks,
// and bulk export/import via Excel.
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchApplications,
  saveApplication,
  deleteApplication,
  importApplications,
  type AdmissionApplication,
} from '@/composables/Admission/useAdmissionApplications'
import {
  exportApplicationsToExcel,
  importApplicationsFromExcel,
} from '@/composables/Admission/useAdmissionApplicationsExcel'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AdmissionApplicationFormModal from './AdmissionApplicationFormModal.vue'

defineOptions({ name: 'ApplicationsView' })

const { t } = useTranslator()
const toast = useToast()

const applications = ref<AdmissionApplication[]>([])
const years = ref<AcademicYear[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingApplication = ref<AdmissionApplication | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'application_no', label: t('Application No'), sortable: true },
  { key: 'candidate_name', label: t('Candidate'), sortable: true, render: (r) => renderCandidateName(r as AdmissionApplication) },
  { key: 'guardian_name', label: t('Guardian / Contact'), sortable: true, render: (r) => renderGuardianAndPhone(r as AdmissionApplication) },
  { key: 'desired_class', label: t('Class'), sortable: true },
  { key: 'payment_status', label: t('Payment'), sortable: true, align: 'center' },
  { key: 'written_marks', label: t('Written'), sortable: true, align: 'center', render: (r) => renderScore((r as AdmissionApplication).written_marks) },
  { key: 'viva_marks', label: t('VIVA'), sortable: true, align: 'center', render: (r) => renderScore((r as AdmissionApplication).viva_marks) },
  { key: 'application_status', label: t('Review Status'), sortable: true, align: 'center' },
])

// ── Render Helpers ─────────────────────────────────────────────────────

function renderCandidateName(row: AdmissionApplication): string {
  if (row.candidate_name_bn) {
    return `${row.candidate_name} (${row.candidate_name_bn})`
  }
  return row.candidate_name
}

function renderGuardianAndPhone(row: AdmissionApplication): string {
  const isBD = !row.country || row.country.toLowerCase() === 'bangladesh' || row.country === 'বাংলাদেশ'
  const originSuffix = isBD ? '' : ` [${row.country}]`
  return `${row.guardian_name} — ${row.phone}${originSuffix}`
}

function renderScore(score: number | null | undefined): string {
  if (score == null || score === 0) return '—'
  return String(score)
}

async function loadAll() {
  const [e, y] = await Promise.all([fetchApplications(), fetchAcademicYears()])
  applications.value = e
  years.value = y
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingApplication.value = null
  showForm.value = true
}

function openEdit(item: AdmissionApplication) {
  editingApplication.value = item
  showForm.value = true
}

async function onSave(app: AdmissionApplication) {
  const saved = await saveApplication(app)
  if (saved) {
    toast.success(app.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: AdmissionApplication) {
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete application "{no}" for "{name}"?', { no: item.application_no, name: item.candidate_name }))
  if (!ok) return
  const deleted = await deleteApplication(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveApplication({ ...item, id: undefined })
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

// ── Excel ──────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportApplicationsToExcel(applications.value)
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
    const { apps: imported } = await importApplicationsFromExcel(file)
    const result = await importApplications(imported)
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

// ── Badges Styling Helpers ─────────────────────────────────────────────

function getPaymentBadgeClass(status: string): string {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'paid') return 'enq-badge enq-badge--converted'
  if (s === 'pending') return 'enq-badge enq-badge--follow'
  if (s === 'failed') return 'enq-badge enq-badge--rejected'
  return 'enq-badge'
}

function getAppStatusBadgeClass(status: string): string {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'submitted') return 'enq-badge enq-badge--new'
  if (s === 'screening') return 'enq-badge enq-badge--follow'
  if (s === 'selected') return 'enq-badge enq-badge--selected'
  if (s === 'rejected') return 'enq-badge enq-badge--rejected'
  if (s === 'archived') return 'enq-badge'
  return 'enq-badge'
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
        <h1>{{ t('Admission Applications') }}</h1>
        <p>{{ t('Review submitted online applicant forms, manage screening stages, input test scores, and track application fees.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('New Application') }}
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
      :rows="applications"
      row-key="id"
      default-sort-key="application_no"
      :empty-text="t('No admission applications submitted yet. Generate them from the portal or create one manually.')"
    >
      <template #payment_status="{ row }">
        <span :class="getPaymentBadgeClass((row as AdmissionApplication).payment_status)">
          {{ t((row as AdmissionApplication).payment_status) }}
        </span>
      </template>

      <template #application_status="{ row }">
        <span :class="getAppStatusBadgeClass((row as AdmissionApplication).application_status)">
          {{ t((row as AdmissionApplication).application_status) }}
        </span>
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as AdmissionApplication)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as AdmissionApplication)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Form modal (Add/Edit admission application) -->
    <BaseModal
      v-if="showForm"
      :title="editingApplication ? t('Edit Application') : t('New Application')"
      wide
      panel-class="enq-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <AdmissionApplicationFormModal
        :application="editingApplication"
        :years="years"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
