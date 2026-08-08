<!-- Institute Setup > Board & Regulatory Setup -->
<script setup lang="ts">
// Board & Regulatory Setup: registry of external boards/authorities the
// institute reports to + per-board regulatory info. DataTable + Add/Edit
// modal (collapsed regulatory block) + Active toggle + Excel export/import
// with cross-check (only NEW rows are stored).
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchBoards,
  saveBoard,
  deleteBoard,
  importBoards,
  type Board,
} from '@/composables/Institute_Setup/useBoards'
import {
  exportBoardsToExcel,
  importBoardsFromExcel,
} from '@/composables/Institute_Setup/useBoardsExcel'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import BoardFormModal from './BoardFormModal.vue'
import boardTypesJson from '@/assets/jsons/board_types.json'
import instituteTypesJson from '@/assets/jsons/institute_types.json'

defineOptions({ name: 'BoardsView' })

const { t } = useTranslator()
const toast = useToast()

const boards = ref<Board[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingBoard = ref<Board | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning a board OFF.
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<Board | null>(null)

const typeLabel = computed(() => {
  const map = new Map(
    (boardTypesJson as { Id: string; Name: string }[]).map((x) => [x.Id, x.Name]),
  )
  return (id: unknown) => map.get(String(id ?? '')) ?? String(id ?? '')
})

const instituteTypeMap = computed(() => {
  const map = new Map<number, string>()
  for (const x of instituteTypesJson as { Id: number; Name: string }[]) map.set(Number(x.Id), x.Name)
  return map
})

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'board_name', label: t('Board Name'), sortable: true },
  { key: 'board_name_bn', label: t('Bangla'), sortable: true },
  { key: 'board_code', label: t('Code'), sortable: true, align: 'center' },
  { key: 'board_type', label: t('Type'), sortable: true, sortValue: (r) => typeLabel.value((r as Record<string, unknown>).board_type), render: (r) => typeLabel.value((r as Record<string, unknown>).board_type) },
  { key: 'institute_type_ids', label: t('Institute Types'), sortable: true, sortValue: (r) => instituteTypesLabel((r as Record<string, unknown>).institute_type_ids), render: (r) => instituteTypesLabel((r as Record<string, unknown>).institute_type_ids) },
  { key: 'regulatory', label: t('MPO'), align: 'center', sortable: true, sortValue: (r) => String(((r as Record<string, unknown>).regulatory as { mpo_no?: string } | undefined)?.mpo_no ?? ''), render: (r) => String(((r as Record<string, unknown>).regulatory as { mpo_no?: string } | undefined)?.mpo_no ?? '') || '—' },
  { key: 'is_active', label: t('Active'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
])

// ── Data helpers ───────────────────────────────────────────────────────

function f(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key]
}

function instituteTypesLabel(ids: unknown): string {
  return instituteTypeNames(ids).join(', ') || '—'
}

/** Institute-type ids → resolved names (for the stacked cell + sorting). */
function instituteTypeNames(ids: unknown): string[] {
  const arr = Array.isArray(ids) ? (ids as number[]) : []
  if (!arr.length) return []
  return arr.map((id) => instituteTypeMap.value.get(Number(id)) ?? '').filter(Boolean)
}

async function loadAll() {
  boards.value = await fetchBoards()
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingBoard.value = null
  showForm.value = true
}
function openEdit(item: Board) {
  editingBoard.value = item
  showForm.value = true
}

async function onSave(board: Board) {
  const saved = await saveBoard(board)
  if (saved) {
    toast.success(board.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: Board) {
  // Built-in BD boards are part of the registry — they can't be deleted
  // (the backend enforces this too); users can only add their own boards.
  if (item.is_builtin) {
    toast.error(t('Built-in boards cannot be deleted'))
    return
  }
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete "{name}"?', { name: item.board_name }))
  if (!ok) return
  const deleted = await deleteBoard(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveBoard({ ...item, id: undefined })
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
function onToggleActive(item: Board) {
  const currentlyOn = Boolean(f(item, 'is_active'))
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: Board, value: boolean) {
  const updated = { ...item, is_active: value }
  const saved = await saveBoard(updated)
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
    exportBoardsToExcel(boards.value)
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
    const { boards: imported } = await importBoardsFromExcel(file)
    const result = await importBoards(imported)
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
        <h1>{{ t('Board & Regulatory Setup') }}</h1>
        <p>{{ t('Register the external boards and authorities your institute reports to.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Board') }}
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
      :rows="boards"
      row-key="id"
      default-sort-key="board_name"
      :empty-text="t('No boards yet. Click “Add Board” to create the first one.')"
    >
      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_active'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as Board)"
        />
      </template>

      <template #board_name="{ row }">
        {{ f(row, 'board_name') }}
      </template>

      <!-- Institute Types: one type per line, comma-separated -->
      <template #institute_type_ids="{ row }">
        <span v-if="instituteTypeNames(f(row, 'institute_type_ids')).length === 0" class="brd-itypes">—</span>
        <span v-else class="brd-itypes">
          <span
            v-for="(name, i) in instituteTypeNames(f(row, 'institute_type_ids'))"
            :key="i"
            class="brd-itypes__item"
          >
            {{ name }}{{ i < instituteTypeNames(f(row, 'institute_type_ids')).length - 1 ? ',' : '' }}
          </span>
        </span>
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as Board)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button
          v-if="!f(row, 'is_builtin')"
          type="button"
          class="btn btn--ghost br-card__btn br-card__btn--danger"
          @click="onDelete(row as Board)"
        >
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating a board -->
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
              name: activeToggleTarget?.board_name ?? '',
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

    <!-- Form modal (Add/Edit board) -->
    <BaseModal
      v-if="showForm"
      :title="editingBoard ? t('Edit') : t('Add Board')"
      wide
      panel-class="brd-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <BoardFormModal
        :board="editingBoard"
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
.brd-form-modal {
  width: 80%;
  min-height: 65vh;
  max-height: 100vh;
}
</style>
