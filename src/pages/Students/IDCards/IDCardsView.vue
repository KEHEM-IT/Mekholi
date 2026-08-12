<!-- Students > Student ID Cards Page -->
<script setup lang="ts">
// Student ID Cards: displays a roster list of active students, supports selective bulk checks,
// configures premium card themes/orientations, and generates A4 printable sheets with automatic validity checks.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, type Student } from '@/composables/Students/useStudents'
import { useCardInfo } from '@/composables/Institute_Setup/useCardInfo'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'IDCardsView' })

const { t } = useTranslator()
const toast = useToast()

// Optimized: fetch only institute name and logo (not the full profile)
const { instituteNameEn, instituteLogo, load: loadCardInfo } = useCardInfo()
const instituteName = computed(() => instituteNameEn.value || 'Sofir Uddin School')

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const students = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])

// Selection state — default to Class 6 and first available year
const activeYearId = ref<number | null>(null)
const activeClass = ref('Class 6')

// Map JSON English word names to DB "Class N" standards
const classMap: Record<string, string> = {
  'One': 'Class 1',
  'Two': 'Class 2',
  'Three': 'Class 3',
  'Four': 'Class 4',
  'Five': 'Class 5',
  'Six': 'Class 6',
  'Seven': 'Class 7',
  'Eight': 'Class 8',
  'Nine': 'Class 9',
  'Ten': 'Class 10',
  'Eleven': 'Class 11',
  'Twelve': 'Class 12',
}

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

// Search filter inside roster
const searchQuery = ref('')

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'select', label: t('Select'), align: 'center' },
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'roll_no', label: t('Roll No'), sortable: true, align: 'center', render: (r) => String((r as Student).roll_no ?? '—') },
])

