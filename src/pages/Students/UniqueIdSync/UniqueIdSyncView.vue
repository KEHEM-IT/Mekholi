<!-- Students > Unique ID (UID) Sync Page -->
<script setup lang="ts">
// Unique ID Sync: registers and matches local Student IDs with the mandatory
// 17-digit government assigned CRVS unique ID needed for national boards.
import { computed, onMounted, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, saveStudent, type Student } from '@/composables/Students/useStudents'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'UniqueIdSyncView' })

const { t } = useTranslator()
const toast = useToast()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const students = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])

// Selection state
const activeYearId = ref<number | null>(null)
const activeClass = ref('Class 6')

// Local state for inline row edits
// Maps studentId -> modified government_uid string
const editedUids = ref<Record<number, string>>({})

// Excel bulk uploader states
const excelInput = ref<HTMLInputElement | null>(null)
const isBulkProcessing = ref(false)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'government_uid', label: t('Government 17-digit UID'), sortable: true, align: 'center' },
  { key: 'actions', label: t('Action'), align: 'center' },
])

const classOptions = computed(() =>
  (classNamesJson as { Id: number; Name: string; NameInBangla: string; Phase: string; SortOrder: number }[]).map((c) => ({
    Id: String(c.Name),
    LookupText: `${c.Name} - ${c.NameInBangla}`,
    DisplayText: `${c.Name} - ${c.NameInBangla}`,
  })),
)

const yearOptions = computed(() =>
  years.value.map((y) => ({
    Id: Number(y.id),
    LookupText: String(y.year_name),
    DisplayText: String(y.year_name),
  })),
)

// Statistics Calculations
const stats = computed(() => {
  const list = filteredStudents.value
  const total = list.length
  const synced = list.filter(s => s.government_uid && s.government_uid.trim().length === 17).length
  const missing = list.filter(s => !s.government_uid || s.government_uid.trim().length === 0).length
  const formatErrors = list.filter(s => s.government_uid && s.government_uid.trim().length !== 17).length

  return {
    total,
    synced,
    missing,
    formatErrors,
  }
})

// ── Render Helpers ─────────────────────────────────────────────────────

function renderStudentName(row: Student): string {
  if (row.candidate_name_bn) {
    return `${row.candidate_name} (${row.candidate_name_bn})`
  }
  return row.candidate_name
}

function filterRoster() {
  if (!activeYearId.value) {
    filteredStudents.value = []
    return
  }
  filteredStudents.value = students.value.filter(
    (s) => Number(s.academic_year_id) === Number(activeYearId.value) && s.class_name === activeClass.value && s.is_active,
  )
}

watch([activeYearId, activeClass, students], () => {
  filterRoster()
})

// Watch filteredStudents and populate local edit refs
watch(filteredStudents, (newList) => {
  const newMap: Record<number, string> = {}
  for (const s of newList) {
    if (s.id) {
      newMap[s.id] = s.government_uid || ''
    }
  }
  editedUids.value = newMap
}, { immediate: true })

