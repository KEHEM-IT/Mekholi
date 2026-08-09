<!-- Admission > Document Verification View -->
<script setup lang="ts">
// Document Verification: reviews digital and physical document checklist states,
// manages verification stages, and updates audit records. Fully integrated with
// SQL, custom responsive layouts, and local modals.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchApplications, saveApplication, type AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'
import VerificationModal from './VerificationModal.vue'

defineOptions({ name: 'DocumentVerificationView' })

const { t } = useTranslator()
const toast = useToast()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const allApplications = ref<AdmissionApplication[]>([])
const filteredApplications = ref<AdmissionApplication[]>([])

// Selection state
const activeClass = ref('Class 6')
const activeYearId = ref<number | null>(null)

const showForm = ref(false)
const editingApplication = ref<AdmissionApplication | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'application_no', label: t('Application No'), sortable: true },
  { key: 'candidate_name', label: t('Candidate'), sortable: true, render: (r) => renderCandidateName(r as AdmissionApplication) },
  { key: 'guardian_name', label: t('Guardian / Contact'), sortable: true, render: (r) => renderGuardianAndPhone(r as AdmissionApplication) },
  { key: 'desired_class', label: t('Class'), sortable: true },
  { key: 'verification_status', label: t('Verification Status'), sortable: true, align: 'center' },
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

function renderCandidateName(row: AdmissionApplication): string {
  if (row.candidate_name_bn) {
    return `${row.candidate_name} (${row.candidate_name_bn})`
  }
  return row.candidate_name
}

function renderGuardianAndPhone(row: AdmissionApplication): string {
  const isBD = !row.country || row.country.toLowerCase() === 'bangladesh' || row.country === 'বাংলাদেশ'
  const originSuffix = isBD ? '' : ` [${row.country}]`
  return `${row.guardian_name} — ${row.phone}${originSuffix}`
}

function filterRoster() {
  filteredApplications.value = allApplications.value.filter(
    (a) => a.desired_class === activeClass.value && a.payment_status === 'Paid',
  )
}

// Watch selection states to filter roster
watch([activeClass, allApplications], () => {
  filterRoster()
})

async function loadAll() {
  const [apps, y] = await Promise.all([fetchApplications(), fetchAcademicYears()])
  // Parse checklist JSON safely on load
  allApplications.value = apps.map((a) => {
    let list = { photo: false, birth_certificate: false, transcript: false, tc: false }
    if (a.verification_checklist && typeof a.verification_checklist === 'string') {
      try {
        list = JSON.parse(a.verification_checklist)
      } catch {
        list = { photo: false, birth_certificate: false, transcript: false, tc: false }
      }
    }
    return {
      ...a,
      verification_checklist: list,
    }
  })
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

function openEdit(item: AdmissionApplication) {
  editingApplication.value = item
  showForm.value = true
}

async function onSave(app: AdmissionApplication) {
  const saved = await saveApplication(app)
  if (saved) {
    toast.success(t('Successfully updated verification records!'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

// ── Badges Styling Helpers ─────────────────────────────────────────────

function getVerifyBadgeClass(status: string): string {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'verified') return 'enq-badge enq-badge--converted'
  if (s === 'partially verified') return 'enq-badge enq-badge--follow'
  if (s === 'unverified') return 'enq-badge enq-badge--rejected'
  return 'enq-badge'
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
        <h1>{{ t('Document Verification') }}</h1>
        <p>{{ t('Audit and verify submitted candidate files, checklist mandatory certificates, and update verification sign-off logs.') }}</p>
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

    <!-- Data table (reusable, sticky head, sortable) -->
    <DataTable
      :columns="tableColumns"
      :rows="filteredApplications"
      row-key="id"
      default-sort-key="application_no"
      :empty-text="t('No submitted candidate applications found in the selected class.')"
    >
      <template #verification_status="{ row }">
        <span :class="getVerifyBadgeClass((row as AdmissionApplication).verification_status)">
          {{ t((row as AdmissionApplication).verification_status) }}
        </span>
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as AdmissionApplication)">
          <i class="fa-duotone fa-file-circle-check" /> {{ t('Audit') }}
        </button>
      </template>
    </DataTable>

    <!-- Form modal (Audit Document Verification) -->
    <BaseModal
      v-if="showForm"
      :title="t('Audit Verification Record')"
      wide
      panel-class="verify-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <VerificationModal
        v-if="editingApplication"
        :application="editingApplication"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
