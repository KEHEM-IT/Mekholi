<!-- Students > Student List Page -->
<script setup lang="ts">
// Student List: displays a sortable, sticky-header table containing enrolled student registers,
// and supports full CRUD actions, status toggling, and Excel bulk exports.
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import {
  fetchStudents,
  saveStudent,
  deleteStudent,
  type Student,
} from '@/composables/Students/useStudents'
import { exportStudentsToExcel } from '@/composables/Students/useStudentsExcel'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import StudentProfileFormModal from './StudentProfileFormModal.vue'

defineOptions({ name: 'StudentListView' })

const { t } = useTranslator()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const students = ref<Student[]>([])
const years = ref<AcademicYear[]>([])
const filteredStudents = ref<Student[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingStudent = ref<Student | null>(null)

// Selection filters
const activeYearId = ref<number | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'guardian_name', label: t('Guardian Name'), sortable: true },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'section_name', label: t('Section'), sortable: true, align: 'center' },
  { key: 'roll_no', label: t('Roll No'), sortable: true, align: 'center', render: (r) => String((r as Student).roll_no ?? '—') },
  { key: 'gender', label: t('Gender'), sortable: true, align: 'center' },
  { key: 'is_active', label: t('Active'), align: 'center', sortable: true },
])

const yearOptions = computed(() =>
  years.value.map((y) => ({
    Id: Number(y.id),
    LookupText: String(y.year_name),
    DisplayText: String(y.year_name),
  })),
)

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
    (s) => Number(s.academic_year_id) === Number(activeYearId.value),
  )
}

watch([activeYearId, students], () => {
  filterRoster()
})

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

  // NID Scanner Prefill Logic
  if (route.query.prefill === 'nid') {
    const prefillDataStr = localStorage.getItem('nid_prefill_student')
    if (prefillDataStr) {
      try {
        const prefillData = JSON.parse(prefillDataStr)
        editingStudent.value = {
          ...prefillData,
          id: undefined, // treated as new student
          is_active: true,
          roll_no: 0,
          behavior_points: 100,
        } as unknown as Student
        showForm.value = true
        localStorage.removeItem('nid_prefill_student')
        router.replace({ name: 'student-list' })
      } catch (e) {
        console.error('Failed to parse NID prefill data:', e)
      }
    }
  }
})

function openAdd() {
  editingStudent.value = null
  showForm.value = true
}

function openEdit(item: Student) {
  editingStudent.value = item
  showForm.value = true
}

async function onSave(item: Student) {
  const saved = await saveStudent(item)
  if (saved) {
    toast.success(item.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: Student) {
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete student "{no}" - "{name}"?', { no: item.student_id, name: item.candidate_name }))
  if (!ok) return
  const deleted = await deleteStudent(id)
  if (deleted) {
    await loadAll()
    toast.action(t('Deleted'), {
      label: t('Undo'),
      onClick: async () => {
        const restored = await saveStudent({ ...item, id: undefined })
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

async function onToggleActive(item: Student) {
  const updated = { ...item, is_active: !item.is_active }
  const saved = await saveStudent(updated)
  if (saved) {
    toast.success(t('Updated'))
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

function handleExport() {
  try {
    exportStudentsToExcel(filteredStudents.value)
    toast.success(t('Excel downloaded'))
  } catch (err) {
    toast.error(t('Export failed: {error}', { error: err instanceof Error ? err.message : 'unknown' }))
  }
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
        <h1>{{ t('Student List') }}</h1>
        <p>{{ t('Browse sortable registers, edit candidate profiles, log sessional class rankings, and track active student accounts.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Student') }}
        </button>
        <button type="button" class="btn ipf-header__export" :disabled="!filteredStudents.length" @click="handleExport">
          <i class="fa-duotone fa-file-excel" /> {{ t('Export') }}
        </button>
      </div>
    </header>

    <!-- Selection filters -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-sliders" />
        {{ t('Select Register Scope') }}
      </h4>
      <div class="ipf-grid">
        <div class="form-field">
          <label>{{ t('Academic Year') }} *</label>
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

    <!-- Data table (reusable, sticky head, sortable, fullscreen, loading skeletons) -->
    <DataTable
      :columns="tableColumns"
      :rows="filteredStudents"
      row-key="id"
      default-sort-key="student_id"
      :empty-text="t('No students found in the selected register. Bulk import candidates or create one manually.')"
    >
      <template #is_active="{ row }">
        <BaseToggle
          :model-value="Boolean((row as Student).is_active)"
          :yes-label="t('Yes')"
          :no-label="t('No')"
          @update:model-value="onToggleActive(row as Student)"
        />
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as Student)">
          <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as Student)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Form modal (Add/Edit Student Profile) -->
    <BaseModal
      v-if="showForm"
      :title="editingStudent ? t('Edit Student Profile') : t('Add Student Profile')"
      wide
      panel-class="std-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <StudentProfileFormModal
        :student="editingStudent"
        :years="years"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
