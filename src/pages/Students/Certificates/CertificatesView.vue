<!-- Students > Transfer Certificates & Character Testimonials Page -->
<script setup lang="ts">
// Certificates & Testimonials: displays student registries, lets admins configure
// and print official Character Certificates, TCs, and Academic Testimonials,
// and archives all issued documents inside the database audit logs.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, type Student } from '@/composables/Students/useStudents'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'CertificatesView' })

const { t } = useTranslator()
const toast = useToast()

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const students = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])
const issuedLogs = ref<CertificateRecord[]>([])

// Selection state
const activeYearId = ref<number | null>(null)
const activeClass = ref('Class 6')

// Preview modal states
const showForm = ref(false)
const previewTarget = ref<Student | null>(null)

// Certificate Form Configurations
const certType = ref('Character')
const certNo = ref('')
const principalName = ref('Dr. Sofir Uddin')
const gpaGrade = ref('GPA 5.00')
const conduct = ref('Excellent')
const issueDate = ref(new Date().toISOString().substring(0, 10))
const remarks = ref('')

const certTypeOptions = [
  { Id: 'Character', DisplayText: 'Character Certificate — চারিত্রিক প্রশংসাপত্র' },
  { Id: 'TC', DisplayText: 'Transfer Certificate (TC) — ছাড়পত্র' },
  { Id: 'Testimonial', DisplayText: 'Academic Testimonial — শিক্ষাগত প্রশংসাপত্র' },
]

const conductOptions = [
  { Id: 'Excellent', DisplayText: 'Excellent — অত্যন্ত সন্তোষজনক' },
  { Id: 'Very Good', DisplayText: 'Very Good — খুব ভালো' },
  { Id: 'Good', DisplayText: 'Good — ভালো' },
]

export interface CertificateRecord {
  id?: number
  student_id: string
  candidate_name: string
  certificate_type: string
  certificate_no: string
  issue_date: string
  recipient_details: string // JSON string containing { principalName, gpaGrade, conduct }
  remarks: string
  created_at?: string
}

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'roll_no', label: t('Roll No'), sortable: true, align: 'center', render: (r) => String((r as Student).roll_no ?? '—') },
])

const historyColumns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('Date & Time Issued'), sortable: true },
  { key: 'certificate_no', label: t('Certificate No'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true },
  { key: 'certificate_type', label: t('Certificate Type'), align: 'center', sortable: true },
  { key: 'issue_date', label: t('Issue Date'), align: 'center' },
  { key: 'remarks', label: t('Remarks') },
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return dateStr.replace('T', ' ').substring(0, 19)
}

