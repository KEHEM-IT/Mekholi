<!-- Students > Student ID Cards Page -->
<script setup lang="ts">
// Student ID Cards: displays a roster list of active students, supports selective bulk checks,
// configures premium card themes/orientations, and generates A4 printable sheets.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, type Student } from '@/composables/Students/useStudents'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'IDCardsView' })

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

// ID Card Template Configurations
const cardTemplate = ref('theme-modern-dark')
const cardOrientation = ref('orientation-portrait')

const templateOptions = [
  { Id: 'theme-modern-dark', DisplayText: 'Modern Dark — গ্ল্যামারাস ডার্ক' },
  { Id: 'theme-corporate-blue', DisplayText: 'Corporate Blue — প্রাতিষ্ঠানিক ব্লু' },
  { Id: 'theme-emerald-minimal', DisplayText: 'Emerald Minimal — পরিবেশ বান্ধব গ্রিন' },
]

const orientationOptions = [
  { Id: 'orientation-portrait', DisplayText: 'Portrait — খাড়া লম্বা কার্ড' },
  { Id: 'orientation-landscape', DisplayText: 'Landscape — আড়াআড়ি চওড়া কার্ড' },
]

// Bulk Selection checkbox mapping
const selectedStudentIds = ref<Record<number, boolean>>({})

// Live card preview focus
const previewTarget = ref<Student | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'select', label: t('Select'), align: 'center' },
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

