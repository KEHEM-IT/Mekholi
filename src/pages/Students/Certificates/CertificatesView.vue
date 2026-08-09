<!-- Students > Transfer Certificates & Character Testimonials Page -->
<script setup lang="ts">
// Certificates & Testimonials: displays student registries and lets admins preview
// and print official bilingual Character Certificates (প্রশংসাপত্র) and Transfer Certificates (TC).
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, type Student } from '@/composables/Students/useStudents'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'CertificatesView' })

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

function openPreview(item: Student) {
  previewTarget.value = item
  showForm.value = true
}

function printCertificate() {
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
        <h1>{{ t('TC & Certificates') }}</h1>
        <p>{{ t('Generate, preview, and print official bilingual Character Certificates (প্রশংসাপত্র) and Transfer Certificates (TC).') }}</p>
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
      :empty-text="t('No student records found inside this class.')"
    >
      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openPreview(row as Student)">
          <i class="fa-duotone fa-certificate" /> {{ t('Generate Certificate') }}
        </button>
      </template>
    </DataTable>

    <!-- Character Certificate Modal -->
    <BaseModal
      v-if="showForm"
      :title="t('Character Certificate Preview')"
      wide
      @close="showForm = false"
    >
      <div class="ipfp">
        <div class="ipfp-body">
          <div class="std-cert-preview">
            <h3 class="std-cert-title">CHARACTER CERTIFICATE</h3>
            <div class="std-cert-body" v-if="previewTarget">
              <p>
                This is to certify that <strong>{{ previewTarget.candidate_name }}</strong>,
                son/daughter of {{ previewTarget.guardian_name }}, was a student of this institution in
                class <strong>{{ previewTarget.class_name }}</strong> under Roll No <strong>{{ previewTarget.roll_no }}</strong>.
              </p>
              <p>
                To the best of my knowledge, he/she bears a good moral character and took active interest in co-curricular activities. I wish him/her every success in life.
              </p>
            </div>
            <div class="std-cert-footer">
              <div class="sig-line">{{ t('Date of Issue') }}</div>
              <div class="sig-line">{{ t('Principal Signature') }}</div>
            </div>
          </div>
        </div>
        <div class="ipfp-form-actions">
          <button type="button" class="btn" @click="showForm = false">
            {{ t('Close') }}
          </button>
          <button type="button" class="btn btn--primary" @click="printCertificate">
            <i class="fa-duotone fa-print" /> {{ t('Print Certificate') }}
          </button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
