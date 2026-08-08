<!-- Institute Setup > Grading Scheme -->
<script setup lang="ts">
// Grading Scheme management: named sets of grade rows + scale assigned to
// class levels. DataTable + Add/Edit modal (repeatable grade rows) + Active
// toggle + Excel export/import with cross-check (only NEW rows are stored).
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchSchemes,
  saveScheme,
  deleteScheme,
  importSchemes,
  type GradingScheme,
} from '@/composables/Institute_Setup/useGradingSchemes'
import {
  exportSchemesToExcel,
  importSchemesFromExcel,
} from '@/composables/Institute_Setup/useGradingSchemesExcel'
import { fetchItems, type ClassSetupItem } from '@/composables/Institute_Setup/useClassesSetup'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import GradingSchemeFormModal from './GradingSchemeFormModal.vue'
import gradingTypesJson from '@/assets/jsons/grading_types.json'

defineOptions({ name: 'GradingSchemesView' })

const { t } = useTranslator()
const toast = useToast()

const schemes = ref<GradingScheme[]>([])
const classes = ref<ClassSetupItem[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingScheme = ref<GradingScheme | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning a scheme OFF.
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<GradingScheme | null>(null)

const typeLabel = computed(() => {
  const map = new Map(
    (gradingTypesJson as { Id: string; Name: string }[]).map((x) => [x.Id, x.Name]),
  )
  return (id: unknown) => map.get(String(id ?? '')) ?? String(id ?? '')
})

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'scheme_name', label: t('Scheme Name'), sortable: true },
  { key: 'scheme_name_bn', label: t('Bangla'), sortable: true },
  { key: 'grading_type', label: t('Type'), sortable: true, sortValue: (r) => typeLabel.value((r as Record<string, unknown>).grading_type), render: (r) => typeLabel.value((r as Record<string, unknown>).grading_type) },
  { key: 'class_level_ids', label: t('Class Levels'), sortable: true, sortValue: (r) => classLevelsLabel((r as Record<string, unknown>).class_level_ids), render: (r) => classLevelsLabel((r as Record<string, unknown>).class_level_ids) },
  { key: 'board_id', label: t('Board'), sortable: true, render: (r) => String((r as Record<string, unknown>).board_id ?? '') || '—' },
  { key: 'pass_marks', label: t('Pass Marks'), align: 'center', sortable: true },
  { key: 'grades', label: t('Grades'), align: 'center', sortable: true, sortValue: (r) => ((r as Record<string, unknown>).grades as unknown[] | undefined)?.length ?? 0, render: (r) => String(((r as Record<string, unknown>).grades as unknown[] | undefined)?.length ?? 0) },
  { key: 'is_default', label: t('Default'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_default ? t('Yes') : t('No')) },
  { key: 'is_active', label: t('Active'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
])

// ── Data helpers ───────────────────────────────────────────────────────

function f(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key]
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
  const [s, c] = await Promise.all([fetchSchemes(), fetchItems('classes')])
  schemes.value = s
  classes.value = c
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingScheme.value = null
  showForm.value = true
}
function openEdit(item: GradingScheme) {
  editingScheme.value = item
  showForm.value = true
}

async function onSave(scheme: GradingScheme) {
  const saved = await saveScheme(scheme)
  if (saved) {
    toast.success(scheme.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: GradingScheme) {
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete "{name}"?', { name: item.scheme_name }))
  if (!ok) return
  const deleted = await deleteScheme(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveScheme({ ...item, id: undefined })
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
function onToggleActive(item: GradingScheme) {
  const currentlyOn = Boolean(f(item, 'is_active'))
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: GradingScheme, value: boolean) {
  const updated = { ...item, is_active: value }
  const saved = await saveScheme(updated)
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
    exportSchemesToExcel(schemes.value)
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
    const { schemes: imported } = await importSchemesFromExcel(file)
    const result = await importSchemes(imported)
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
        <h1>{{ t('Grading Scheme') }}</h1>
        <p>{{ t('Define grade sets (GPA 5.00, percentage, pass/fail…) for your class levels.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Scheme') }}
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
      :rows="schemes"
      row-key="id"
      default-sort-key="scheme_name"
      :empty-text="t('No schemes yet. Click “Add Scheme” to create the first one.')"
    >
      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_active'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as GradingScheme)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as GradingScheme)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as GradingScheme)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating a scheme -->
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
              name: activeToggleTarget?.scheme_name ?? '',
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

    <!-- Form modal (Add/Edit scheme) -->
    <BaseModal
      v-if="showForm"
      :title="editingScheme ? t('Edit') : t('Add Scheme')"
      wide
      panel-class="gs-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <GradingSchemeFormModal
        :scheme="editingScheme"
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
.gs-form-modal {
  min-height: 65vh;
  max-height: 100vh;
}
</style>
