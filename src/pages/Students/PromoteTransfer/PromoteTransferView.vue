<!-- Students > Promote / Transfer Page -->
<script setup lang="ts">
// Promote / Transfer: manages mass end-of-year promotions to the next academic grade level,
// supports individual selective retention, resecuencing roll numbers, and handles auditable
// inter-branch transfer certificate generation with full historical logging.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, saveStudent, type Student } from '@/composables/Students/useStudents'
import { fetchBranches, type Branch } from '@/composables/Institute_Setup/useBranches'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'PromoteTransferView' })

const { t } = useTranslator()
const toast = useToast()

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const branches = ref<Branch[]>([])
const students = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])
const promotionHistory = ref<PromotionHistoryRecord[]>([])

// Selection state
const activeYearId = ref<number | null>(null)
const activeClass = ref('Class 6')

// Target Promotion State
const promotionYearId = ref<number | null>(null)
const promotionClass = ref('Class 7')

// Auto-field: Roll Assignment Method
const rollMethod = ref('keep')
const rollMethodOptions = [
  { Id: 'keep', DisplayText: 'Keep Existing Roll Number' },
  { Id: 'resequence', DisplayText: 'Re-sequence sequentially from 1 (Sorted by Roll)' },
]

// NCTB Class 9-10 Group Stream options (Bangladesh board standard)
const showGroupStreamSelector = computed(() => {
  return ['Class 9', 'Class 10'].includes(promotionClass.value)
})
const targetGroup = ref('General')
const groupOptions = [
  { Id: 'Science', DisplayText: 'Science — বিজ্ঞান বিভাগ' },
  { Id: 'Humanities', DisplayText: 'Humanities — মানবিক বিভাগ' },
  { Id: 'Business Studies', DisplayText: 'Business Studies — ব্যবসায় শিক্ষা বিভাগ' },
  { Id: 'General', DisplayText: 'General / Common Stream — সাধারণ শাখা' },
]

// Row-level action overriding mappings (Promote, Retain)
// Stores a record of studentId -> 'Promote' | 'Retain'
const rowActions = ref<Record<number, 'Promote' | 'Retain'>>({})
// Row-level section overriding mapping (studentId -> section_name)
const rowSections = ref<Record<number, string>>({})
// Row-level roll overriding mapping (studentId -> roll_no)
const rowRolls = ref<Record<number, number>>({})

// Confirm Modal for transfers
const showTransferModal = ref(false)
const transferTarget = ref<Student | null>(null)
const selectedBranch = ref<string>('')
const tcNumber = ref('')
const transferReason = ref('Family Relocation')
const transferRemarks = ref('')

// Transfer clearance checklist (MoE & global safety net standards)
const clearFees = ref(false)
const clearLibrary = ref(false)
const clearHostel = ref(false)
const clearAcademic = ref(false)

const isCleared = computed(() => {
  return clearFees.value && clearLibrary.value && clearHostel.value && clearAcademic.value
})

const reasonOptions = [
  { Id: 'Family Relocation', DisplayText: 'Family Relocation — পরিবার স্থানান্তর' },
  { Id: 'Personal Reasons', DisplayText: 'Personal Reasons — ব্যক্তিগত কারণ' },
  { Id: 'Academic Suitability', DisplayText: 'Academic Suitability — প্রাতিষ্ঠানিক সুবিধা' },
  { Id: 'Disciplinary Recommendation', DisplayText: 'Disciplinary Recommendation — শৃঙ্খলা সুপারিশ' },
]

export interface PromotionHistoryRecord {
  id?: number
  student_id: string
  candidate_name: string
  source_class: string
  target_class: string
  source_year: string
  target_year: string
  promotion_type: string
  roll_no: number
  destination_branch?: string
  tc_no?: string
  remarks?: string
  created_at?: string
}

const statusOptions = [
  { Id: 'Promote', DisplayText: 'Promote — উত্তীর্ণ করুন' },
  { Id: 'Retain', DisplayText: 'Retain — একই শ্রেণিতে রাখুন' },
]

// ── Table Columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'select', label: t('Promotion Action'), align: 'center' },
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'class_name', label: t('Current Class'), sortable: true },
  { key: 'target_section', label: t('Target Section'), align: 'center' },
  { key: 'target_roll', label: t('Target Roll'), align: 'center' },
  { key: 'is_active', label: t('Current Status'), sortable: true, align: 'center', render: (r) => ((r as Student).is_active ? t('Active') : t('Transferred')) },
])

