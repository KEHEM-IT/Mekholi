<!-- Institute Setup > Classrooms / Rooms / Buildings -->
<script setup lang="ts">
// Two-tab page: Buildings (registry) + Rooms (inside buildings). Each tab:
// DataTable + Add/Edit modal + Active toggle + Excel export/import with
// cross-check (only NEW rows are stored).
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchItems,
  saveItem,
  deleteItem,
  importRoomsAll,
  type RoomEntity,
  type RoomItem,
} from '@/composables/Institute_Setup/useRoomsBuildings'
import {
  exportRoomsToExcel,
  importRoomsFromExcel,
} from '@/composables/Institute_Setup/useRoomsBuildingsExcel'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import RoomBuildingFormModal from './RoomBuildingFormModal.vue'
import roomTypesJson from '@/assets/jsons/room_types.json'

defineOptions({ name: 'RoomsBuildingsView' })

const { t } = useTranslator()
const toast = useToast()

const TABS: { key: RoomEntity; icon: string }[] = [
  { key: 'buildings', icon: 'fa-building' },
  { key: 'rooms', icon: 'fa-door-open' },
]
const activeTab = ref<RoomEntity>('buildings')

const lists = ref<Record<RoomEntity, RoomItem[]>>({ buildings: [], rooms: [] })

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingItem = ref<RoomItem | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

// Confirm modal for turning an item OFF.
const showActiveConfirm = ref(false)
const activeToggleTarget = ref<RoomItem | null>(null)

const typeLabel = computed(() => {
  const map = new Map(
    (roomTypesJson as { Id: string; LookupText: string }[]).map((x) => [x.Id, x.LookupText]),
  )
  return (id: unknown) => map.get(String(id ?? '')) ?? String(id ?? '')
})

const FACILITY_LABELS: Record<string, string> = {
  projector: 'Projector', ac: 'AC', whiteboard: 'Whiteboard', smartboard: 'Smart Board',
  fan: 'Fan', computer: 'Computer', multimedia: 'Multimedia', cctv: 'CCTV',
}

