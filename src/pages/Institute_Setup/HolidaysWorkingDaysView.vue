<!-- Institute Setup > Holidays & Working Days -->
<script setup lang="ts">
// Two-tab page: Working Days (weekly calendar) + Holidays (closed days).
// Each tab: DataTable + Add/Edit modal + Active toggle + Excel export/import
// with cross-check (only NEW rows are stored).
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchItems,
  saveItem,
  deleteItem,
  importHolidaysAll,
  type HolidayEntity,
  type HolidayItem,
} from '@/composables/Institute_Setup/useHolidaysWorkingDays'
import {
  exportHolidaysToExcel,
  importHolidaysFromExcel,
} from '@/composables/Institute_Setup/useHolidaysWorkingDaysExcel'
import { fetchBranches, type Branch } from '@/composables/Institute_Setup/useBranches'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import HolidayWorkingDayFormModal from './HolidayWorkingDayFormModal.vue'
import holidayTypesJson from '@/assets/jsons/holiday_types.json'

defineOptions({ name: 'HolidaysWorkingDaysView' })

const { t } = useTranslator()
const toast = useToast()

const TABS: { key: HolidayEntity; icon: string }[] = [
  { key: 'working_days', icon: 'fa-calendar-days' },
  { key: 'holidays', icon: 'fa-umbrella-beach' },
]
const activeTab = ref<HolidayEntity>('working_days')

