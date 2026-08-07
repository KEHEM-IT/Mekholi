<!-- Institute Setup > Class / Section / Group / Shift -->
<script setup lang="ts">
// Four-entity management page with tabs: Classes · Sections · Groups · Shifts.
// Each tab: card grid + Add/Edit/Delete + View + Excel export/import.
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchItems,
  saveItem,
  deleteItem,
  type ClassSetupEntity,
  type ClassSetupItem,
} from '@/composables/Institute_Setup/useClassesSetup'
import { exportClassesSetupToExcel, importAllClassesSetupSheets } from '@/composables/Institute_Setup/useClassesSetupExcel'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchBranches, type Branch } from '@/composables/Institute_Setup/useBranches'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import ClassSetupFormModal from './ClassSetupFormModal.vue'

defineOptions({ name: 'ClassesView' })

const { t } = useTranslator()
const toast = useToast()

const TABS: { key: ClassSetupEntity; icon: string }[] = [
  { key: 'classes', icon: 'fa-layer-group' },
  { key: 'sections', icon: 'fa-table-columns' },
  { key: 'groups', icon: 'fa-object-group' },
  { key: 'shifts', icon: 'fa-clock' },
]
const activeTab = ref<ClassSetupEntity>('classes')

const lists = ref<Record<ClassSetupEntity, ClassSetupItem[]>>({ classes: [], sections: [], groups: [], shifts: [] })
const years = ref<AcademicYear[]>([])
const branches = ref<Branch[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingItem = ref<ClassSetupItem | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for toggling an item OFF.
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<ClassSetupItem | null>(null)

const activeItems = computed(() => lists.value[activeTab.value])

// ── Table column definitions per tab ───────────────────────────────────
const tableColumns = computed<Record<string, TableColumn[]>>(() => ({
  classes: [
    { key: 'sort_order', label: '#', width: '3.5rem', align: 'center' },
    { key: 'class_name', label: t('Class Name') },
    { key: 'class_name_bn', label: t('Bangla') },
    { key: 'phase', label: t('Phase / Level') },
    { key: 'academic_year_id', label: t('Year'), render: (r) => yearLabel((r as Record<string, unknown>).academic_year_id) },
    { key: 'branch_id', label: t('Branch'), render: (r) => branchLabel((r as Record<string, unknown>).branch_id) },
    { key: 'is_active', label: t('Active'), align: 'center', render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
  ],
  sections: [
    { key: 'id', label: '#', width: '3.5rem', align: 'center' },
    { key: 'section_name', label: t('Section') },
    { key: 'section_name_bn', label: t('Bangla') },
    { key: 'class_id', label: t('Class'), render: (r) => classLabel((r as Record<string, unknown>).class_id) },
    { key: 'shift_id', label: t('Shift'), render: (r) => shiftLabel((r as Record<string, unknown>).shift_id) },
    { key: 'capacity', label: t('Capacity'), align: 'right' },
    { key: 'is_active', label: t('Active'), align: 'center', render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
  ],
  groups: [
    { key: 'group_name', label: t('Group Name') },
    { key: 'group_name_bn', label: t('Bangla') },
    { key: 'class_ids', label: t('Classes'), render: (r) => (f(r, 'class_ids') as number[] | undefined)?.map((id) => classLabel(id)).join(', ') ?? '—' },
    { key: 'version', label: t('Version') },
    { key: 'group_type', label: t('Group Type') },
    { key: 'is_active', label: t('Active'), align: 'center', render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
  ],
  shifts: [
    { key: 'shift_name', label: t('Shift Name') },
    { key: 'shift_name_bn', label: t('Bangla') },
    { key: 'start_time', label: t('Start') },
    { key: 'end_time', label: t('End') },
    { key: 'is_active', label: t('Active'), align: 'center', render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
  ],
}))

function yearLabel(id: unknown): string {
  const n = Number(id)
  const y = years.value.find((x) => x.id === n)
  return y?.year_name ?? String(id ?? '')
}
function branchLabel(id: unknown): string {
  const n = Number(id)
  const b = branches.value.find((x) => x.id === n)
  return b?.branch_name ?? String(id ?? '')
}
function classLabel(id: unknown): string {
  const n = Number(id)
  const c = lists.value.classes.find((x) => x.id === n) as unknown as { class_name?: string } | undefined
  return c?.class_name ?? String(id ?? '')
}
function shiftLabel(id: unknown): string {
  const n = Number(id)
  const sh = lists.value.shifts.find((x) => x.id === n) as unknown as { shift_name?: string } | undefined
  return sh?.shift_name ?? String(id ?? '')
}
/** Read a field from an item (avoids `as any` in templates/computeds). */
function f(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key]
}

async function loadAll() {
  const [c, s, g, sh, y, b] = await Promise.all([
    fetchItems('classes'), fetchItems('sections'), fetchItems('groups'), fetchItems('shifts'),
    fetchAcademicYears(), fetchBranches(),
  ])
  lists.value = { classes: c, sections: s, groups: g, shifts: sh }
  years.value = y
  branches.value = b
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function tabLabel(key: ClassSetupEntity): string {
  return key === 'classes' ? t('Classes') : key === 'sections' ? t('Sections') : key === 'groups' ? t('Groups') : t('Shifts')
}
function addLabel(key: ClassSetupEntity): string {
  return key === 'classes' ? t('Add Class') : key === 'sections' ? t('Add Section') : key === 'groups' ? t('Add Group') : t('Add Shift')
}

function openAdd() {
  editingItem.value = null
  showForm.value = true
}
function openEdit(item: ClassSetupItem) {
  editingItem.value = item
  showForm.value = true
}

async function onSave(item: ClassSetupItem) {
  const saved = await saveItem(activeTab.value, item)
  if (saved) {
    toast.success(item.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: ClassSetupItem) {
  const id = item.id
  if (!id) return
  const name = String((item as unknown as Record<string, unknown>)[nameField(activeTab.value)] ?? '')
  const ok = window.confirm(t('Delete "{name}"?', { name }))
  if (!ok) return
  const deleted = await deleteItem(activeTab.value, id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveItem(activeTab.value, { ...item, id: undefined })
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

/** Called when the Active toggle is clicked — opens confirm when turning OFF. */
function onToggleActive(item: ClassSetupItem) {
  const target = { ...item }
  const currentlyOn = Boolean(f(item, 'is_active'))
  if (currentlyOn) {
    // Turning OFF → ask for confirmation first.
    activeToggleTarget.value = target
    showActiveConfirm.value = true
  } else {
    // Turning back ON → apply immediately.
    void applyActive(target, true)
  }
}

async function applyActive(item: ClassSetupItem, value: boolean) {
  const updated = { ...item, is_active: value } as ClassSetupItem
  const saved = await saveItem(activeTab.value, updated)
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

function nameField(entity: ClassSetupEntity): string {
  return entity === 'classes' ? 'class_name' : entity === 'sections' ? 'section_name' : entity === 'groups' ? 'group_name' : 'shift_name'
}

// ── Card display helpers ───────────────────────────────────────────────

// ── Excel ──────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportClassesSetupToExcel(lists.value)
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
    // One click imports ALL sheets: classes + sections + groups + shifts.
    const imported = await importAllClassesSetupSheets(file)
    let total = 0
    for (const entity of ['classes', 'sections', 'groups', 'shifts'] as const) {
      for (const it of imported[entity]) {
        await saveItem(entity, it)
        total++
      }
    }
    toast.success(t('{count} items imported', { count: total }))
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
    <div class="ay-grid">
      <div v-for="n in 4" :key="n" class="skeleton skeleton--card br-sk-card">
        <div class="br-sk-head">
          <span class="skeleton br-sk-logo" />
          <div class="br-sk-titles">
            <span class="skeleton br-sk-name" />
            <span class="skeleton br-sk-namebn" />
          </div>
        </div>
        <div class="br-sk-foot">
          <span class="skeleton br-sk-btn" />
          <span class="skeleton br-sk-btn" />
        </div>
      </div>
    </div>
  </section>

  <section v-else class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Class / Section / Group / Shift') }}</h1>
        <p>{{ t('Define class levels, sections, groups and shifts — the building blocks of your timetable.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ addLabel(activeTab) }}
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

    <!-- Tabs -->
    <div class="cs-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        class="cs-tab"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <i class="fa-duotone" :class="tab.icon" />
        {{ tabLabel(tab.key) }}
        <span class="cs-tab__count">{{ lists[tab.key].length }}</span>
      </button>
    </div>

    <!-- Data table (reusable, sticky head, scrollable body) -->
    <DataTable
      :columns="tableColumns[activeTab]"
      :rows="activeItems"
      row-key="id"
      :empty-text="t('No {entity} yet', { entity: tabLabel(activeTab) })"
    >
      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_active'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as ClassSetupItem)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as ClassSetupItem)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as ClassSetupItem)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm turning an item OFF -->
    <BaseModal
      v-if="showActiveConfirm"
      :title="t('Deactivate item')"
      @close="showActiveConfirm = false"
    >
      <div class="cm-confirm">
        <div class="cm-confirm__icon"><i class="fa-duotone fa-triangle-exclamation" /></div>
        <p class="cm-confirm__text">
          {{
            t('Are you sure you want to deactivate "{name}"? It will be hidden from new selections.')
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

    <!-- Form modal -->
    <BaseModal
      v-if="showForm"
      :title="editingItem ? t('Edit') : t('Add')"
      wide
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <ClassSetupFormModal
        :entity="activeTab"
        :item="editingItem"
        :classes="lists.classes"
        :shifts="lists.shifts"
        :years="years"
        :branches="branches"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
