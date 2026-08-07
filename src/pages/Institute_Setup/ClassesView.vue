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
import { exportClassesSetupToExcel, importClassesSetupFromExcel } from '@/composables/Institute_Setup/useClassesSetupExcel'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchBranches, type Branch } from '@/composables/Institute_Setup/useBranches'
import BaseModal from '@/components/ui/BaseModal.vue'
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

const activeItems = computed(() => lists.value[activeTab.value])

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

function nameField(entity: ClassSetupEntity): string {
  return entity === 'classes' ? 'class_name' : entity === 'sections' ? 'section_name' : entity === 'groups' ? 'group_name' : 'shift_name'
}

// ── Card display helpers ───────────────────────────────────────────────

function itemName(item: ClassSetupItem): string {
  const r = item as unknown as Record<string, string>
  return r[nameField(activeTab.value)] || r[`${nameField(activeTab.value)}_bn`] || '—'
}
function itemNameBn(item: ClassSetupItem): string {
  const r = item as unknown as Record<string, string>
  return r[`${nameField(activeTab.value)}_bn`] || ''
}
/** Read a field from an item (avoids `as any` in the template). */
function f(item: ClassSetupItem, key: string): unknown {
  return (item as unknown as Record<string, unknown>)[key]
}
function classLabel(id: unknown): string {
  const n = Number(id)
  const c = lists.value.classes.find((x) => x.id === n) as unknown as { class_name?: string } | undefined
  return c?.class_name ?? String(id ?? '')
}
function shiftLabel(id: unknown): string {
  const n = Number(id)
  const s = lists.value.shifts.find((x) => x.id === n) as unknown as { shift_name?: string } | undefined
  return s?.shift_name ?? String(id ?? '')
}

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
    const { items } = await importClassesSetupFromExcel(file, activeTab.value)
    for (const it of items) await saveItem(activeTab.value, it)
    toast.success(t('{count} items imported', { count: items.length }))
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

    <!-- Cards -->
    <div class="ay-grid">
      <article v-for="item in activeItems" :key="item.id" class="ay-card">
        <div class="br-card__head">
          <div class="ay-card__year">
            <i class="fa-duotone" :class="TABS.find((x) => x.key === activeTab)?.icon" />
          </div>
          <div class="br-card__titles">
            <h3>{{ itemName(item) }}</h3>
            <p v-if="itemNameBn(item)">{{ itemNameBn(item) }}</p>
            <div class="br-card__chips">
              <!-- Class chips -->
              <template v-if="activeTab === 'classes'">
                <span class="br-chip">{{ f(item, 'phase') }}</span>
                <span v-if="f(item, 'sort_order')" class="br-chip br-chip--code">#{{ f(item, 'sort_order') }}</span>
              </template>
              <!-- Section chips -->
              <template v-else-if="activeTab === 'sections'">
                <span class="br-chip br-chip--code">{{ classLabel(f(item, 'class_id')) }}</span>
                <span class="br-chip">{{ shiftLabel(f(item, 'shift_id')) }}</span>
                <span v-if="f(item, 'capacity')" class="br-chip">{{ t('Cap') }}: {{ f(item, 'capacity') }}</span>
              </template>
              <!-- Group chips -->
              <template v-else-if="activeTab === 'groups'">
                <span v-if="f(item, 'version')" class="br-chip">{{ f(item, 'version') }}</span>
                <span v-if="f(item, 'group_type')" class="br-chip br-chip--code">{{ f(item, 'group_type') }}</span>
              </template>
              <!-- Shift chips -->
              <template v-else>
                <span v-if="f(item, 'start_time')" class="br-chip">{{ f(item, 'start_time') }} → {{ f(item, 'end_time') }}</span>
              </template>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'groups' && (f(item, 'class_ids') as unknown[] | undefined)?.length" class="br-card__body">
          <p><i class="fa-duotone fa-layer-group" />
            {{ t('Classes') }}: {{ (f(item, 'class_ids') as number[]).map((id) => classLabel(id)).join(', ') }}
          </p>
        </div>

        <div class="br-card__foot">
          <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(item)">
            <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
          </button>
          <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(item)">
            <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
          </button>
        </div>
      </article>
    </div>

    <!-- Empty state -->
    <div v-if="!activeItems.length" class="ay-empty reveal-content">
      <div class="ay-empty__icon">
        <i class="fa-duotone" :class="TABS.find((x) => x.key === activeTab)?.icon" />
      </div>
      <h3 class="ay-empty__title">{{ t('No {entity} yet', { entity: tabLabel(activeTab) }) }}</h3>
      <p class="ay-empty__subtitle">
        {{ t('Add your first item to start building the academic structure.') }}
      </p>
      <div class="ay-empty__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ addLabel(activeTab) }}
        </button>
      </div>
    </div>

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
