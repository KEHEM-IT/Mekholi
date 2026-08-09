<!-- Students > Behavior & Discipline Page -->
<script setup lang="ts">
// Behavior & Discipline: manages point-based behavioral logs, lets class teachers reward
// student merits (+5 points) or log uniform/attendance demerits (-5 points) in real-time.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, saveStudent, type Student } from '@/composables/Students/useStudents'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'BehaviorLogsView' })

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

// Behavior Action states
const showForm = ref(false)
const selectedStudent = ref<Student | null>(null)
const pointDelta = ref<number>(5)
const behaviorActionType = ref<'merit' | 'demerit'>('merit')
const behaviorNotes = ref('')

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'roll_no', label: t('Roll No'), sortable: true, align: 'center', render: (r) => String((r as Student).roll_no ?? '—') },
  { key: 'behavior_points', label: t('Behavior Points'), sortable: true, align: 'center', render: (r) => renderPoints(r as Student) },
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

const actionTypeOptions = [
  { Id: 'merit', LookupText: 'Add Merit Points (+)' },
  { Id: 'demerit', LookupText: 'Deduct Demerit Points (-)' },
]

// ── Render Helpers ─────────────────────────────────────────────────────

function renderStudentName(row: Student): string {
  if (row.candidate_name_bn) {
    return `${row.candidate_name} (${row.candidate_name_bn})`
  }
  return row.candidate_name
}

function renderPoints(row: Student): string {
  const pts = row.behavior_points ?? 100
  return `${pts} pts`
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

function openAction(item: Student) {
  selectedStudent.value = item
  pointDelta.value = 5
  behaviorActionType.value = 'merit'
  behaviorNotes.value = ''
  showForm.value = true
}

async function saveAction() {
  if (!selectedStudent.value) return
  
  const currentPts = selectedStudent.value.behavior_points ?? 100
  const factor = behaviorActionType.value === 'merit' ? 1 : -1
  const change = pointDelta.value * factor
  const finalPts = Math.max(0, currentPts + change)
  
  const updated = { ...selectedStudent.value, behavior_points: finalPts }
  const saved = await saveStudent(updated)
  if (saved) {
    toast.success(t('Successfully updated student behavioral logs!'))
    showForm.value = false
    selectedStudent.value = null
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
        <h1>{{ t('Behavior & Discipline') }}</h1>
        <p>{{ t('Log merit-demerit points in real-time, reward positive behavior, and archive disciplinary actions.') }}</p>
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
      <template #behavior_points="{ row }">
        <span class="font-bold tracking-wider" :class="(row as Student).behavior_points < 100 ? 'text-danger' : 'text-success'">
          {{ (row as Student).behavior_points ?? 100 }} pts
        </span>
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openAction(row as Student)">
          <i class="fa-duotone fa-heart-pulse" /> {{ t('Log Action') }}
        </button>
      </template>
    </DataTable>

    <!-- Behavior Log Action Modal -->
    <BaseModal
      v-if="showForm"
      :title="t('Log Disciplinary / Merit Action')"
      @close="showForm = false"
    >
      <div class="ipfp">
        <div class="ipfp-body">
          <div class="ipfp-section">
            <h4 class="ipfp-section__title">
              <i class="fa-duotone fa-heart-pulse" />
              {{ t('Behavior Log Entries') }}
            </h4>
            <div class="ipf-grid">
              <div class="form-field">
                <label>{{ t('Student Name') }}</label>
                <input :value="selectedStudent ? selectedStudent.candidate_name : ''" type="text" disabled class="is-disabled" />
              </div>
              <div class="form-field">
                <label>{{ t('Action Type') }}</label>
                <BaseCombobox
                  v-model="behaviorActionType"
                  :options="actionTypeOptions"
                  option-value="Id"
                  option-label="LookupText"
                  :placeholder="t('Select type')"
                />
              </div>
              <div class="form-field">
                <label>{{ t('Points Delta') }}</label>
                <input v-model.number="pointDelta" type="number" min="1" max="100" />
              </div>
              <div class="form-field ipf-field--full">
                <label>{{ t('Disciplinary Remarks / notes') }}</label>
                <textarea v-model="behaviorNotes" rows="3" :placeholder="t('Log uniform infraction, context details, or merit achievements...')" />
              </div>
            </div>
          </div>
        </div>
        <div class="ipfp-form-actions">
          <button type="button" class="btn" @click="showForm = false">
            {{ t('Cancel') }}
          </button>
          <button type="button" class="btn btn--primary" @click="saveAction">
            <i class="fa-duotone fa-floppy-disk" /> {{ t('Save Log Record') }}
          </button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
