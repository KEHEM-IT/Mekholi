<!-- Students > Student ID Cards Page -->
<script setup lang="ts">
// Student ID Cards: displays a roster list of active students and lets admins
// view and print beautiful, dark-themed sessional student ID cards on-the-fly.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, type Student } from '@/composables/Students/useStudents'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'IDCardsView' })

const { t } = useTranslator()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const students = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])

// Selection state
const activeYearId = ref<number | null>(null)
const activeClass = ref('Class 6')

// Preview modal states
const showForm = ref(false)
const previewTarget = ref<Student | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'roll_no', label: t('Roll No'), sortable: true, align: 'center', render: (r) => String((r as Student).roll_no ?? '—') },
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

function openPreview(item: Student) {
  previewTarget.value = item
  showForm.value = true
}

function printCard() {
  window.print()
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
        <h1>{{ t('Student ID Cards') }}</h1>
        <p>{{ t('Generate, preview, and print beautiful, dark-themed sessional student ID cards on-the-fly.') }}</p>
      </div>
    </header>

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
      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openPreview(row as Student)">
          <i class="fa-duotone fa-id-card" /> {{ t('Generate ID') }}
        </button>
      </template>
    </DataTable>

    <!-- ID Card Preview Modal -->
    <BaseModal
      v-if="showForm"
      :title="t('Student ID Card Certificate')"
      @close="showForm = false"
    >
      <div class="ipfp">
        <div class="ipfp-body">
          <div class="std-id-card-preview">
            <div class="std-id-card-header">
              <h3>Sofir Uddin School & College</h3>
              <p>{{ t('Student Identity Card') }}</p>
            </div>
            
            <div class="std-id-card-avatar">
              <i class="fa-duotone fa-user-graduate" />
            </div>

            <div class="std-id-card-info" v-if="previewTarget">
              <h4>{{ previewTarget.candidate_name }}</h4>
              <p>{{ t('Student ID:') }} <strong>{{ previewTarget.student_id }}</strong></p>
              <p>{{ t('Class:') }} {{ previewTarget.class_name }} · {{ t('Section:') }} {{ previewTarget.section_name }}</p>
              <p>{{ t('Roll No:') }} {{ previewTarget.roll_no }}</p>
              <p v-if="previewTarget.blood_group">{{ t('Blood Group:') }} {{ previewTarget.blood_group }}</p>
            </div>

            <div class="std-id-card-footer">
              <span>{{ t('Session 2026') }}</span>
              <span>{{ t('Verified ID') }}</span>
            </div>
          </div>
        </div>
        <div class="ipfp-form-actions">
          <button type="button" class="btn" @click="showForm = false">
            {{ t('Close') }}
          </button>
          <button type="button" class="btn btn--primary" @click="printCard">
            <i class="fa-duotone fa-print" /> {{ t('Print Card') }}
          </button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