async function loadAll() {
  const [sData, y] = await Promise.all([fetchStudents(), fetchAcademicYears()])
  students.value = sData
  years.value = y
  if (y.length > 0) {
    activeYearId.value = Number(y[0].id)
  }
  filterRoster()
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

// ── Save Individual Inline Sync ────────────────────────────────────────

async function saveInlineUid(student: Student) {
  const newUid = (editedUids.value[student.id!] || '').trim().replace(/\D/g, '')
  
  if (newUid && newUid.length !== 17) {
    toast.error(t('Government CRVS UID must be exactly 17 digits.'))
    return
  }
  
  const updated = { ...student, government_uid: newUid }
  const saved = await saveStudent(updated)
  if (saved) {
    toast.success(t('Successfully synchronized unique ID for {name}!', { name: student.candidate_name }))
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

// ── Excel Bulk Sync ────────────────────────────────────────────────────

function triggerExcelImport() {
  excelInput.value?.click()
}

async function onExcelPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isBulkProcessing.value = true
  try {
    const buffer = await file.arrayBuffer()
    const book = XLSX.read(buffer, { type: 'array' })
    const sheet = book.Sheets[book.SheetNames[0]]
    if (!sheet) throw new Error('No sheet found in the Excel file')

    // Expecting columns: 'Student ID' and 'Government UID'
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
    let syncCount = 0

    for (const row of rows) {
      const studentId = String(row['Student ID'] || row['student_id'] || '').trim()
      const rawUid = String(row['Government UID'] || row['government_uid'] || '').trim().replace(/\D/g, '')

      if (studentId && rawUid && rawUid.length === 17) {
        // Find matching local student
        const match = students.value.find(s => s.student_id.trim().toLowerCase() === studentId.toLowerCase())
        if (match) {
          const updated = { ...match, government_uid: rawUid }
          const saved = await saveStudent(updated)
          if (saved) syncCount++
        }
      }
    }

    if (syncCount > 0) {
      toast.success(t('Successfully bulk-synchronized {count} student UIDs from Excel!', { count: syncCount }))
      await loadAll()
    } else {
      toast.warning(t('No matched student records with valid 17-digit UIDs were found.'))
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(t('Bulk sync failed: {error}', { error: msg }))
  } finally {
    isBulkProcessing.value = false
    if (excelInput.value) excelInput.value.value = ''
  }
}

function downloadMatchTemplate() {
  // Generate a mapping sheet of currently unmatched students in the selected class
  const headers = ['Student ID', 'Candidate Name', 'Current Class', 'Government UID']
  const unmatched = filteredStudents.value.filter(s => !s.government_uid)

  const rows = [headers]
  for (const s of unmatched) {
    rows.push([s.student_id, s.candidate_name, s.class_name, ''])
  }

  // Fallback default samples if all are already synced
  if (unmatched.length === 0) {
    rows.push(['STD-2026-0001', 'MOHAMMAD YUNUS', 'Class 6', '20158219381029381'])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = headers.map(h => ({ wch: h.length + 5 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'CRVS Sync')
  XLSX.writeFile(wb, 'CRVS_UID_BulkSync_Template.xlsx')
  toast.success(t('Bulk-match template downloaded. Fill in the Government UID column and upload!'))
}
</script>

<template>
  <!-- Skeleton Loader matching established standards -->
  <section v-if="isPageLoading" class="ipf-skeleton" aria-busy="true">
    <div class="ipf-skeleton__header">
      <div class="ipf-skeleton__titles">
        <span class="skeleton ipf-skeleton__title" />
        <span class="skeleton ipf-skeleton__subtitle" />
      </div>
      <div class="ipf-skeleton__actions">
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
        <h1>{{ t('Unique ID (UID) Sync') }}</h1>
        <p>{{ t('Collect, audit, and bulk-sync the mandatory 17-digit Civil Registration and Vital Statistics (CRVS) student UIDs required by national boards.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--secondary" @click="downloadMatchTemplate">
          <i class="fa-duotone fa-file-excel" /> {{ t('Download Sync Sheet') }}
        </button>
        <button type="button" class="btn btn--primary" :disabled="isBulkProcessing" @click="triggerExcelImport">
          <i class="fa-duotone" :class="isBulkProcessing ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'" />
          {{ t('Bulk Sync Excel') }}
        </button>
        <input ref="excelInput" type="file" accept=".xlsx,.xls" style="display: none;" @change="onExcelPicked" />
      </div>
    </header>

    <!-- National CRVS Sync Statistics Summary Ribbon -->
    <div v-if="filteredStudents.length > 0" class="std-dash-grid animate-fade-in">
      <div class="std-dash-card std-dash-card--info">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Total Class Register') }}</span>
          <span class="std-dash-card__value">{{ stats.total }}</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-user-group" /></div>
      </div>
      <div class="std-dash-card std-dash-card--success">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Synced CRVS UIDs') }}</span>
          <span class="std-dash-card__value">{{ stats.synced }}</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-fingerprint" /></div>
      </div>
      <div class="std-dash-card std-dash-card--warning">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Missing UIDs') }}</span>
          <span class="std-dash-card__value">{{ stats.missing }}</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-triangle-exclamation" /></div>
      </div>
      <div class="std-dash-card" :class="stats.formatErrors > 0 ? 'std-dash-card--warning' : ''" style="border-color: var(--color-danger);">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('UID Format Errors') }}</span>
          <span class="std-dash-card__value" :class="stats.formatErrors > 0 ? 'text-danger' : ''">{{ stats.formatErrors }}</span>
        </div>
        <div class="std-dash-card__icon" style="background: rgba(239, 68, 68, 0.16); color: var(--color-danger);"><i class="fa-duotone fa-circle-exclamation" /></div>
      </div>
    </div>

    <!-- Selection filters -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-sliders" />
        {{ t('Select Class Scope') }}
      </h4>
      <div class="ipf-grid">
        <div class="form-field">
          <label>{{ t('Target Class') }} *</label>
          <BaseCombobox
            v-model="activeClass"
            :options="classOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select class')"
          />
        </div>
        <div class="form-field">
          <label>{{ t('Academic Intake Year') }} *</label>
          <BaseCombobox
            v-model="activeYearId"
            :options="yearOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select year')"
          />
        </div>
      </div>
    </div>

    <!-- Data table (reusable, sticky head, sortable, loading skeletons) -->
    <DataTable
      :columns="tableColumns"
      :rows="filteredStudents"
      row-key="id"
      default-sort-key="student_id"
      :empty-text="t('No active student records found inside this class.')"
    >
      <!-- Interactive Inline Government UID Column -->
      <template #government_uid="{ row }">
        <div class="flex items-center gap-2 w-full justify-center">
          <input 
            v-model="editedUids[(row as Student).id!]" 
            type="text" 
            maxlength="17" 
            class="verify-input text-center font-bold tracking-wider" 
            style="max-width: 220px; padding: 4px 8px; font-family: monospace;"
            :placeholder="t('Enter 17-digit CRVS ID')"
          />
          <span 
            v-if="!(row as Student).government_uid" 
            class="enq-badge enq-badge--rejected" 
            style="margin-left: 4px; padding: 2px 6px;"
          >
            {{ t('Missing') }}
          </span>
          <span 
            v-else-if="String((row as Student).government_uid).trim().length !== 17" 
            class="enq-badge enq-badge--rejected" 
            style="margin-left: 4px; padding: 2px 6px; background: rgba(234, 179, 8, 0.16); color: var(--color-warning);"
          >
            {{ t('Error') }}
          </span>
        </div>
      </template>

      <template #actions="{ row }">
        <!-- Prominent inline Sync Action button -->
        <button 
          type="button" 
          class="btn btn--primary btn--small" 
          :disabled="editedUids[(row as Student).id!] === (row as Student).government_uid"
          @click="saveInlineUid(row as Student)"
        >
          <i class="fa-duotone fa-fingerprint" /> {{ t('Sync ⚡') }}
        </button>
      </template>
    </DataTable>
  </section>
</template>
