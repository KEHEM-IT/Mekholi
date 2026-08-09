<!-- Students > Add/Bulk Import Page -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { importStudentsFromExcel } from '@/composables/Students/useStudentsExcel'
import { importStudents, saveStudent, type Student } from '@/composables/Students/useStudents'
import StudentProfileFormModal from '../StudentList/StudentProfileFormModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'

defineOptions({ name: 'BulkImportView' })

const { t } = useTranslator()
const toast = useToast()

// Tab state
const activeTab = ref<'manual' | 'bulk'>('manual')

// Academic years for manual form
const years = ref<AcademicYear[]>([])

// Excel import states
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const selectedFile = ref<File | null>(null)

// Preview states
const parsedStudents = ref<Student[]>([])
const showPreview = ref(false)
const validationSummary = ref({ valid: 0, invalid: 0, total: 0 })

onMounted(async () => {
  years.value = await fetchAcademicYears()
})

// Columns for Excel Preview
const previewColumns: TableColumn[] = [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Name (English)'), sortable: true },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'roll_no', label: t('Roll No'), sortable: true, align: 'center' },
  { key: 'phone', label: t('Contact Phone'), sortable: true },
  { key: 'status', label: t('Validation'), align: 'center' },
]

// ── Manual Registration Helpers ────────────────────────────────────────

const onSaveManual = async (item: Student) => {
  const saved = await saveStudent(item)
  if (saved) {
    toast.success(t('Student profile created successfully!'))
    // Reset manual form by forcing key/tab refresh
    activeTab.value = 'bulk'
    setTimeout(() => {
      activeTab.value = 'manual'
    }, 10)
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

// ── Excel Bulk Import Helpers ──────────────────────────────────────────

function triggerImport() {
  excelInput.value?.click()
}

// Helper validation function to highlight warnings in preview
function validateRoster(list: Student[]) {
  let valid = 0
  let invalid = 0
  
  for (const s of list) {
    const errors: string[] = []
    if (!s.candidate_name) errors.push('Missing Name')
    if (!s.student_id) errors.push('Missing Student ID')
    if (!s.phone) {
      errors.push('Missing Phone')
    } else {
      const rawDigits = s.phone.replace(/\D/g, '')
      if (rawDigits.length !== 11 || !rawDigits.startsWith('01')) {
        errors.push('Invalid Phone (11 digits starting with 01)')
      }
    }
    if (!s.class_name) errors.push('Missing Class')
    if (s.roll_no === null || s.roll_no <= 0) errors.push('Invalid Roll')
    
    // Attach dynamically to the row object for rendering
    const rowRecord = s as unknown as Record<string, unknown>
    rowRecord.validationErrors = errors
    if (errors.length > 0) {
      invalid++
    } else {
      valid++
    }
  }
  
  return {
    valid,
    invalid,
    total: list.length,
  }
}

function getValidationErrors(row: unknown): string[] {
  const rowRecord = row as Record<string, unknown>
  return (rowRecord.validationErrors as string[]) || []
}

async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileName.value = file.name
  selectedFile.value = file
  
  try {
    const { students: imported } = await importStudentsFromExcel(file)
    parsedStudents.value = imported
    validationSummary.value = validateRoster(imported)
    showPreview.value = true
    toast.success(t('Parsed {count} rows. Review the details below.', { count: imported.length }))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(t('Parse failed: {error}', { error: msg }))
    showPreview.value = false
  }
}

async function uploadFile() {
  if (!selectedFile.value || parsedStudents.value.length === 0) {
    toast.error(t('Please select and parse a valid Excel file first.'))
    return
  }
  
  isImporting.value = true
  try {
    const result = await importStudents(parsedStudents.value)
    if (!result.ok) throw new Error('server')
    
    if (result.inserted === 0 && parsedStudents.value.length > 0) {
      toast.success(t('All rows already existed — no new profiles were added.'))
    } else {
      toast.success(
        t('Import completed! {added} profiles added, {skipped} existing skipped.', {
          added: result.inserted,
          skipped: result.skipped.length,
        }),
      )
    }
    
    // Clear selection
    fileName.value = ''
    selectedFile.value = null
    parsedStudents.value = []
    showPreview.value = false
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(t('Upload failed: {error}', { error: msg }))
  } finally {
    isImporting.value = false
  }
}

function downloadTemplate() {
  const headers = [
    'Student ID', 'Candidate Name', 'Candidate Name (Bangla)', 'Guardian Name',
    "Father's Name", "Father's NID", "Mother's Name", "Mother's NID",
    'Present Address', 'Permanent Address', 'Contact Phone', 'Email Address',
    'Academic Year ID', 'Class Name', 'Section Name', 'Roll No', 'Gender',
    'Date of Birth', 'Blood Group', 'Religion', 'Stipend Eligible (Yes/No)',
    'Stipend MFS Provider', 'Stipend MFS Number', 'Government UID', 'Behavior Points',
    'Student Photo URL', 'Birth Certificate URL', 'Is Active (Yes/No)',
  ]
  const sampleRow1 = [
    'STD-2026-0001', 'MOHAMMAD YUNUS', 'মোহাম্মদ ইউনুস', 'MUSTAFA ALI',
    'MUSTAFA ALI', '12345678901234567', 'MAJEDA BEGUM', '12345678901234568',
    'Mirpur, Dhaka, Bangladesh', 'Mirpur, Dhaka, Bangladesh', '01712345678', 'parent@example.com',
    '1', 'Class 6', 'A', '1', 'Male',
    '1995-10-15', 'O+', 'Islam', 'No',
    '', '', '20158219381029381', '100',
    '', '', 'Yes',
  ]
  const sampleRow2 = [
    'STD-2026-0002', 'SADIA ISLAM', 'সাদিয়া ইসলাম', 'KAMRUL ISLAM',
    'KAMRUL ISLAM', '12345678901234569', 'NAZMA BEGUM', '12345678901234570',
    'Sylhet Division, BD', 'Sylhet Division, BD', '01812345678', 'sadia@example.com',
    '1', 'Class 6', 'A', '2', 'Female',
    '1996-03-03', 'A+', 'Islam', 'Yes',
    'bKash', '01812345678', '20168219381029382', '100',
    '', '', 'Yes',
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2])
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 16) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, 'StudentsImportTemplate.xlsx')
  toast.success(t('Import template downloaded successfully!'))
}

