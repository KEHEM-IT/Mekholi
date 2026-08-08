<!-- Admission > Admission Enquiries Page -->
<script setup lang="ts">
// Admission Enquiries: leads, inquiries, and follow-ups tracker for both
// national (Bangladesh) and international applicants. Supports full CRUD,
// status tracking, bilingual/international format validation, and Excel import/export.
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchEnquiries,
  saveEnquiry,
  deleteEnquiry,
  importEnquiries,
  type AdmissionEnquiry,
} from '@/composables/Admission/useAdmissionEnquiries'
import {
  exportEnquiriesToExcel,
  importEnquiriesFromExcel,
} from '@/composables/Admission/useAdmissionEnquiriesExcel'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import AdmissionEnquiryFormModal from './AdmissionEnquiryFormModal.vue'

defineOptions({ name: 'AdmissionEnquiriesView' })

const { t } = useTranslator()
const toast = useToast()

const enquiries = ref<AdmissionEnquiry[]>([])
const years = ref<AcademicYear[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingEnquiry = ref<AdmissionEnquiry | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning an enquiry status to inactive
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<AdmissionEnquiry | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'candidate_name', label: t('Candidate'), sortable: true, render: (r) => renderCandidateName(r as AdmissionEnquiry) },
  { key: 'guardian_name', label: t('Guardian / Contact'), sortable: true, render: (r) => renderGuardianAndPhone(r as AdmissionEnquiry) },
  { key: 'desired_class', label: t('Class'), sortable: true },
  { key: 'version', label: t('Version'), sortable: true, render: (r) => (r as AdmissionEnquiry).version || t('—') },
  { key: 'enquiry_date', label: t('Date'), sortable: true, render: (r) => formatDate((r as AdmissionEnquiry).enquiry_date) },
  { key: 'source', label: t('Source'), sortable: true, render: (r) => t((r as AdmissionEnquiry).source) },
  { key: 'status', label: t('Status'), sortable: true, align: 'center' },
  { key: 'is_active', label: t('Active'), align: 'center', sortable: true },
])

// ── Render Helpers ─────────────────────────────────────────────────────

function renderCandidateName(row: AdmissionEnquiry): string {
  // Supports national format (Bilingual) & international format
  if (row.candidate_name_bn) {
    return `${row.candidate_name} (${row.candidate_name_bn})`
  }
  return row.candidate_name
}

function renderGuardianAndPhone(row: AdmissionEnquiry): string {
  // If foreign country, append country in subtitle
  const isBD = !row.country || row.country.toLowerCase() === 'bangladesh' || row.country === 'বাংলাদেশ'
  const originSuffix = isBD ? '' : ` [${row.country}]`
  return `${row.guardian_name} — ${row.phone}${originSuffix}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}



async function loadAll() {
  const [e, y] = await Promise.all([fetchEnquiries(), fetchAcademicYears()])
  enquiries.value = e
  years.value = y
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingEnquiry.value = null
  showForm.value = true
}
function openEdit(item: AdmissionEnquiry) {
  editingEnquiry.value = item
  showForm.value = true
}

async function onSave(enquiry: AdmissionEnquiry) {
  const saved = await saveEnquiry(enquiry)
  if (saved) {
    toast.success(enquiry.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: AdmissionEnquiry) {
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete enquiry for "{name}"?', { name: item.candidate_name }))
  if (!ok) return
  const deleted = await deleteEnquiry(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveEnquiry({ ...item, id: undefined })
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
function onToggleActive(item: AdmissionEnquiry) {
  const currentlyOn = Boolean(item.is_active)
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: AdmissionEnquiry, value: boolean) {
  const updated = { ...item, is_active: value }
  const saved = await saveEnquiry(updated)
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
    exportEnquiriesToExcel(enquiries.value)
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
    // Import = cross-check + add only NEW rows; existing candidate+phone kept.
    const { enquiries: imported } = await importEnquiriesFromExcel(file)
    const result = await importEnquiries(imported)
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

function getStatusBadgeClass(status: string): string {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'new') return 'enq-badge enq-badge--new'
  if (s === 'follow-up') return 'enq-badge enq-badge--follow'
  if (s === 'selected') return 'enq-badge enq-badge--selected'
  if (s === 'converted') return 'enq-badge enq-badge--converted'
  if (s === 'rejected') return 'enq-badge enq-badge--rejected'
  return 'enq-badge'
}
</script>

<template>
  <!-- Skeleton loader matching dashboard & profiles -->
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
        <h1>{{ t('Admission Enquiries') }}</h1>
        <p>{{ t('Track pre-admission queries, leads, and counseling follow-ups for prospective national and international students.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('New Enquiry') }}
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
      :rows="enquiries"
      row-key="id"
      default-sort-key="enquiry_date"
      :empty-text="t('No admission enquiries logged yet. Click “New Enquiry” to create the first prospect.')"
    >
      <template #status="{ row }">
        <span :class="getStatusBadgeClass((row as AdmissionEnquiry).status)">
          {{ t((row as AdmissionEnquiry).status) }}
        </span>
      </template>

      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean((row as AdmissionEnquiry).is_active)"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as AdmissionEnquiry)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as AdmissionEnquiry)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as AdmissionEnquiry)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating an enquiry -->
    <BaseModal
      v-if="showActiveConfirm"
      :title="t('Deactivate enquiry')"
      @close="showActiveConfirm = false"
    >
      <div class="cm-confirm">
        <div class="cm-confirm__icon"><i class="fa-duotone fa-triangle-exclamation" /></div>
        <p class="cm-confirm__text">
          {{
            t('Are you sure you want to archive the enquiry of "{name}"? It will mark this inquiry as completed or archived.', {
              name: activeToggleTarget ? activeToggleTarget.candidate_name : '',
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

    <!-- Form modal (Add/Edit admission enquiry) -->
    <BaseModal
      v-if="showForm"
      :title="editingEnquiry ? t('Edit Enquiry') : t('New Enquiry')"
      wide
      panel-class="enq-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <AdmissionEnquiryFormModal
        :enquiry="editingEnquiry"
        :years="years"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>

<style>
/* Status color-coded badge styles */
.enq-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  text-align: center;
}

.enq-badge--new {
  color: var(--color-info);
  border-color: var(--color-info-muted);
  background: var(--color-info-muted);
}

.enq-badge--follow {
  color: var(--color-warning);
  border-color: var(--color-warning-muted);
  background: var(--color-warning-muted);
}

.enq-badge--selected {
  color: var(--color-primary);
  border-color: var(--color-primary-muted);
  background: var(--color-primary-muted);
}

.enq-badge--converted {
  color: var(--color-success);
  border-color: var(--color-success-muted);
  background: var(--color-success-muted);
}

.enq-badge--rejected {
  color: var(--color-danger);
  border-color: var(--color-danger-muted);
  background: var(--color-danger-muted);
}

/* Scoped modal height overrides */
.enq-form-modal {
  min-height: calc(100vh - 12rem);
  max-height: 100vh;
}
</style>
