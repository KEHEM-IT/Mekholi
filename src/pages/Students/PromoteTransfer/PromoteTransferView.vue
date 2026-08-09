<!-- Students > Promote / Transfer Page -->
<script setup lang="ts">
// Promote / Transfer: manages mass end-of-year promotions to the next academic grade level,
// and handles individual inter-branch or external campus transfer certificates.
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

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const branches = ref<Branch[]>([])
const students = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])

// Selection state
const activeYearId = ref<number | null>(null)
const activeClass = ref('Class 6')

// Target Promotion State
const promotionYearId = ref<number | null>(null)
const promotionClass = ref('Class 7')

// Confirm Modal for transfers
const showTransferModal = ref(false)
const transferTarget = ref<Student | null>(null)
const selectedBranch = ref<string>('')

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'student_id', label: t('Student ID'), sortable: true },
  { key: 'candidate_name', label: t('Student Name'), sortable: true, render: (r) => renderStudentName(r as Student) },
  { key: 'class_name', label: t('Current Class'), sortable: true },
  { key: 'roll_no', label: t('Current Roll No'), sortable: true, align: 'center', render: (r) => String((r as Student).roll_no ?? '—') },
  { key: 'is_active', label: t('Current Status'), sortable: true, align: 'center', render: (r) => ((r as Student).is_active ? t('Active') : t('Transferred')) },
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
  const [sData, y, b] = await Promise.all([fetchStudents(), fetchAcademicYears(), fetchBranches()])
  students.value = sData
  years.value = y
  branches.value = b
  if (y.length > 0) {
    activeYearId.value = Number(y[0].id)
    promotionYearId.value = Number(y[0].id)
  }
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
  const ok = window.confirm(t('Are you sure you want to mass promote {count} students from "{current}" to "{target}"?', { count: filteredStudents.value.length, current: activeClass.value, target: promotionClass.value }))
  if (!ok) return
  
  let successCount = 0
  for (const s of filteredStudents.value) {
    // Upgrades their class name and sessional academic year
    const updated = { ...s, class_name: promotionClass.value, academic_year_id: promotionYearId.value }
    const saved = await saveStudent(updated)
    if (saved) successCount++
  }
  
  if (successCount > 0) {
    toast.success(t('Successfully promoted {count} students!', { count: successCount }))
    await loadAll()
  } else {
    toast.error(t('Promotion failed — is server.py running?'))
  }
}

function openTransfer(student: Student) {
  transferTarget.value = student
  selectedBranch.value = ''
  showTransferModal.value = true
}

async function executeTransfer() {
  if (!transferTarget.value || !selectedBranch.value) return
  const ok = window.confirm(t('Are you sure you want to transfer student "{name}" to campus "{branch}"? This will log a Transfer Certificate (TC) state.', { name: transferTarget.value.candidate_name, branch: selectedBranch.value }))
  if (!ok) return
  
  // Update status and save
  const updated = { ...transferTarget.value, section_name: 'TC Out', is_active: false }
  const saved = await saveStudent(updated)
  if (saved) {
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
        <p>{{ t('Perform mass year-end student promotion upgrades, map target class levels, and handle inter-campus transfer clearances.') }}</p>
      </div>
    </header>

    <!-- Column 1: Selection Scope & Mass Promotion Controls -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-right-left" />
        {{ t('Sessional Mass Promotion Planning') }}
      </h4>
      <div class="ipf-grid ipf-grid--three">
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

        <div class="form-field" /> <!-- Spacer -->

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

        <div class="form-field flex align-end">
          <button
            type="button"
            class="btn btn--primary w-full"
            :disabled="!filteredStudents.length"
            @click="promoteAll"
          >
            <i class="fa-duotone fa-angles-up" /> {{ t('Execute Mass Promotion') }} ({{ filteredStudents.length }})
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
      :empty-text="t('No students found in the selected register. Modify your class filters to locate candidates.')"
    >
      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openTransfer(row as Student)">
          <i class="fa-duotone fa-right-from-bracket" /> {{ t('Transfer Out') }}
        </button>
      </template>
    </DataTable>

    <!-- Transfer Confirmation Modal -->
    <BaseModal
      v-if="showTransferModal"
      :title="t('Inter-Campus Transfer clearance')"
      @close="showTransferModal = false"
    >
      <div class="ipfp">
        <div class="ipfp-body">
          <div class="ipfp-section">
            <h4 class="ipfp-section__title">
              <i class="fa-duotone fa-angles-right" />
              {{ t('Transfer Out Student') }}
            </h4>
            <div class="ipf-grid">
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
            </div>
          </div>
        </div>
        <div class="ipfp-form-actions">
          <button type="button" class="btn" @click="showTransferModal = false">
            {{ t('Cancel') }}
          </button>
          <button type="button" class="btn btn--danger" :disabled="!selectedBranch" @click="executeTransfer">
            <i class="fa-duotone fa-right-from-bracket" /> {{ t('Clear & Transfer Out') }}
          </button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