function getCertTypeLabel(type: string): string {
  if (type === 'Character') return t('Character Certificate')
  if (type === 'TC') return t('Transfer Certificate (TC)')
  return t('Academic Testimonial')
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

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/students/certificates`)
    if (res.ok) {
      const data = await res.json()
      issuedLogs.value = data.certificates || []
    }
  } catch (e) {
    console.error('Failed to load certificates log:', e)
  }
}

async function loadAll() {
  const [sData, y] = await Promise.all([fetchStudents(), fetchAcademicYears()])
  students.value = sData
  years.value = y
  if (y.length > 0) {
    activeYearId.value = Number(y[0].id)
  }
  await loadHistory()
  filterRoster()
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openPreview(item: Student) {
  previewTarget.value = item
  
  // Auto-generate unique Certificate number: e.g. CERT-2026-0045
  const yearObj = years.value.find(y => Number(y.id) === Number(activeYearId.value))
  const yearStr = yearObj ? yearObj.year_name : '2026'
  certNo.value = `CERT-${yearStr}-${String(item.id || 1).padStart(4, '0')}`
  
  certType.value = 'Character'
  principalName.value = 'Dr. Sofir Uddin'
  gpaGrade.value = 'GPA 5.00'
  conduct.value = 'Excellent'
  remarks.value = ''
  
  showForm.value = true
}

async function printCertificate() {
  if (!previewTarget.value || !certNo.value) return

  const details = {
    principalName: principalName.value,
    gpaGrade: gpaGrade.value,
    conduct: conduct.value,
  }

  // Save issued certificate log
  const logData: CertificateRecord = {
    student_id: previewTarget.value.student_id,
    candidate_name: previewTarget.value.candidate_name,
    certificate_type: certType.value,
    certificate_no: certNo.value,
    issue_date: issueDate.value,
    recipient_details: JSON.stringify(details),
    remarks: remarks.value || `Generated ${certType.value} Certificate`,
  }

  try {
    const res = await fetch(`${API_BASE}/api/students/certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    })

    if (res.ok) {
      toast.success(t('Successfully archived and generated certificate!'))
      showForm.value = false
      await loadAll()
      
      // Trigger print window
      setTimeout(() => {
        window.print()
      }, 500)
    } else {
      toast.error(t('Archiving failed — is server.py running?'))
    }
  } catch (e) {
    console.error('Failed to issue certificate:', e)
    toast.error(t('Connection failed.'))
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

    <!-- Auditable Certificates Issued History Log Table -->
    <div v-if="issuedLogs.length > 0" class="ipf-section mt-8 animate-fade-in">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-folder-open" />
        {{ t('Archived & Issued Certificates Log') }}
      </h4>
      <DataTable
        :columns="historyColumns"
        :rows="issuedLogs"
        row-key="id"
        :empty-text="t('No certificates issued yet.')"
      >
        <template #created_at="{ row }">
          <span style="font-family: monospace; font-size: 0.8rem;">{{ formatDate((row as any).created_at || '') }}</span>
        </template>
        <template #certificate_type="{ row }">
          <span class="status-badge status-badge--success" style="background: rgba(99, 102, 241, 0.16) !important; color: rgb(99, 102, 241) !important; border-color: rgba(99, 102, 241, 0.3) !important;">
            {{ getCertTypeLabel((row as any).certificate_type) }}
          </span>
        </template>
      </DataTable>
    </div>

    <!-- Character Certificate Modal -->
    <BaseModal
      v-if="showForm"
      :title="t('Configure & Issue Certificate')"
      wide
      @close="showForm = false"
    >
      <div class="ipfp">
        <div class="ipfp-body">
          <!-- Setup Controller section inside Modal -->
          <div class="ipfp-section">
            <h4 class="ipfp-section__title">
              <i class="fa-duotone fa-sliders" />
              {{ t('Certificate Metadata Configurations') }}
            </h4>
            <div class="promote-grid">
              <div class="form-field">
                <label>{{ t('Certificate Type') }} *</label>
                <BaseCombobox
                  v-model="certType"
                  :options="certTypeOptions"
                  option-value="Id"
                  option-label="DisplayText"
                  :clearable="false"
                />
              </div>
              <div class="form-field">
                <label>{{ t('Certificate Serial Number') }}</label>
                <input v-model="certNo" type="text" style="font-family: monospace; font-weight: bold;" />
              </div>
              <div class="form-field">
                <label>{{ t('Principal / Headmaster Name') }}</label>
                <input v-model="principalName" type="text" />
              </div>
              <div class="form-field">
                <label>{{ t('Date of Issue') }}</label>
                <input v-model="issueDate" type="date" />
              </div>

              <!-- Conditional Fields -->
              <div v-if="certType === 'Testimonial'" class="form-field animate-fade-in">
                <label>{{ t('Last Exam GPA / Grade Obtained') }} *</label>
                <input v-model="gpaGrade" type="text" />
              </div>
              <div v-if="certType === 'Character'" class="form-field animate-fade-in">
                <label>{{ t('Conduct & General Behavior') }}</label>
                <BaseCombobox
                  v-model="conduct"
                  :options="conductOptions"
                  option-value="Id"
                  option-label="DisplayText"
                  :clearable="false"
                />
              </div>
            </div>
          </div>

          <!-- High-Contrast Parchment Certificate Mockup Frame -->
          <div class="ipfp-section">
            <h4 class="ipfp-section__title">
              <i class="fa-duotone fa-eye" />
              {{ t('Bilingual Certificate Frame Preview') }}
            </h4>
            
            <!-- Styled like a high-end traditional academic diploma -->
            <div class="std-cert-preview theme-certificate-parchment" style="background: #fffdf5; border: 3px double #d4af37; color: #332200; box-shadow: 0 10px 30px rgba(0,0,0,0.15); padding: $space-8; text-align: center; border-radius: 8px;">
              <div class="cert-decor-border" style="border: 1px solid #d4af37; padding: 1.5rem; height: 100%;">
                
                <header class="cert-header" style="margin-bottom: 2rem;">
                  <h3 style="font-size: 1.5rem; font-family: serif; color: #8c6b12; margin-bottom: 2px;">SOFIR UDDIN SCHOOL & COLLEGE</h3>
                  <p style="font-size: 0.72rem; color: #735914; text-transform: uppercase; letter-spacing: 0.12em;">Principal Office · Sylhet Division, Bangladesh</p>
                  <div class="divider-line" style="width: 80px; height: 1.5px; background: #d4af37; margin: $space-3 auto;"></div>
                </header>

                <!-- 1. Character Certificate Content -->
                <div v-if="certType === 'Character'" class="cert-content font-serif animate-fade-in" style="font-family: 'Georgia', serif; font-size: 0.95rem; line-height: 1.8; text-align: justify; text-indent: 1.5rem; margin-bottom: 3rem;">
                  This is to certify that <strong>{{ previewTarget?.candidate_name }}</strong>, 
                  son/daughter of <strong>{{ previewTarget?.guardian_name }}</strong>, was a student of this institution in 
                  class <strong>{{ previewTarget?.class_name }}</strong> under Roll No <strong>{{ previewTarget?.roll_no }}</strong>. 
                  During the sessional calendar, he/she bears an exemplary <strong>{{ conduct }}</strong> moral character and 
                  took active interest in co-curricular physical activities. I wish him/her every success and prosperity in life.
                </div>

                <!-- 2. Transfer Certificate (TC) Content -->
                <div v-if="certType === 'TC'" class="cert-content font-serif animate-fade-in" style="font-family: 'Georgia', serif; font-size: 0.95rem; line-height: 1.8; text-align: justify; text-indent: 1.5rem; margin-bottom: 3rem;">
                  This is to certify that <strong>{{ previewTarget?.candidate_name }}</strong>, 
                  son/daughter of <strong>{{ previewTarget?.guardian_name }}</strong>, was a student of this institution under Student ID 
                  <strong>{{ previewTarget?.student_id }}</strong>. He/she is hereby granted this Transfer Certificate (TC) from 
                  class <strong>{{ previewTarget?.class_name }}</strong>. All sessional accounts, library books, and sports dues 
                  have been fully cleared and verified. We wish him/her the absolute best in their next sessional grade level.
                </div>

                <!-- 3. Academic Testimonial Content -->
                <div v-if="certType === 'Testimonial'" class="cert-content font-serif animate-fade-in" style="font-family: 'Georgia', serif; font-size: 0.95rem; line-height: 1.8; text-align: justify; text-indent: 1.5rem; margin-bottom: 3rem;">
                  This is to certify that <strong>{{ previewTarget?.candidate_name }}</strong>, 
                  son/daughter of <strong>{{ previewTarget?.guardian_name }}</strong>, successfully completed and obtained 
                  class <strong>{{ previewTarget?.class_name }}</strong> certification under this board, securing a final 
                  academic evaluation of <strong>{{ gpaGrade }}</strong>. He/she is highly diligent, holds deep interest in academic research, 
                  and is recommended for higher sessional intake grades.
                </div>

                <div class="std-cert-footer" style="display: flex; justify-content: space-between; margin-top: 3rem; padding: 0 1rem;">
                  <div class="sig-line" style="border-top: 1.5px solid #d4af37; color: #594411; font-weight: 500; font-family: monospace; font-size: 0.72rem; padding-top: 4px; width: 140px; text-align: center;">
                    {{ t('Date:') }} {{ issueDate }}
                  </div>
                  <div class="sig-line" style="border-top: 1.5px solid #d4af37; color: #594411; font-weight: 500; font-family: monospace; font-size: 0.72rem; padding-top: 4px; width: 140px; text-align: center;">
                    {{ principalName }}<br />
                    <span style="font-size: 0.6rem; color: #735914;">{{ t('Principal Signature') }}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
        <div class="ipfp-form-actions">
          <button type="button" class="btn" @click="showForm = false">
            {{ t('Close') }}
          </button>
          <button type="button" class="btn btn--primary" @click="printCertificate">
            <i class="fa-duotone fa-print" /> {{ t('Issue & Print Certificate') }}
          </button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
