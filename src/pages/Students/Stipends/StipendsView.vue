<!-- Students > Stipend & Scholarship Planning Page -->
<script setup lang="ts">
// Stipends & Scholarships: registers PESP/SEIP government stipend eligible students,
// configures MFS gateways, handles advanced conditional allocations, and displays real-time financial stats.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, saveStudent, type Student } from '@/composables/Students/useStudents'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import StipendSetupModal from './StipendSetupModal.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'StipendsView' })

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

const showForm = ref(false)
const editingStudent = ref<Student | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'stipend_type', label: t('Scheme / Category'), sortable: true, align: 'center', render: (r) => (r as Student).stipend_type || '—' },
  { key: 'stipend_amount', label: t('Disbursed Amount'), sortable: true, align: 'center', render: (r) => (r as Student).stipend_amount ? `৳ ${(r as Student).stipend_amount}` : '—' },
  { key: 'stipend_status', label: t('Status'), sortable: true, align: 'center' },
  { key: 'stipend_mfs_provider', label: t('MFS Provider'), sortable: true, align: 'center', render: (r) => (r as Student).stipend_mfs_provider || '—' },
  { key: 'stipend_mfs_number', label: t('MFS Mobile Number'), sortable: true, align: 'center', render: (r) => (r as Student).stipend_mfs_number || '—' },
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

// Compute real-time KPIs based on filtered students list
const stats = computed(() => {
  let totalRecipients = 0
  let activeRecipients = 0
  let suspendedRecipients = 0
  let totalBudget = 0
  
  for (const s of filteredStudents.value) {
    if (s.stipend_eligible) {
      totalRecipients++
      const status = s.stipend_status || 'Active'
      if (status === 'Active') {
        activeRecipients++
        totalBudget += Number(s.stipend_amount || 0)
      } else if (status === 'Suspended') {
        suspendedRecipients++
      }
    }
  }
  
  return {
    totalRecipients,
    activeRecipients,
    suspendedRecipients,
    totalBudget,
  }
})

function filterRoster() {
  if (!activeYearId.value) {
    filteredStudents.value = []
    return
  }
  filteredStudents.value = students.value.filter(
    (s) => Number(s.academic_year_id) === Number(activeYearId.value) && s.class_name === activeClass.value,
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

function openEdit(item: Student) {
  editingStudent.value = item
  showForm.value = true
}

async function onSave(item: Student) {
  const saved = await saveStudent(item)
  if (saved) {
    toast.success(t('Successfully updated stipend configurations!'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
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
        <h1>{{ t('Stipend & Scholarship') }}</h1>
        <p>{{ t('Define candidate eligibility registries, map verified parent mobile banking MFS gateways, and audit safety net disbursement lists.') }}</p>
      </div>
    </header>

    <!-- Financial KPI Summary Widget Ribbon -->
    <div v-if="filteredStudents.length > 0" class="std-dash-grid animate-fade-in">
      <div class="std-dash-card std-dash-card--info">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Total Recipients') }}</span>
          <span class="std-dash-card__value">{{ stats.totalRecipients }}</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-user-group" /></div>
      </div>
      <div class="std-dash-card std-dash-card--success">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Active Disbursements') }}</span>
          <span class="std-dash-card__value">{{ stats.activeRecipients }}</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-check-double" /></div>
      </div>
      <div class="std-dash-card std-dash-card--warning">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Suspended Accounts') }}</span>
          <span class="std-dash-card__value">{{ stats.suspendedRecipients }}</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-triangle-exclamation" /></div>
      </div>
      <div class="std-dash-card">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Total Allocation Budget') }}</span>
          <span class="std-dash-card__value">৳ {{ stats.totalBudget.toLocaleString() }}</span>
        </div>
        <div class="std-dash-card__icon" style="background: rgba(99, 102, 241, 0.16); color: rgb(99, 102, 241);"><i class="fa-duotone fa-sack-dollar" /></div>
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
      :empty-text="t('No students found in the selected class and sessional year.')"
    >
      <template #stipend_status="{ row }">
        <span 
          v-if="(row as Student).stipend_eligible" 
          class="status-badge" 
          :class="{
            'status-badge--success': ((row as Student).stipend_status || 'Active') === 'Active',
            'status-badge--warning': (row as Student).stipend_status === 'Suspended',
            'status-badge--danger': (row as Student).stipend_status === 'Terminated'
          }"
        >
          {{ (row as Student).stipend_status || 'Active' }}
        </span>
        <span v-else>—</span>
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as Student)">
          <i class="fa-duotone fa-hand-holding-dollar" /> {{ t('Configure') }}
        </button>
      </template>
    </DataTable>

    <!-- Form modal (Configure Stipend) -->
    <BaseModal
      v-if="showForm"
      :title="t('Configure Stipend & Scholarship')"
      wide
      panel-class="std-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <StipendSetupModal
        v-if="editingStudent"
        :student="editingStudent"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