// List of all checked students
const checkedStudents = computed(() => {
  return filteredStudents.value.filter(s => !!selectedStudentIds.value[s.id!])
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

// Auto-fill checkbox states on filtered roster changes
watch(filteredStudents, (newList) => {
  const newMap: Record<number, boolean> = {}
  for (const s of newList) {
    if (s.id) {
      newMap[s.id] = selectedStudentIds.value[s.id] !== undefined ? selectedStudentIds.value[s.id] : true
    }
  }
  selectedStudentIds.value = newMap
  
  // Set first student as preview target
  if (newList.length > 0) {
    previewTarget.value = newList[0]
  } else {
    previewTarget.value = null
  }
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

function triggerRowPreview(student: Student) {
  previewTarget.value = student
}

function printCard() {
  if (checkedStudents.value.length === 0) {
    toast.error(t('Please select at least one student in the list to print.'))
    return
  }
  toast.success(t('Opening system print dialog for {count} cards...', { count: checkedStudents.value.length }))
  setTimeout(() => {
    window.print()
  }, 500)
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
        <p>{{ t('Generate, preview, and print beautiful, customized sessional student ID cards on-the-fly. Prints 8 cards per A4 page.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button 
          type="button" 
          class="btn btn--primary" 
          :disabled="checkedStudents.length === 0" 
          @click="printCard"
        >
          <i class="fa-duotone fa-print" /> {{ t('Print Selected Cards') }} ({{ checkedStudents.length }})
        </button>
      </div>
    </header>

    <!-- Selection filters -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-sliders" />
        {{ t('Select Class Scope') }}
      </h4>
      <div class="promote-grid">
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

    <!-- Main Workspace Grid -->
    <div class="id-cards-grid-layout">
      <!-- Left side: Student list data table -->
      <div class="roster-table-block">
        <DataTable
          :columns="tableColumns"
          :rows="filteredStudents"
          row-key="id"
          default-sort-key="student_id"
          :empty-text="t('No active student records found inside this class.')"
        >
          <!-- Selective check column -->
          <template #select="{ row }">
            <input 
              type="checkbox" 
              :checked="!!selectedStudentIds[(row as Student).id!]" 
              @change="selectedStudentIds[(row as Student).id!] = ($event.target as HTMLInputElement).checked"
              class="std-checkbox"
              style="transform: scale(1.15); cursor: pointer;"
            />
          </template>

          <template #actions="{ row }">
            <button type="button" class="btn btn--ghost br-card__btn" @click="triggerRowPreview(row as Student)">
              <i class="fa-duotone fa-eye" /> {{ t('Preview') }}
            </button>
          </template>
        </DataTable>
      </div>

      <!-- Right side: Live Card Preview & Layout Controllers -->
      <div class="id-card-preview-panel">
        <h4 class="section-sub-title" style="border-left: 3px solid var(--color-primary); padding-left: 8px; text-align: left; margin-bottom: 1.5rem;">
          {{ t('Design & Live Preview') }}
        </h4>

        <!-- Controls -->
        <div class="design-controls" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; text-align: left;">
          <div class="form-field">
            <label>{{ t('Card Design Theme') }}</label>
            <BaseCombobox
              v-model="cardTemplate"
              :options="templateOptions"
              option-value="Id"
              option-label="DisplayText"
              :clearable="false"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Card Orientation') }}</label>
            <BaseCombobox
              v-model="cardOrientation"
              :options="orientationOptions"
              option-value="Id"
              option-label="DisplayText"
              :clearable="false"
            />
          </div>
        </div>

        <!-- Live Visual Mockup Box -->
        <div v-if="previewTarget" class="live-mockup-wrapper" style="padding: 1rem; background: var(--color-bg); border-radius: 8px; border: 1px dashed var(--color-border);">
          <div class="std-id-card-preview" :class="[cardOrientation, cardTemplate]">
            <!-- Header -->
            <div class="std-id-card-header">
              <h3>{{ t('Sofir Uddin School') }}</h3>
              <p>{{ t('STUDENT IDENTITY CARD') }}</p>
            </div>
            
            <!-- Landscape specific wrapper -->
            <div v-if="cardOrientation === 'orientation-landscape'" class="card-middle-content">
              <div class="std-id-card-avatar">
                <img v-if="previewTarget.photo" :src="previewTarget.photo" alt="Student Photo" />
                <i v-else class="fa-duotone fa-user-graduate" />
              </div>

              <div class="std-id-card-info">
                <h4 style="font-size: 0.95rem;">{{ previewTarget.candidate_name }}</h4>
                <p>{{ t('ID:') }} <strong>{{ previewTarget.student_id }}</strong></p>
                <p>{{ t('Class:') }} {{ previewTarget.class_name }}</p>
                <p>{{ t('Sec:') }} {{ previewTarget.section_name }} · {{ t('Roll:') }} {{ previewTarget.roll_no }}</p>
                <p v-if="previewTarget.blood_group">{{ t('Blood:') }} {{ previewTarget.blood_group }}</p>
              </div>
            </div>

            <!-- Portrait specific layout -->
            <template v-else>
              <div class="std-id-card-avatar">
                <img v-if="previewTarget.photo" :src="previewTarget.photo" alt="Student Photo" />
                <i v-else class="fa-duotone fa-user-graduate" />
              </div>

              <div class="std-id-card-info">
                <h4 style="font-size: 1rem; margin-bottom: 2px;">{{ previewTarget.candidate_name }}</h4>
                <p>{{ t('Student ID:') }} <strong>{{ previewTarget.student_id }}</strong></p>
                <p>{{ t('Class:') }} {{ previewTarget.class_name }} · {{ t('Section:') }} {{ previewTarget.section_name }}</p>
                <p>{{ t('Roll No:') }} {{ previewTarget.roll_no }}</p>
                <p v-if="previewTarget.blood_group">{{ t('Blood Group:') }} {{ previewTarget.blood_group }}</p>
              </div>
            </template>

            <!-- Footer -->
            <div class="std-id-card-footer">
              <span>{{ t('Session 2026') }}</span>
              <span>{{ t('Verified ID') }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-muted" style="font-size: 0.85rem;">{{ t('Select a student from the list to preview card.') }}</p>
      </div>
    </div>

    <!-- HIDDEN A4 PRINTABLE SHEET (Only visible on browser print window) -->
    <div class="id-cards-print-sheet">
      <div 
        v-for="s in checkedStudents" 
        :key="s.student_id" 
        class="std-id-card-preview" 
        :class="[cardOrientation, cardTemplate]"
      >
        <!-- Header -->
        <div class="std-id-card-header">
          <h3>{{ t('Sofir Uddin School') }}</h3>
          <p>{{ t('STUDENT IDENTITY CARD') }}</p>
        </div>
        
        <!-- Landscape layout -->
        <div v-if="cardOrientation === 'orientation-landscape'" class="card-middle-content">
          <div class="std-id-card-avatar">
            <img v-if="s.photo" :src="s.photo" alt="Student Photo" />
            <i v-else class="fa-duotone fa-user-graduate" />
          </div>

          <div class="std-id-card-info">
            <h4 style="font-size: 0.95rem;">{{ s.candidate_name }}</h4>
            <p>{{ t('ID:') }} <strong>{{ s.student_id }}</strong></p>
            <p>{{ t('Class:') }} {{ s.class_name }}</p>
            <p>{{ t('Sec:') }} {{ s.section_name }} · {{ t('Roll:') }} {{ s.roll_no }}</p>
            <p v-if="s.blood_group">{{ t('Blood:') }} {{ s.blood_group }}</p>
          </div>
        </div>

        <!-- Portrait Layout -->
        <template v-else>
          <div class="std-id-card-avatar">
            <img v-if="s.photo" :src="s.photo" alt="Student Photo" />
            <i v-else class="fa-duotone fa-user-graduate" />
          </div>

          <div class="std-id-card-info">
            <h4 style="font-size: 1rem; margin-bottom: 2px;">{{ s.candidate_name }}</h4>
            <p>{{ t('Student ID:') }} <strong>{{ s.student_id }}</strong></p>
            <p>{{ t('Class:') }} {{ s.class_name }} · {{ t('Section:') }} {{ s.section_name }}</p>
            <p>{{ t('Roll No:') }} {{ s.roll_no }}</p>
            <p v-if="s.blood_group">{{ t('Blood Group:') }} {{ s.blood_group }}</p>
          </div>
        </template>

        <!-- Footer -->
        <div class="std-id-card-footer">
          <span>{{ t('Session 2026') }}</span>
          <span>{{ t('Verified ID') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
