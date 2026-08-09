<!-- Students > Unique ID (UID) Sync Page -->
<script setup lang="ts">
// Unique ID Sync: registers and matches local Student IDs with the mandatory
// 17-digit government assigned CRVS unique ID needed for national boards.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, saveStudent, type Student } from '@/composables/Students/useStudents'
import BaseModal from '@/components/ui/BaseModal.vue'
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

// Local modal states for auditing individual UID
const showForm = ref(false)
const editingStudent = ref<Student | null>(null)
const localUid = ref('')

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'government_uid', label: t('Government 17-digit UID'), sortable: true, align: 'center', render: (r) => (r as Student).government_uid || t('Missing UID') },
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

const missingUidCount = computed(() => {
  return filteredStudents.value.filter((s) => !s.government_uid && s.is_active).length
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
  localUid.value = item.government_uid || ''
  showForm.value = true
}

async function onSave() {
  if (!editingStudent.value) return
  
  // Validate 17-digit numeric string
  const clean = localUid.value.replace(/\D/g, '')
  if (clean && clean.length !== 17) {
    toast.error(t('Government Unique ID must be exactly 17 digits.'))
    return
  }
  
  const updated = { ...editingStudent.value, government_uid: clean }
  const saved = await saveStudent(updated)
  if (saved) {
    toast.success(t('Successfully synchronized government unique ID!'))
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
        <h1>{{ t('Unique ID (UID) Sync') }}</h1>
        <p>{{ t('Collect, audit, and bulk-sync the mandatory 17-digit Civil Registration and Vital Statistics (CRVS) student UIDs required by national boards.') }}</p>
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

    <!-- Alert cards if there are missing UIDs -->
    <div class="waiting-summary-grid">
      <div class="waiting-card" :class="missingUidCount > 0 ? 'waiting-card--warning' : 'waiting-card--info'">
        <div class="waiting-card__info">
          <span class="waiting-card__label">{{ t('Missing Government UIDs') }}</span>
          <span class="waiting-card__value">{{ missingUidCount }} / {{ filteredStudents.length }}</span>
        </div>
        <div class="waiting-card__icon">
          <i class="fa-duotone" :class="missingUidCount > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'" />
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
      <template #government_uid="{ row }">
        <span v-if="(row as Student).government_uid" class="font-bold tracking-wider">
          {{ (row as Student).government_uid }}
        </span>
        <span v-else class="enq-badge enq-badge--rejected">
          {{ t('Missing UID') }}
        </span>
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as Student)">
          <i class="fa-duotone fa-fingerprint" /> {{ t('Sync UID') }}
        </button>
      </template>
    </DataTable>

    <!-- Sync UID Modal -->
    <BaseModal
      v-if="showForm"
      :title="t('Synchronize Government Unique ID')"
      @close="showForm = false"
    >
      <div class="ipfp">
        <div class="ipfp-body">
          <div class="ipfp-section">
            <h4 class="ipfp-section__title">
              <i class="fa-duotone fa-fingerprint" />
              {{ t('Government CRVS UID Mapping') }}
            </h4>
            <div class="ipf-grid">
              <div class="form-field">
                <label>{{ t('Student Name') }}</label>
                <input :value="editingStudent ? editingStudent.candidate_name : ''" type="text" disabled class="is-disabled" />
              </div>
              <div class="form-field">
                <label>{{ t('Government 17-digit UID') }} *</label>
                <input v-model="localUid" type="text" maxlength="17" :placeholder="t('Enter 17-digit number')" />
              </div>
            </div>
          </div>
        </div>
        <div class="ipfp-form-actions">
          <button type="button" class="btn" @click="showForm = false">
            {{ t('Cancel') }}
          </button>
          <button type="button" class="btn btn--primary" @click="onSave">
            <i class="fa-duotone fa-floppy-disk" /> {{ t('Save Sync Record') }}
          </button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