const activeItems = computed(() => lists.value[activeTab.value])

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<Record<string, TableColumn[]>>(() => ({
  buildings: [
    { key: 'building_name', label: t('Building Name'), sortable: true },
    { key: 'building_name_bn', label: t('Bangla'), sortable: true },
    { key: 'building_code', label: t('Code'), sortable: true, align: 'center' },
    { key: 'floor_count', label: t('Floors'), sortable: true, align: 'center', render: (r) => String((r as Record<string, unknown>).floor_count ?? 0) },
    { key: 'is_active', label: t('Active'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
  ],
  rooms: [
    { key: 'room_no', label: t('Room No / Name'), sortable: true },
    { key: 'room_no_bn', label: t('Bangla'), sortable: true },
    { key: 'building_id', label: t('Building'), sortable: true, sortValue: (r) => buildingLabel((r as Record<string, unknown>).building_id), render: (r) => buildingLabel((r as Record<string, unknown>).building_id) },
    { key: 'floor_no', label: t('Floor'), sortable: true, align: 'center' },
    { key: 'room_type', label: t('Type'), sortable: true, sortValue: (r) => typeLabel.value((r as Record<string, unknown>).room_type), render: (r) => typeLabel.value((r as Record<string, unknown>).room_type) },
    { key: 'capacity', label: t('Capacity'), sortable: true, align: 'right' },
    { key: 'facilities', label: t('Facilities'), sortable: true, sortValue: (r) => String(((r as Record<string, unknown>).facilities as string[] | undefined)?.length ?? 0), render: (r) => facilitiesLabel((r as Record<string, unknown>).facilities) },
    { key: 'status', label: t('Status'), sortable: true, align: 'center', render: (r) => statusLabel((r as Record<string, unknown>).status) },
    { key: 'is_active', label: t('Active'), align: 'center', sortable: true, render: (r) => ((r as Record<string, unknown>).is_active ? t('Yes') : t('No')) },
  ],
}))

const defaultSortForTab = computed(() =>
  activeTab.value === 'buildings' ? { key: 'building_name', dir: 'asc' as const }
  : { key: 'building_id', dir: 'asc' as const },
)

// ── Data helpers ───────────────────────────────────────────────────────

function f(item: unknown, key: string): unknown {
  return (item as Record<string, unknown>)[key]
}

function buildingLabel(id: unknown): string {
  const n = Number(id)
  if (!n) return '—'
  const b = lists.value.buildings.find((x) => x.id === n) as unknown as { building_name?: string } | undefined
  return b?.building_name ?? String(id ?? '')
}

function facilitiesLabel(facilities: unknown): string {
  const arr = Array.isArray(facilities) ? (facilities as string[]) : []
  if (!arr.length) return '—'
  return arr.map((k) => FACILITY_LABELS[k] ?? k).join(', ')
}

function statusLabel(status: unknown): string {
  return String(status ?? '') === 'Maintenance' ? t('Maintenance') : t('Active')
}

async function loadAll() {
  const [b, r] = await Promise.all([fetchItems('buildings'), fetchItems('rooms')])
  lists.value = { buildings: b, rooms: r }
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function tabLabel(key: RoomEntity): string {
  return key === 'buildings' ? t('Buildings') : t('Rooms')
}
function addLabel(key: RoomEntity): string {
  return key === 'buildings' ? t('Add Building') : t('Add Room')
}

function openAdd() {
  editingItem.value = null
  showForm.value = true
}
function openEdit(item: RoomItem) {
  editingItem.value = item
  showForm.value = true
}

async function onSave(item: RoomItem) {
  const saved = await saveItem(activeTab.value, item)
  if (saved) {
    toast.success(item.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: RoomItem) {
  const id = item.id
  if (!id) return
  const name = String(
    activeTab.value === 'buildings'
      ? (f(item, 'building_name') ?? '')
      : (f(item, 'room_no') ?? ''),
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

/** Active toggle — turning OFF asks for confirmation. */
function onToggleActive(item: RoomItem) {
  const currentlyOn = Boolean(f(item, 'is_active'))
  if (currentlyOn) {
    activeToggleTarget.value = { ...item }
    showActiveConfirm.value = true
  } else {
    void applyActive({ ...item }, true)
  }
}

async function applyActive(item: RoomItem, value: boolean) {
  const updated = { ...item, is_active: value } as RoomItem
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

// ── Excel ──────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportRoomsToExcel(lists.value)
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
    const imported = await importRoomsFromExcel(file)
    const result = await importRoomsAll(imported)
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
        <h1>{{ t('Classrooms / Rooms / Buildings') }}</h1>
        <p>{{ t('Manage your physical infrastructure — buildings, floors and rooms.') }}</p>
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
      <template #status="{ row }">
        <span
          class="rm-status"
          :class="f(row, 'status') === 'Maintenance' ? 'rm-status--maint' : 'rm-status--active'"
        >
          {{ statusLabel(f(row, 'status')) }}
        </span>
      </template>

      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean(f(row, 'is_active'))"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as RoomItem)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as RoomItem)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as RoomItem)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm deactivating an item -->
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
              name: activeToggleTarget
                ? String(activeTab === 'buildings' ? f(activeToggleTarget, 'building_name') : f(activeToggleTarget, 'room_no') ?? '')
                : '',
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

    <!-- Form modal (Add/Edit Building · Room) -->
    <BaseModal
      v-if="showForm"
      :title="editingItem ? t('Edit') : t('Add')"
      wide
      panel-class="rm-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <RoomBuildingFormModal
        :entity="activeTab"
        :item="editingItem"
        :buildings="lists.buildings as { id?: number; building_name: string; building_name_bn?: string }[]"
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
.rm-form-modal {
  min-height: 65vh;
  max-height: 100vh;
}
</style>