const classOptions = computed(() =>
  (classNamesJson as { Id: number; Name: string; NameInBangla: string; Phase: string; SortOrder: number }[]).map((c) => {
    const dbName = classMap[c.Name] || c.Name
    return {
      Id: dbName,
      LookupText: `${c.Name} - ${c.NameInBangla}`,
      DisplayText: `${c.Name} - ${c.NameInBangla}`,
    }
  }),
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

// Searchable and filtered list
const searchedStudents = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return filteredStudents.value
  return filteredStudents.value.filter(
    s => s.candidate_name.toLowerCase().includes(q) || 
         s.student_id.toLowerCase().includes(q) ||
         (s.candidate_name_bn && s.candidate_name_bn.includes(q))
  )
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
  await Promise.all([loadAll(), loadCardInfo(), minDelay])
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
      <div class="roster-table-block ipf-section">
        <div class="table-header-controls">
          <h4 class="ipf-section__title roster-title">
            <i class="fa-duotone fa-list-ul" />
            {{ t('Student Register') }}
          </h4>
          <input
            v-model="searchQuery"
            type="search"
            class="search-input roster-search"
            :placeholder="t('Search name or ID...')"
          />
        </div>

        <DataTable
          :columns="tableColumns"
          :rows="searchedStudents"
          row-key="id"
          default-sort-key="student_id"
          :empty-text="t('No active student records found. Select a different class or academic year to load.')"
        >
          <!-- Selective check column -->
          <template #select="{ row }">
            <input 
              type="checkbox" 
              :checked="!!selectedStudentIds[(row as Student).id!]" 
              @change="selectedStudentIds[(row as Student).id!] = ($event.target as HTMLInputElement).checked"
              class="std-checkbox"
              style="transform: scale(1.15); cursor: pointer;"
              @click.stop
            />
          </template>

          <template #actions="{ row }">
            <button type="button" class="btn btn--ghost br-card__btn" @click="triggerRowPreview(row as Student)">
              <i class="fa-duotone fa-eye" /> {{ t('Focus Preview') }}
            </button>
          </template>
        </DataTable>
      </div>

      <!-- Right side: Live Card Preview & Layout Controllers -->
      <div class="id-card-preview-panel">
        <div class="id-card-preview-top">
          <h4 class="section-sub-title console-title">
            {{ t('ID Card Console') }}
          </h4>

          <!-- Controls -->
          <div class="design-controls">
            <div class="form-field">
              <label class="control-label">{{ t('Card Design Theme') }}</label>
              <BaseCombobox
                v-model="cardTemplate"
                :options="templateOptions"
                option-value="Id"
                option-label="DisplayText"
                :clearable="false"
              />
            </div>
            <div class="form-field">
              <label class="control-label">{{ t('Card Orientation') }}</label>
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
          <div v-if="previewTarget" class="live-mockup-wrapper animate-fade-in">
            <div class="std-id-card-preview" :class="[cardOrientation, cardTemplate]">
              <!-- Institute Logo -->
              <div class="std-id-card-logo">
                <img v-if="instituteLogo" :src="instituteLogo" :alt="instituteName" />
                <i v-else class="fa-duotone fa-school" />
              </div>

              <!-- Header -->
              <div class="std-id-card-header">
                <h3>{{ instituteName }}</h3>
                <p>{{ t('STUDENT IDENTITY CARD') }}</p>
              </div>
              
              <!-- Landscape specific wrapper -->
              <div v-if="cardOrientation === 'orientation-landscape'" class="card-middle-content">
                <div class="std-id-card-avatar">
                  <img v-if="previewTarget.photo" :src="previewTarget.photo" alt="Student Photo" />
                  <i v-else class="fa-duotone fa-user-graduate" />
                </div>

                <div class="std-id-card-info">
                  <h4 class="card-student-name">{{ previewTarget.candidate_name }}</h4>
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
                  <h4 class="card-student-name">{{ previewTarget.candidate_name }}</h4>
                  <p>{{ t('Student ID:') }} <strong>{{ previewTarget.student_id }}</strong></p>
                  <p>{{ t('Class:') }} {{ previewTarget.class_name }} · {{ t('Section:') }} {{ previewTarget.section_name }}</p>
                  <p>{{ t('Roll No:') }} {{ previewTarget.roll_no }}</p>
                  <p v-if="previewTarget.blood_group">{{ t('Blood Group:') }} {{ previewTarget.blood_group }}</p>
                </div>
              </template>

              <!-- Footer with Signatures -->
              <div class="std-id-card-footer">
                <div class="signature-block">
                  <span class="signature-line" />
                  <span class="signature-label">{{ t('Class Teacher') }}</span>
                </div>
                <div class="signature-block">
                  <span class="signature-line" />
                  <span class="signature-label">{{ t('Headmaster') }}</span>
                </div>
              </div>
            </div>

            <!-- Verification Metadata checklist tags -->
            <div class="validity-indicators">
              <span class="status-badge status-badge--success badge-sm">
                ✓ {{ t('Active') }}
              </span>
              <span
                class="status-badge badge-sm"
                :class="previewTarget.photo ? 'status-badge--success' : 'status-badge--danger'"
              >
                {{ previewTarget.photo ? '✓ Photo Attached' : '✗ No Photo' }}
              </span>
              <span
                class="status-badge badge-sm"
                :class="previewTarget.government_uid && previewTarget.government_uid.length === 17 ? 'status-badge--success' : 'status-badge--warning'"
              >
                {{ previewTarget.government_uid && previewTarget.government_uid.length === 17 ? '✓ Synced UID' : '✗ Unsynced UID' }}
              </span>
            </div>
          </div>
          <div v-else class="empty-preview-mockup">
            <i class="fa-duotone fa-id-card empty-icon" />
            <p class="text-muted empty-text">{{ t('Select a student from the register roster list to focus preview card.') }}</p>
          </div>
        </div>

        <div v-if="previewTarget" class="panel-print-actions">
          <button type="button" class="btn btn--primary w-full" @click="printCard">
            <i class="fa-duotone fa-print" /> {{ t('Print Roster Cards') }} ({{ checkedStudents.length }})
          </button>
        </div>
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
        <!-- Institute Logo -->
        <div class="std-id-card-logo">
          <img v-if="instituteLogo" :src="instituteLogo" :alt="instituteName" />
          <i v-else class="fa-duotone fa-school" />
        </div>

        <!-- Header -->
        <div class="std-id-card-header">
          <h3>{{ instituteName }}</h3>
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

        <!-- Footer with Signatures -->
        <div class="std-id-card-footer">
          <div class="signature-block">
            <span class="signature-line" />
            <span class="signature-label">{{ t('Class Teacher') }}</span>
          </div>
          <div class="signature-block">
            <span class="signature-line" />
            <span class="signature-label">{{ t('Headmaster') }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
