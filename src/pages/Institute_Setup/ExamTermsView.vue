<!-- Institute Setup > Exam Terms & Types -->
<script setup lang="ts">
// Exam Terms & Types: the exam calendar configuration (which exams happen
// when, for which classes, under which board, with which grading scheme).
// Built-in BD exam terms seeded; DataTable + Add/Edit modal + toggles +
// Excel export/import with cross-check (only NEW rows are stored).
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchExamTerms,
  saveExamTerm,
  deleteExamTerm,
  importExamTerms,
  type ExamTerm,
} from '@/composables/Institute_Setup/useExamTerms'
import {
  exportExamTermsToExcel,
  importExamTermsFromExcel,
} from '@/composables/Institute_Setup/useExamTermsExcel'
import { fetchBoards, type Board } from '@/composables/Institute_Setup/useBoards'
import { fetchSchemes, type GradingScheme } from '@/composables/Institute_Setup/useGradingSchemes'
import { fetchItems, type ClassSetupItem } from '@/composables/Institute_Setup/useClassesSetup'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import ExamTermFormModal from './ExamTermFormModal.vue'
import examTypeCatsJson from '@/assets/jsons/exam_type_categories.json'

defineOptions({ name: 'ExamTermsView' })

const { t } = useTranslator()
const toast = useToast()

const exams = ref<ExamTerm[]>([])
const boards = ref<Board[]>([])
const schemes = ref<GradingScheme[]>([])
const classes = ref<ClassSetupItem[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingExam = ref<ExamTerm | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning an exam term OFF.
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<ExamTerm | null>(null)

const typeLabel = computed(() => {
  const map = new Map(
    (examTypeCatsJson as { Id: string; LookupText: string }[]).map((x) => [x.Id, x.LookupText]),
  )
  return (id: unknown) => map.get(String(id ?? '')) ?? String(id ?? '')
})

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'exam_name', label: t('Exam Name'), sortable: true },
  { key: 'exam_type', label: t('Type'), sortable: true, sortValue: (r) => typeLabel.value((r as Record<string, unknown>).exam_type), render: (r) => typeLabel.value((r as Record<string, unknown>).exam_type) },
  { key: 'board_id', label: t('Board'), sortable: true, sortValue: (r) => boardLabel((r as Record<string, unknown>).board_id), render: (r) => boardLabel((r as Record<string, unknown>).board_id) },
  { key: 'exam_start', label: t('Start'), sortable: true },
  { key: 'exam_end', label: t('End'), sortable: true, render: (r) => String((r as Record<string, unknown>).exam_end ?? '') || '—' },
  { key: 'class_ids', label: t('Classes'), sortable: true, sortValue: (r) => classLevelsLabel((r as Record<string, unknown>).class_ids), render: (r) => classLevelsLabel((r as Record<string, unknown>).class_ids) },
  { key: 'scheme_id', label: t('Scheme'), sortable: true, sortValue: (r) => schemeLabel((r as Record<string, unknown>).scheme_id), render: (r) => schemeLabel((r as Record<string, unknown>).scheme_id) },
  { key: 'publish_to_portal', label: t('Publish'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).publish_to_portal ? t('Yes') : t('No')) },
  { key: 'is_board_exam', label: t('Board Exam'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_board_exam ? t('Yes') : t('No')) },
  { key: 'is_active', label: t('Active'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
])

// ── Data helpers ───────────────────────────────────────────────────────

function f(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key]
}

function boardLabel(id: unknown): string {
  const n = Number(id)
  if (!n) return '—'
  return boards.value.find((b) => b.id === n)?.board_name ?? String(id ?? '')
}

function schemeLabel(id: unknown): string {
  const n = Number(id)
  if (!n) return '—'
  return schemes.value.find((s) => s.id === n)?.scheme_name ?? String(id ?? '')
}

function classLevelsLabel(ids: unknown): string {
  const arr = Array.isArray(ids) ? (ids as number[]) : []
  if (!arr.length) return '—'
  const names = arr
    .map((id) => {
      const c = classes.value.find((x) => x.id === Number(id)) as unknown as { class_name?: string } | undefined
      return c?.class_name ?? ''
    })
    .filter(Boolean)
  return names.length ? names.join(', ') : arr.join(', ')
}

async function loadAll() {
  const [e, b, s, c] = await Promise.all([
    fetchExamTerms(), fetchBoards(), fetchSchemes(), fetchItems('classes'),
  ])
  exams.value = e
  boards.value = b
  schemes.value = s
  classes.value = c
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingExam.value = null
  showForm.value = true
}
function openEdit(item: ExamTerm) {
  editingExam.value = item
  showForm.value = true
}

async function onSave(exam: ExamTerm) {
  const saved = await saveExamTerm(exam)
  if (saved) {
    toast.success(exam.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: ExamTerm) {
  // Built-in BD exam terms are part of the registry — not deletable.
  if (item.is_builtin) {
    toast.error(t('Built-in exam terms cannot be deleted'))
    return
  }
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete "{name}"?', { name: item.exam_name }))
  if (!ok) return
  const deleted = await deleteExamTerm(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveExamTerm({ ...item, id: undefined })
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
function onToggleActive(item: ExamTerm) {
  const currentlyOn = Boolean(f(item, 'is_active'))
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: ExamTerm, value: boolean) {
  const updated = { ...item, is_active: value }
  const saved = await saveExamTerm(updated)
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
    exportExamTermsToExcel(exams.value)
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
    // Import = cross-check + add only NEW rows; existing names are kept.
    const { exams: imported } = await importExamTermsFromExcel(file)
    const result = await importExamTerms(imported)
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
        <h1>{{ t('Exam Terms & Types') }}</h1>
        <p>{{ t('Configure the exam calendar — which exams happen when, for which classes.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Exam Term') }}
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
      :rows="exams"
      row-key="id"
      default-sort-key="exam_name"
      :empty-text="t('No exam terms yet. Click “Add Exam Term” to create the first one.')"
    >
      <template #exam_name="{ row }">
        <span class="brd-name">
          {{ f(row, 'exam_name') }}
          <span v-if="f(row, 'is_builtin')" class="brd-badge">{{ t('Built-in') }}</span>
        </span>
      </template>

      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_active'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as ExamTerm)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as ExamTerm)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button
          v-if="!f(row, 'is_builtin')"
          type="button"
          class="btn btn--ghost br-card__btn br-card__btn--danger"
          @click="onDelete(row as ExamTerm)"
        >
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating an exam term -->
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
              name: activeToggleTarget?.exam_name ?? '',
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

    <!-- Form modal (Add/Edit exam term) -->
    <BaseModal
      v-if="showForm"
      :title="editingExam ? t('Edit') : t('Add Exam Term')"
      wide
      panel-class="exm-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <ExamTermFormModal
        :exam="editingExam"
        :boards="boards"
        :schemes="schemes"
        :classes="classes"
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
.exm-form-modal {
  min-height: 65vh;
  max-height: 100vh;
}
</style>