// Check if a row has validation errors to color code it
const rowClassName = (row: unknown) => {
  const errors = getValidationErrors(row)
  return errors && errors.length > 0 ? 'preview-error-row' : ''
}
</script>

<template>
  <section class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Add & Bulk Import Students') }}</h1>
        <p>{{ t('Manually create student records with advanced NID OCR scanning or import thousands of student profiles at once using our standard uploader.') }}</p>
      </div>
      <div v-if="activeTab === 'bulk'" class="ipf-header__actions">
        <button type="button" class="btn btn--ghost" @click="downloadTemplate">
          <i class="fa-duotone fa-file-excel" /> {{ t('Download Template') }}
        </button>
      </div>
    </header>

    <!-- Tab navigation -->
    <div class="tabs-navigation-header">
      <button 
        type="button" 
        class="tab-nav-item" 
        :class="{ 'is-active': activeTab === 'manual' }"
        @click="activeTab = 'manual'"
      >
        <span class="tab-icon">📝</span>
        {{ t('Manual Registration') }}
      </button>
      <button 
        type="button" 
        class="tab-nav-item" 
        :class="{ 'is-active': activeTab === 'bulk' }"
        @click="activeTab = 'bulk'"
      >
        <span class="tab-icon">📊</span>
        {{ t('Excel Bulk Import') }}
      </button>
    </div>

    <!-- TAB 1: MANUAL STUDENT FORM -->
    <div v-if="activeTab === 'manual'" class="manual-registration-tab animate-fade-in">
      <StudentProfileFormModal
        :student="null"
        :years="years"
        @save="onSaveManual"
        @close="activeTab = 'bulk'"
      />
    </div>

    <!-- TAB 2: BULK EXCEL IMPORT -->
    <div v-if="activeTab === 'bulk'" class="bulk-import-tab animate-fade-in">
      <div class="ipf-section">
        <h4 class="ipf-section__title">
          <i class="fa-duotone fa-file-import" />
          {{ t('Excel Student Register Upload') }}
        </h4>
        <div class="ipf-upload" style="width: 100%;">
          <div class="ipf-logo" style="width: 100%; min-height: 12rem;" @click="triggerImport">
            <i class="fa-duotone fa-file-excel ipf-logo__icon" />
            <div class="ipf-logo__text">
              <span>{{ fileName || t('Click to select or drag and drop your Students Register Excel sheet here') }}</span>
              <small>{{ t('Supported formats: .xlsx, .xls (max 10 MB)') }}</small>
            </div>
            <input ref="excelInput" type="file" accept=".xlsx,.xls" class="ipf-logo__input" @change="onFilePicked" />
          </div>
        </div>

        <div class="flex justify-between items-center mt-4 w-full">
          <button type="button" class="btn" @click="downloadTemplate">
            <i class="fa-duotone fa-download" /> {{ t('Download Excel Template') }}
          </button>
          <button
            type="button"
            class="btn btn--primary"
            :disabled="isImporting || !selectedFile || parsedStudents.length === 0"
            @click="uploadFile"
          >
            <i class="fa-duotone" :class="isImporting ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'" />
            {{ t('Register Uploaded Students') }}
          </button>
        </div>
      </div>

      <!-- Live Excel Spreadsheet Preview Panel -->
      <div v-if="showPreview" class="bulk-preview-container animate-fade-in">
        <div class="preview-stats-bar">
          <h4>{{ t('Spreadsheet Live Parsing Preview') }}</h4>
          <div class="stats-items">
            <span class="stat-pill stat-pill--total">Total: {{ validationSummary.total }}</span>
            <span class="stat-pill stat-pill--valid">Valid: {{ validationSummary.valid }}</span>
            <span class="stat-pill stat-pill--invalid">Warnings: {{ validationSummary.invalid }}</span>
          </div>
        </div>

        <DataTable
          :columns="previewColumns"
          :rows="parsedStudents"
          row-key="student_id"
          :row-class-name="rowClassName"
          :empty-text="t('No rows parsed. Try downloading the sample template and adding data.')"
        >
          <template #status="{ row }">
            <span 
              v-if="getValidationErrors(row).length > 0" 
              class="validation-badge validation-badge--invalid"
              :title="getValidationErrors(row).join(', ')"
            >
              ❌ {{ getValidationErrors(row)[0] }}
            </span>
            <span v-else class="validation-badge validation-badge--valid">
              ✅ {{ t('Ready') }}
            </span>
          </template>
        </DataTable>
      </div>
    </div>
  </section>
</template>