const historyColumns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('Date & Time'), sortable: true },
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true },
  { key: 'promotion_type', label: t('Action Type'), align: 'center', sortable: true },
  { key: 'source_class', label: t('Source Grade'), align: 'center' },
  { key: 'target_class', label: t('Target Grade'), align: 'center' },
  { key: 'roll_no', label: t('Roll No'), align: 'center' },
  { key: 'tc_no', label: t('TC Number'), align: 'center' },
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

const branchOptions = computed(() =>
  branches.value.map((b) => ({
    Id: b.branch_name,
    LookupText: b.branch_name_bn ? `${b.branch_name} (${b.branch_name_bn})` : b.branch_name,
    DisplayText: b.branch_name_bn ? `${b.branch_name} (${b.branch_name_bn})` : b.branch_name,
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

function filterRoster() {
  if (!activeYearId.value) {
    filteredStudents.value = []
    return
  }
  filteredStudents.value = students.value.filter(
    (s) => Number(s.academic_year_id) === Number(activeYearId.value) && s.class_name === activeClass.value && s.is_active,
  )
}

// Watchers
watch([activeYearId, activeClass, students], () => {
  filterRoster()
})

// Auto-fill row-level overrides whenever roster changes
watch(filteredStudents, (newList) => {
  const newActions: Record<number, 'Promote' | 'Retain'> = {}
  const newSections: Record<number, string> = {}
  const newRolls: Record<number, number> = {}

  for (const s of newList) {
    if (s.id) {
      newActions[s.id] = rowActions.value[s.id] || 'Promote'
      newSections[s.id] = rowSections.value[s.id] || s.section_name || 'A'
      newRolls[s.id] = rowRolls.value[s.id] || s.roll_no || 1
    }
  }

  rowActions.value = newActions
  rowSections.value = newSections
  rowRolls.value = newRolls
}, { immediate: true })

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/students/promotion-history`)
    if (res.ok) {
      const data = await res.json()
      promotionHistory.value = data.history || []
    }
  } catch (e) {
    console.error('Failed to load promotion history:', e)
  }
}

async function logPromotion(data: PromotionHistoryRecord) {
  try {
    await fetch(`${API_BASE}/api/students/promotion-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (e) {
    console.error('Failed to save log entry:', e)
  }
}

async function loadAll() {
  const [sData, y, b] = await Promise.all([fetchStudents(), fetchAcademicYears(), fetchBranches()])
  students.value = sData
  years.value = y
  branches.value = b
  if (y.length > 0) {
    activeYearId.value = Number(y[0].id)
    promotionYearId.value = Number(y[0].id)
  }
  await loadHistory()
  filterRoster()
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

// ── Actions ────────────────────────────────────────────────────────────

async function promoteAll() {
  if (!promotionYearId.value || !promotionClass.value) {
    toast.error(t('Please select target promotion year and class.'))
    return
  }

  const pCount = Object.values(rowActions.value).filter(a => a === 'Promote').length
  const rCount = Object.values(rowActions.value).filter(a => a === 'Retain').length

  const ok = window.confirm(
    t('Execute Sessional Upgrades: Promote {pCount} & Retain {rCount} repeaters from "{current}" to "{target}"?', {
      pCount,
      rCount,
      current: activeClass.value,
      target: promotionClass.value,
    }),
  )
  if (!ok) return
  
  const sourceYearObj = years.value.find(y => Number(y.id) === Number(activeYearId.value))
  const targetYearObj = years.value.find(y => Number(y.id) === Number(promotionYearId.value))
  const sourceYearStr = sourceYearObj ? sourceYearObj.year_name : '2026'
  const targetYearStr = targetYearObj ? targetYearObj.year_name : '2026'

  let successCount = 0
  let reseqRoll = 1

  for (const s of filteredStudents.value) {
    const action = rowActions.value[s.id!] || 'Promote'
    
    if (action === 'Promote') {
      const finalRoll = rollMethod.value === 'resequence' ? reseqRoll++ : (rowRolls.value[s.id!] || s.roll_no || 1)
      const finalSection = rowSections.value[s.id!] || s.section_name || 'A'
      
      // If target class is Class 9/10, we append the selected Group Stream to Class name
      const finalClass = showGroupStreamSelector.value 
        ? `${promotionClass.value} - ${targetGroup.value}` 
        : promotionClass.value

      const updated = { 
        ...s, 
        class_name: finalClass, 
        academic_year_id: promotionYearId.value,
        section_name: finalSection,
        roll_no: finalRoll,
      }
      
      const saved = await saveStudent(updated)
      if (saved) {
        successCount++
        await logPromotion({
          student_id: s.student_id,
          candidate_name: s.candidate_name,
          source_class: activeClass.value,
          target_class: finalClass,
          source_year: sourceYearStr,
          target_year: targetYearStr,
          promotion_type: 'Promote',
          roll_no: finalRoll,
          destination_branch: '',
          tc_no: '',
          remarks: t('Promoted to Section {sec} with Roll {roll}', { sec: finalSection, roll: finalRoll }),
        })
      }
    } else {
      // Log retention
      await logPromotion({
        student_id: s.student_id,
        candidate_name: s.candidate_name,
        source_class: activeClass.value,
        target_class: activeClass.value,
        source_year: sourceYearStr,
        target_year: targetYearStr,
        promotion_type: 'Retain',
        roll_no: s.roll_no || 0,
        destination_branch: '',
        tc_no: '',
        remarks: t('Retained / Repeater in current class'),
      })
    }
  }
  
  if (successCount > 0 || rCount > 0) {
    toast.success(t('Successfully executed sessional roster promotions!'))
    await loadAll()
  } else {
    toast.error(t('Promotion failed — is server.py running?'))
  }
}

function openTransfer(student: Student) {
  transferTarget.value = student
  selectedBranch.value = ''
  
  const yearObj = years.value.find(y => Number(y.id) === Number(activeYearId.value))
  const yearStr = yearObj ? yearObj.year_name : '2026'
  tcNumber.value = `TC-${yearStr}-${String(student.id || 1).padStart(4, '0')}`
  
  transferReason.value = 'Family Relocation'
  transferRemarks.value = ''

  // Reset clearance checklist
  clearFees.value = false
  clearLibrary.value = false
  clearHostel.value = false
  clearAcademic.value = false

  showTransferModal.value = true
}

async function executeTransfer() {
  if (!transferTarget.value || !selectedBranch.value) return
  if (!isCleared.value) {
    toast.error(t('All departments must be cleared before issuing a Transfer Certificate!'))
    return
  }

  const ok = window.confirm(t('Are you sure you want to transfer student "{name}" to campus "{branch}"? This will log a Transfer Certificate (TC) state.', { name: transferTarget.value.candidate_name, branch: selectedBranch.value }))
  if (!ok) return
  
  const yearObj = years.value.find(y => Number(y.id) === Number(activeYearId.value))
  const yearStr = yearObj ? yearObj.year_name : '2026'

  // Update status and save
  const updated = { ...transferTarget.value, section_name: 'TC Out', is_active: false }
  const saved = await saveStudent(updated)
  if (saved) {
    await logPromotion({
      student_id: transferTarget.value.student_id,
      candidate_name: transferTarget.value.candidate_name,
      source_class: transferTarget.value.class_name,
      target_class: 'TC Out',
      source_year: yearStr,
      target_year: yearStr,
      promotion_type: 'Transfer Out',
      roll_no: transferTarget.value.roll_no || 0,
      destination_branch: selectedBranch.value,
      tc_no: tcNumber.value,
      remarks: `Reason: ${transferReason.value}. Remarks: ${transferRemarks.value}`,
    })

    toast.success(t('Student transferred out successfully! Generated TC.'))
    showTransferModal.value = false
    transferTarget.value = null
    await loadAll()
  } else {
    toast.error(t('Transfer failed — is server.py running?'))
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
        <h1>{{ t('Promote & Transfer') }}</h1>
        <p>{{ t('Perform selective sessional promotions, resequence sessional roll coordinates, and manage fully auditable Transfer Certificate (TC) clearances.') }}</p>
      </div>
    </header>

    <!-- Column 1: Selection Scope & Mass Promotion Controls -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-right-left" />
        {{ t('Sessional Mass Promotion Planning') }}
      </h4>
      <div class="promote-grid">
        <!-- Source -->
        <div class="form-field">
          <label>{{ t('Source Class Level') }} *</label>
          <BaseCombobox
            v-model="activeClass"
            :options="classOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select class')"
          />
        </div>
        <div class="form-field">
          <label>{{ t('Source Academic Year') }} *</label>
          <BaseCombobox
            v-model="activeYearId"
            :options="yearOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select year')"
          />
        </div>

        <!-- Target -->
        <div class="form-field">
          <label>{{ t('Target Promotion Class') }} *</label>
          <BaseCombobox
            v-model="promotionClass"
            :options="classOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select class')"
          />
        </div>
        <div class="form-field">
          <label>{{ t('Target Promotion Year') }} *</label>
          <BaseCombobox
            v-model="promotionYearId"
            :options="yearOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select year')"
          />
        </div>

        <!-- NCTB Class 9-10 Group Stream options (Bangladesh board standard) -->
        <div v-if="showGroupStreamSelector" class="form-field animate-fade-in" style="grid-column: 1 / -1;">
          <label>{{ t('Target Academic Group / Stream (NCTB Class 9-10 Standard)') }} *</label>
          <BaseCombobox
            v-model="targetGroup"
            :options="groupOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select group stream')"
          />
          <small class="form-hint">{{ t('NCTB guidelines mandate dividing Class 9-10 intakes into Science, Commerce or Humanities streams.') }}</small>
        </div>

        <!-- Auto-field Option: Roll Resequencing -->
        <div class="form-field" style="grid-column: 1 / -1;">
          <label>{{ t('New Roll Assignment Method') }}</label>
          <BaseCombobox
            v-model="rollMethod"
            :options="rollMethodOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select method')"
          />
        </div>

        <div class="form-field flex align-end" style="grid-column: 1 / -1; margin-top: 1rem;">
          <button
            type="button"
            class="btn btn--primary w-full"
            :disabled="!filteredStudents.length"
            @click="promoteAll"
          >
            <i class="fa-duotone fa-angles-up" /> {{ t('Execute Selective Promotion') }} ({{ filteredStudents.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- Data table listing candidates -->
    <DataTable
      :columns="tableColumns"
      :rows="filteredStudents"
      row-key="id"
      default-sort-key="student_id"
      :empty-text="t('No active students found in the selected register scope.')"
    >
      <template #select="{ row }">
        <BaseCombobox
          v-model="rowActions[(row as Student).id!]"
          :options="statusOptions"
          option-value="Id"
          option-label="DisplayText"
          :clearable="false"
          style="max-width: 180px;"
        />
      </template>

      <!-- Target Section override column -->
      <template #target_section="{ row }">
        <input 
          v-if="rowActions[(row as Student).id!] === 'Promote'"
          v-model="rowSections[(row as Student).id!]" 
          type="text" 
          class="verify-input text-center" 
          style="max-width: 60px; padding: 4px; text-transform: uppercase;"
        />
        <span v-else>—</span>
      </template>

      <!-- Target Roll override column -->
      <template #target_roll="{ row }">
        <input 
          v-if="rowActions[(row as Student).id!] === 'Promote'"
          v-model.number="rowRolls[(row as Student).id!]" 
          type="number" 
          min="1"
          class="verify-input text-center" 
          style="max-width: 60px; padding: 4px;"
        />
        <span v-else>—</span>
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openTransfer(row as Student)">
          <i class="fa-duotone fa-right-from-bracket" /> {{ t('Transfer Out') }}
        </button>
      </template>
    </DataTable>

    <!-- Section 2: Promotion & Transfer Audit Log -->
    <div v-if="promotionHistory.length > 0" class="ipf-section mt-8 animate-fade-in">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-clock-rotate-left" />
        {{ t('Promotion & Transfer Audit History Trail') }}
      </h4>
      <DataTable
        :columns="historyColumns"
        :rows="promotionHistory"
        row-key="id"
        :empty-text="t('No audit records found.')"
      >
        <template #created_at="{ row }">
          <span style="font-family: monospace; font-size: 0.8rem;">{{ formatDate((row as PromotionHistoryRecord).created_at || '') }}</span>
        </template>
        <template #promotion_type="{ row }">
          <span 
            class="status-badge"
            :class="{
              'status-badge--success': (row as PromotionHistoryRecord).promotion_type === 'Promote',
              'status-badge--warning': (row as PromotionHistoryRecord).promotion_type === 'Retain',
              'status-badge--danger': (row as PromotionHistoryRecord).promotion_type === 'Transfer Out'
            }"
          >
            {{ (row as PromotionHistoryRecord).promotion_type === 'Promote' ? t('Promoted') : ((row as PromotionHistoryRecord).promotion_type === 'Retain' ? t('Retained') : t('TC Out')) }}
          </span>
        </template>
      </DataTable>
    </div>

    <!-- Transfer Confirmation Modal -->
    <BaseModal
      v-if="showTransferModal"
      :title="t('Inter-Campus Transfer Certificate Clearance')"
      @close="showTransferModal = false"
    >
      <div class="ipfp">
        <div class="ipfp-body">
          <div class="ipfp-section">
            <h4 class="ipfp-section__title">
              <i class="fa-duotone fa-angles-right" />
              {{ t('Transfer Certificate Details') }}
            </h4>
            <div class="promote-grid">
              <div class="form-field">
                <label>{{ t('Student Name') }}</label>
                <input :value="transferTarget ? transferTarget.candidate_name : ''" type="text" disabled class="is-disabled" />
              </div>
              <div class="form-field">
                <label>{{ t('Target Destination Branch') }} *</label>
                <BaseCombobox
                  v-model="selectedBranch"
                  :options="branchOptions"
                  option-value="Id"
                  option-label="DisplayText"
                  :placeholder="t('Select target campus')"
                />
              </div>
              <div class="form-field">
                <label>{{ t('TC Certificate Number') }}</label>
                <input v-model="tcNumber" type="text" class="font-uppercase" style="font-family: monospace; letter-spacing: 0.05em;" />
              </div>
              <div class="form-field">
                <label>{{ t('Reason for Transfer') }}</label>
                <BaseCombobox
                  v-model="transferReason"
                  :options="reasonOptions"
                  option-value="Id"
                  option-label="DisplayText"
                  :placeholder="t('Select reason')"
                />
              </div>
              <div class="form-field" style="grid-column: 1 / -1;">
                <label>{{ t('Remarks') }}</label>
                <textarea v-model="transferRemarks" rows="2" :placeholder="t('e.g. Cleared all sessional fee accounts and library dues.')"></textarea>
              </div>
            </div>
          </div>

          <!-- Section 2: Clearance Checklist Section (MoE Bangladesh standard) -->
          <div class="ipfp-section animate-fade-in">
            <h4 class="ipfp-section__title">
              <i class="fa-duotone fa-clipboard-check" />
              {{ t('Clearance & No Dues Checklist') }}
            </h4>
            <p class="form-hint" style="margin-bottom: 1rem;">{{ t('All departments must be verified and checked off to issue a Transfer Certificate.') }}</p>
            <div class="promote-grid" style="gap: 0.75rem;">
              <div class="form-field__check">
                <input id="clearFeesCheck" v-model="clearFees" type="checkbox" />
                <label for="clearFeesCheck" class="form-field__check-label" style="font-weight: 600; cursor: pointer;">
                  {{ t('Accounts Department Clearance (No tuition or session dues)') }}
                </label>
              </div>
              <div class="form-field__check">
                <input id="clearLibraryCheck" v-model="clearLibrary" type="checkbox" />
                <label for="clearLibraryCheck" class="form-field__check-label" style="font-weight: 600; cursor: pointer;">
                  {{ t('Library Desk Clearance (All borrowed books returned)') }}
                </label>
              </div>
              <div class="form-field__check">
                <input id="clearHostelCheck" v-model="clearHostel" type="checkbox" />
                <label for="clearHostelCheck" class="form-field__check-label" style="font-weight: 600; cursor: pointer;">
                  {{ t('Hostel Warden Clearance (Dues & key clearance, if applicable)') }}
                </label>
              </div>
              <div class="form-field__check">
                <input id="clearAcademicCheck" v-model="clearAcademic" type="checkbox" />
                <label for="clearAcademicCheck" class="form-field__check-label" style="font-weight: 600; cursor: pointer;">
                  {{ t('Class Teacher No-Objection (Academic & attendance clearance)') }}
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="ipfp-form-actions">
          <button type="button" class="btn" @click="showTransferModal = false">
            {{ t('Cancel') }}
          </button>
          <button 
            type="button" 
            class="btn btn--danger" 
            :disabled="!selectedBranch || !isCleared" 
            @click="executeTransfer"
          >
            <i class="fa-duotone fa-right-from-bracket" /> {{ t('Clear & Transfer Out') }}
          </button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
