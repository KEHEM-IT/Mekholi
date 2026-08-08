<!-- Institute Setup > Subjects & Curriculum -->
<script setup lang="ts">
// Subjects & Curriculum: the subject catalogue (built-in BD curriculum
// seeded) + per-class marks distribution. DataTable + Add/Edit modal +
// Active toggle + Excel export/import with cross-check (only NEW rows).
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchSubjects,
  saveSubject,
  deleteSubject,
  importSubjects,
  type Subject,
} from '@/composables/Institute_Setup/useSubjects'
import {
  exportSubjectsToExcel,
  importSubjectsFromExcel,
} from '@/composables/Institute_Setup/useSubjectsExcel'
import { fetchBoards, type Board } from '@/composables/Institute_Setup/useBoards'
import { fetchItems, type ClassSetupItem } from '@/composables/Institute_Setup/useClassesSetup'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import SubjectFormModal from './SubjectFormModal.vue'
import subjectTypesJson from '@/assets/jsons/subject_types.json'

defineOptions({ name: 'SubjectsView' })

const { t } = useTranslator()
const toast = useToast()

const subjects = ref<Subject[]>([])
const boards = ref<Board[]>([])
const groups = ref<ClassSetupItem[]>([])
const classes = ref<ClassSetupItem[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingSubject = ref<Subject | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning a subject OFF.
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<Subject | null>(null)

const typeLabel = computed(() => {
  const map = new Map(
    (subjectTypesJson as { Id: string; LookupText: string }[]).map((x) => [x.Id, x.LookupText]),
  )
  return (id: unknown) => map.get(String(id ?? '')) ?? String(id ?? '')
})

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'subject_name', label: t('Subject Name'), sortable: true },
  { key: 'subject_code', label: t('Code'), sortable: true, align: 'center' },
  { key: 'subject_type', label: t('Type'), sortable: true, sortValue: (r) => typeLabel.value((r as Record<string, unknown>).subject_type), render: (r) => typeLabel.value((r as Record<string, unknown>).subject_type) },
  { key: 'board_id', label: t('Board'), sortable: true, sortValue: (r) => boardLabel((r as Record<string, unknown>).board_id), render: (r) => boardLabel((r as Record<string, unknown>).board_id) },
  { key: 'group_id', label: t('Group'), sortable: true, sortValue: (r) => groupLabel((r as Record<string, unknown>).group_id), render: (r) => groupLabel((r as Record<string, unknown>).group_id) },
  { key: 'version', label: t('Version'), sortable: true, render: (r) => String((r as Record<string, unknown>).version ?? '') || '—' },
  { key: 'class_level_ids', label: t('Class Levels'), sortable: true, sortValue: (r) => classLevelsLabel((r as Record<string, unknown>).class_level_ids), render: (r) => classLevelsLabel((r as Record<string, unknown>).class_level_ids) },
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

function groupLabel(id: unknown): string {
  const n = Number(id)
  if (!n) return t('All Groups')
  const g = groups.value.find((x) => x.id === n) as unknown as { group_name?: string } | undefined
  return g?.group_name ?? String(id ?? '')
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
  const [s, b, g, c] = await Promise.all([
    fetchSubjects(), fetchBoards(), fetchItems('groups'), fetchItems('classes'),
  ])
  subjects.value = s
  boards.value = b
  groups.value = g
  classes.value = c
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingSubject.value = null
  showForm.value = true
}
function openEdit(item: Subject) {
  editingSubject.value = item
  showForm.value = true
}

async function onSave(subject: Subject) {
  const saved = await saveSubject(subject)
  if (saved) {
    toast.success(subject.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: Subject) {
  // Built-in BD curriculum subjects are part of the registry — not deletable.
  if (item.is_builtin) {
    toast.error(t('Built-in subjects cannot be deleted'))
    return
  }
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete "{name}"?', { name: item.subject_name }))
  if (!ok) return
  const deleted = await deleteSubject(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveSubject({ ...item, id: undefined })
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
function onToggleActive(item: Subject) {
  const currentlyOn = Boolean(f(item, 'is_active'))
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: Subject, value: boolean) {
  const updated = { ...item, is_active: value }
  const saved = await saveSubject(updated)
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
    exportSubjectsToExcel(subjects.value)
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
    // Import = cross-check + add only NEW rows; existing name+board are kept.
    const { subjects: imported } = await importSubjectsFromExcel(file)
    const result = await importSubjects(imported)
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
        <h1>{{ t('Subjects & Curriculum') }}</h1>
        <p>{{ t('Manage the subject catalogue for your boards, classes and groups.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Subject') }}
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
      :rows="subjects"
      row-key="id"
      default-sort-key="subject_name"
      :empty-text="t('No subjects yet. Click “Add Subject” to create the first one.')"
    >
      <template #subject_name="{ row }">
        <span class="brd-name">
          {{ f(row, 'subject_name') }}
          <span v-if="f(row, 'is_builtin')" class="brd-badge">{{ t('Built-in') }}</span>
        </span>
      </template>

      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_active'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as Subject)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as Subject)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button
          v-if="!f(row, 'is_builtin')"
          type="button"
          class="btn btn--ghost br-card__btn br-card__btn--danger"
          @click="onDelete(row as Subject)"
        >
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating a subject -->
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
              name: activeToggleTarget?.subject_name ?? '',
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

    <!-- Form modal (Add/Edit subject) -->
    <BaseModal
      v-if="showForm"
      :title="editingSubject ? t('Edit') : t('Add Subject')"
      wide
      panel-class="sub-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <SubjectFormModal
        :subject="editingSubject"
        :boards="boards"
        :groups="groups"
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
.sub-form-modal {
  min-height: 65vh;
  max-height: 100vh;
}
</style>