const lists = ref<Record<HolidayEntity, HolidayItem[]>>({ working_days: [], holidays: [] })
const branches = ref<Branch[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingItem = ref<HolidayItem | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning a holiday OFF.
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<HolidayItem | null>(null)

const WEEKDAYS: Record<string, { en: string; bn: string }> = {
  Sunday: { en: 'Sunday', bn: 'রবিবার' },
  Monday: { en: 'Monday', bn: 'সোমবার' },
  Tuesday: { en: 'Tuesday', bn: 'মঙ্গলবার' },
  Wednesday: { en: 'Wednesday', bn: 'বুধবার' },
  Thursday: { en: 'Thursday', bn: 'বৃহস্পতিবার' },
  Friday: { en: 'Friday', bn: 'শুক্রবার' },
  Saturday: { en: 'Saturday', bn: 'শনিবার' },
}
const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const typeLabel = computed(() => {
  const map = new Map(
    (holidayTypesJson as { Id: string; Name: string; Name_bn: string }[]).map((x) => [x.Id, x.Name]),
  )
  return (id: unknown) => map.get(String(id ?? '')) ?? String(id ?? '')
})

const activeItems = computed(() => lists.value[activeTab.value])

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<Record<string, TableColumn[]>>(() => ({
  working_days: [
    { key: 'day_of_week', label: t('Day of Week'), sortable: true, sortValue: (r) => DAY_ORDER.indexOf(String((r as Record<string, unknown>).day_of_week ?? '')) },
    { key: 'is_working', label: t('Is Working'), align: 'center', sortable: true },
    { key: 'open_time', label: t('Start'), sortable: true, render: (r) => String((r as Record<string, unknown>).open_time ?? '') || '—' },
    { key: 'close_time', label: t('End'), sortable: true, render: (r) => String((r as Record<string, unknown>).close_time ?? '') || '—' },
  ],
  holidays: [
    { key: 'holiday_name', label: t('Holiday Name'), sortable: true },
    { key: 'holiday_name_bn', label: t('Bangla'), sortable: true },
    { key: 'date_from', label: t('From'), sortable: true },
    { key: 'date_to', label: t('To'), sortable: true, render: (r) => String((r as Record<string, unknown>).date_to ?? '') || '—' },
    { key: 'holiday_type', label: t('Type'), sortable: true, sortValue: (r) => typeLabel.value((r as Record<string, unknown>).holiday_type), render: (r) => typeLabel.value((r as Record<string, unknown>).holiday_type) },
    { key: 'branch_id', label: t('Branch'), sortable: true, sortValue: (r) => branchLabel((r as Record<string, unknown>).branch_id), render: (r) => branchLabel((r as Record<string, unknown>).branch_id) },
    { key: 'is_recurring', label: t('Repeats'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_recurring ? t('Yes') : t('No')) },
    { key: 'is_working_override', label: t('Special Day'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_working_override ? t('Yes') : t('No')) },
    { key: 'is_active', label: t('Active'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
  ],
}))

const defaultSortForTab = computed(() =>
  activeTab.value === 'working_days' ? { key: 'day_of_week', dir: 'asc' as const }
  : activeTab.value === 'holidays' ? { key: 'date_from', dir: 'asc' as const }
  : { key: '', dir: 'asc' as const },
)

// ── Data helpers ───────────────────────────────────────────────────────

function f(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key]
}

function dayLabel(id: unknown): string {
  const d = WEEKDAYS[String(id ?? '')]
  return d ? `${d.en} - ${d.bn}` : String(id ?? '')
}

function branchLabel(id: unknown): string {
  const n = Number(id)
  if (!n) return t('All Branches')
  const b = branches.value.find((x) => x.id === n)
  return b?.branch_name ?? String(id ?? '')
}

async function loadAll() {
  const [wd, hd, br] = await Promise.all([fetchItems('working_days'), fetchItems('holidays'), fetchBranches()])
  lists.value = { working_days: wd, holidays: hd }
  branches.value = br
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function tabLabel(key: HolidayEntity): string {
  return key === 'working_days' ? t('Working Days') : t('Holidays')
}
function addLabel(key: HolidayEntity): string {
  return key === 'working_days' ? t('Add Working Day') : t('Add Holiday')
}

function openAdd() {
  editingItem.value = null
  showForm.value = true
}
function openEdit(item: HolidayItem) {
  editingItem.value = item
  showForm.value = true
}

async function onSave(item: HolidayItem) {
  const saved = await saveItem(activeTab.value, item)
  if (saved) {
    toast.success(item.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: HolidayItem) {
  const id = item.id
  if (!id) return
  const name = String(
    activeTab.value === 'working_days'
      ? dayLabel(f(item, 'day_of_week'))
      : (f(item, 'holiday_name') ?? ''),
  )
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

/** Holidays: Active toggle — turning OFF asks for confirmation. */
function onToggleActive(item: HolidayItem) {
  const currentlyOn = Boolean(f(item, 'is_active'))
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: HolidayItem, value: boolean) {
  const updated = { ...item, is_active: value } as HolidayItem
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

/** Working days: Is Working toggle applies instantly. */
async function onToggleWorking(item: HolidayItem, value: boolean) {
  const updated = { ...item, is_working: value } as HolidayItem
  const saved = await saveItem(activeTab.value, updated)
  if (saved) {
    toast.success(t('Updated'))
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

// ── Excel ──────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportHolidaysToExcel(lists.value)
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
    // One click imports BOTH sheets. Import = cross-check + add only NEW
    // rows; existing ones (by natural key) are kept as-is.
    const imported = await importHolidaysFromExcel(file)
    const result = await importHolidaysAll(imported)
    if (!result.ok) throw new Error('server')
    const total = Object.values(result.inserted).reduce((a, b) => a + b, 0)
    const totalSkipped = Object.values(result.skipped).reduce((a, list) => a + list.length, 0)
    if (total === 0 && totalSkipped > 0) {
      toast.success(t('All {count} rows already existed — nothing new added', { count: totalSkipped }))
    } else {
      toast.success(
        t('{added} added · {skipped} already existed', {
          added: total,
          skipped: totalSkipped,
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
  <!-- Skeleton — mirrors the real page: header + tabs + table -->
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
        <h1>{{ t('Holidays & Working Days') }}</h1>
        <p>{{ t('Set the weekly working calendar and the closed days of the institute.') }}</p>
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

    <!-- Data table (reusable, sticky head, sortable) -->
    <DataTable
      :key="activeTab"
      :columns="tableColumns[activeTab]"
      :rows="activeItems"
      row-key="id"
      :default-sort-key="defaultSortForTab.key"
      :default-sort-dir="defaultSortForTab.dir"
      :empty-text="t('No {entity} yet', { entity: tabLabel(activeTab) })"
    >
      <template #day_of_week="{ row }">
        {{ dayLabel(f(row, 'day_of_week')) }}
      </template>

      <!-- Working days: Is Working bulb (instant, no confirm) -->
      <template v-if="activeTab === 'working_days'" #is_working="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_working'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleWorking(row as HolidayItem, $event)"
        />
      </template>

      <!-- Holidays: Active bulb (turning OFF opens confirm) -->
      <template v-if="activeTab === 'holidays'" #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_active'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as HolidayItem)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as HolidayItem)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as HolidayItem)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating a holiday -->
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
              name: activeToggleTarget ? String(f(activeToggleTarget, 'holiday_name') ?? '') : '',
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

    <!-- Form modal (Add/Edit Working Day · Holiday) -->
    <BaseModal
      v-if="showForm"
      :title="editingItem ? t('Edit') : t('Add')"
      wide
      panel-class="hw-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <HolidayWorkingDayFormModal
        :entity="activeTab"
        :item="editingItem"
        :branches="branches"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>

<!--
  Scoped panel sizing for THIS page's Add/Edit form modal only.
  Lives here (not in the global modal css) so other modals keep their
  natural height and the rule can't be lost in shared styles.
  (Unscoped on purpose — BaseModal teleports to <body>, so a page-scoped
  data attribute wouldn't reach the panel; the unique class scopes it.)
-->
<style>
.hw-form-modal {
  min-height: 65vh;
  max-height: 100vh;
}
</style>
