<!-- Institute Setup > Academic Sessions & Terms -->
<script setup lang="ts">
// Academic Sessions & Terms: splits an academic year into named terms used
// by exams, fees and promotion. One row per term of a session. DataTable +
// Add/Edit modal + toggles + Excel export/import with cross-check (only NEW
// rows are stored).
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchSessions,
  saveSession,
  deleteSession,
  importSessions,
  type AcademicSessionTerm,
} from '@/composables/Institute_Setup/useAcademicSessions'
import {
  exportSessionsToExcel,
  importSessionsFromExcel,
} from '@/composables/Institute_Setup/useAcademicSessionsExcel'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import AcademicSessionFormModal from './AcademicSessionFormModal.vue'
import resultTypesJson from '@/assets/jsons/result_types.json'

defineOptions({ name: 'AcademicSessionsView' })

const { t } = useTranslator()
const toast = useToast()

const sessions = ref<AcademicSessionTerm[]>([])
const years = ref<AcademicYear[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingSession = ref<AcademicSessionTerm | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning a session term OFF.
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<AcademicSessionTerm | null>(null)

const resultTypeLabel = computed(() => {
  const map = new Map(
    (resultTypesJson as { Id: string; LookupText: string }[]).map((x) => [x.Id, x.LookupText]),
  )
  return (id: unknown) => map.get(String(id ?? '')) ?? String(id ?? '')
})

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'session_name', label: t('Session'), sortable: true },
  { key: 'academic_year_id', label: t('Year'), sortable: true, sortValue: (r) => yearLabel((r as Record<string, unknown>).academic_year_id), render: (r) => yearLabel((r as Record<string, unknown>).academic_year_id) },
  { key: 'term_name', label: t('Term'), sortable: true },
  { key: 'term_order', label: t('Order'), sortable: true, align: 'center' },
  { key: 'term_start', label: t('Start'), sortable: true },
  { key: 'term_end', label: t('End'), sortable: true, render: (r) => String((r as Record<string, unknown>).term_end ?? '') || '—' },
  { key: 'result_type', label: t('Result Type'), sortable: true, sortValue: (r) => resultTypeLabel.value((r as Record<string, unknown>).result_type), render: (r) => resultTypeLabel.value((r as Record<string, unknown>).result_type) || '—' },
  { key: 'is_current', label: t('Current'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_current ? t('Yes') : t('No')) },
  { key: 'is_active', label: t('Active'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
])

// ── Data helpers ───────────────────────────────────────────────────────

function f(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key]
}

function yearLabel(id: unknown): string {
  const n = Number(id)
  if (!n) return '—'
  return years.value.find((y) => y.id === n)?.year_name ?? String(id ?? '')
}

function sessionTermName(item: AcademicSessionTerm): string {
  return `${item.session_name} / ${item.term_name}`
}

async function loadAll() {
  const [s, y] = await Promise.all([fetchSessions(), fetchAcademicYears()])
  sessions.value = s
  years.value = y
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingSession.value = null
  showForm.value = true
}
function openEdit(item: AcademicSessionTerm) {
  editingSession.value = item
  showForm.value = true
}

async function onSave(session: AcademicSessionTerm) {
  const saved = await saveSession(session)
  if (saved) {
    toast.success(session.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: AcademicSessionTerm) {
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete "{name}"?', { name: sessionTermName(item) }))
  if (!ok) return
  const deleted = await deleteSession(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveSession({ ...item, id: undefined })
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
function onToggleActive(item: AcademicSessionTerm) {
  const currentlyOn = Boolean(f(item, 'is_active'))
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: AcademicSessionTerm, value: boolean) {
  const updated = { ...item, is_active: value }
  const saved = await saveSession(updated)
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
    exportSessionsToExcel(sessions.value)
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
    // Import = cross-check + add only NEW rows; existing session+term kept.
    const { sessions: imported } = await importSessionsFromExcel(file)
    const result = await importSessions(imported)
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
  <!-- Skeleton -->
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
        <h1>{{ t('Academic Sessions & Terms') }}</h1>
        <p>{{ t('Split your academic year into named terms used by exams, fees and promotion.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Session Term') }}
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
      :rows="sessions"
      row-key="id"
      default-sort-key="session_name"
      :empty-text="t('No session terms yet. Click “Add Session Term” to create the first one.')"
    >
      <template #is_current="{ row }">
        <span v-if="f(row, 'is_current')" class="as-current-chip">
          <i class="fa-duotone fa-circle-check" /> {{ t('Current') }}
        </span>
        <span v-else class="as-current-chip as-current-chip--off">{{ t('—') }}</span>
      </template>

      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_active'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as AcademicSessionTerm)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as AcademicSessionTerm)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as AcademicSessionTerm)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating a session term -->
    <BaseModal
      v-if="showActiveConfirm"
      :title="t('Deactivate item')"
      @close="showActiveConfirm = false"
    >
      <div class="cm-confirm">
        <div class="cm-confirm__icon"><i class="fa-duotone fa-triangle-exclamation" /></div>
        <p class="cm-confirm__text">
          {{
            t('Are you sure you want to deactivate "{name}"? It will be hidden from new selections.', {
              name: activeToggleTarget ? sessionTermName(activeToggleTarget) : '',
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

    <!-- Form modal (Add/Edit session term) -->
    <BaseModal
      v-if="showForm"
      :title="editingSession ? t('Edit') : t('Add Session Term')"
      wide
      panel-class="as-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <AcademicSessionFormModal
        :session="editingSession"
        :years="years"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>

<!--
  Scoped panel sizing for THIS page's Add/Edit form modal only — lives here,
  not in the global modal css (unscoped on purpose: BaseModal teleports to
  <body>, so the unique class is what scopes it to this page's modal).
-->
<style>
.as-form-modal {
  min-height: calc(100vh - 15rem);
  max-height: 100vh;
}
</style>
