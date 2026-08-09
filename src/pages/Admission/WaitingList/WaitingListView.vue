<!-- Admission > Waiting List Page -->
<script setup lang="ts">
// Admission Waiting List: displays waitlisted applicants sorted dynamically by score.
// Supports real-time vacancy calculations, automated #1 spot promotion, manual promotion,
// and full bilingual translation toggles.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchApplications, saveApplication, type AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'
import { compileWaitingList, type WaitlistedCandidate } from '@/composables/Admission/useAdmissionWaitingList'
import { exportWaitingListToExcel } from '@/composables/Admission/useAdmissionWaitingListExcel'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'WaitingListView' })

const { t } = useTranslator()
const toast = useToast()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const allApplications = ref<AdmissionApplication[]>([])

// Selection state
const activeClass = ref('Class 6')
const activeYearId = ref<number | null>(null)
const intakeCapacity = ref(30) // Default target capacity

const waitlist = ref<WaitlistedCandidate[]>([])

// Confirm modal for manual promotion
const showPromoteConfirm = ref(false)
const promoteTarget = ref<WaitlistedCandidate | null>(null)

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'waitlist_rank', label: t('Waitlist Position'), sortable: true, align: 'center' },
  { key: 'application_no', label: t('Application No'), sortable: true },
  { key: 'candidate_name', label: t('Candidate'), sortable: true, render: (r) => renderCandidateName(r as WaitlistedCandidate) },
  { key: 'guardian_name', label: t('Guardian / Contact'), sortable: true, render: (r) => renderGuardianAndPhone(r as WaitlistedCandidate) },
  { key: 'total_marks', label: t('Total Score'), sortable: true, align: 'center' },
  { key: 'application_status', label: t('Current Status'), sortable: true, align: 'center' },
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

function renderCandidateName(row: WaitlistedCandidate): string {
  if (row.candidate_name_bn) {
    return `${row.candidate_name} (${row.candidate_name_bn})`
  }
  return row.candidate_name
}

function renderGuardianAndPhone(row: WaitlistedCandidate): string {
  const isBD = !row.country || row.country.toLowerCase() === 'bangladesh' || row.country === 'বাংলাদেশ'
  const originSuffix = isBD ? '' : ` [${row.country}]`
  return `${row.guardian_name} — ${row.phone}${originSuffix}`
}

// ── Vacancy Calculations ───────────────────────────────────────────────

const selectedCount = computed(() => {
  return allApplications.value.filter(
    (a) => a.desired_class === activeClass.value && a.application_status === 'Selected',
  ).length
})

const openVacancies = computed(() => {
  const v = intakeCapacity.value - selectedCount.value
  return v > 0 ? v : 0
})

function compileList() {
  waitlist.value = compileWaitingList(activeClass.value, allApplications.value)
}

// Watch selection states to compile in real-time
watch([activeClass, allApplications], () => {
  compileList()
})

async function loadAll() {
  const [apps, y] = await Promise.all([fetchApplications(), fetchAcademicYears()])
  allApplications.value = apps
  years.value = y
  if (y.length > 0) {
    activeYearId.value = Number(y[0].id)
  }
  compileList()
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

// ── Actions ────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportWaitingListToExcel(activeClass.value, waitlist.value)
    toast.success(t('Excel downloaded'))
  } catch (err) {
    toast.error(t('Export failed: {error}', { error: err instanceof Error ? err.message : 'unknown' }))
  }
}

// Open confirmation modal
function requestPromotion(candidate: WaitlistedCandidate) {
  promoteTarget.value = candidate
  showPromoteConfirm.value = true
}

async function executePromotion(candidate: WaitlistedCandidate) {
  const updated = { ...candidate, application_status: 'Selected' as const }
  const saved = await saveApplication(updated)
  if (saved) {
    toast.success(t('Candidate promoted successfully!'))
    showPromoteConfirm.value = false
    promoteTarget.value = null
    await loadAll()
  } else {
    toast.error(t('Promotion failed — is server.py running?'))
  }
}

// Automated #1 ranked waitlist candidate promotion
async function autoPromoteNext() {
  if (waitlist.value.length === 0) {
    toast.error(t('No candidates left in the waiting list.'))
    return
  }
  if (openVacancies.value === 0) {
    toast.error(t('No class vacancies available! Please increase capacity first.'))
    return
  }
  
  const nextCandidate = waitlist.value[0]
  const ok = window.confirm(t('Auto-promote waitlist #1 "{name}" into the active vacancy?', { name: nextCandidate.candidate_name }))
  if (!ok) return
  
  await executePromotion(nextCandidate)
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
        <h1>{{ t('Admission Waiting List') }}</h1>
        <p>{{ t('Review ranked waitlist queues, track dynamic seat vacancies, and promote qualified candidates into selection vacancies.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button
          type="button"
          class="btn btn--primary"
          :disabled="openVacancies === 0 || !waitlist.length"
          @click="autoPromoteNext"
        >
          <i class="fa-duotone fa-angles-up" /> {{ t('Auto-Promote Next') }}
        </button>
        <button type="button" class="btn ipf-header__export" :disabled="!waitlist.length" @click="handleExport">
          <i class="fa-duotone fa-file-excel" /> {{ t('Export') }}
        </button>
      </div>
    </header>

    <!-- Selection filters & dynamic stats -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-sliders" />
        {{ t('Select Class Scope & Review Vacancies') }}
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
        <div class="form-field">
          <label>{{ t('Seat Intake Capacity') }}</label>
          <input v-model.number="intakeCapacity" type="number" min="1" :placeholder="t('e.g. 30')" />
        </div>
      </div>
    </div>

    <!-- Stats summary grid -->
    <div class="waiting-summary-grid">
      <div class="waiting-card">
        <div class="waiting-card__info">
          <span class="waiting-card__label">{{ t('Waitlisted Queue') }}</span>
          <span class="waiting-card__value">{{ waitlist.length }}</span>
        </div>
        <div class="waiting-card__icon"><i class="fa-duotone fa-clock-list" /></div>
      </div>
      <div class="waiting-card waiting-card--info">
        <div class="waiting-card__info">
          <span class="waiting-card__label">{{ t('Selected Candidates') }}</span>
          <span class="waiting-card__value">{{ selectedCount }} / {{ intakeCapacity }}</span>
        </div>
        <div class="waiting-card__icon"><i class="fa-duotone fa-trophy" /></div>
      </div>
      <div class="waiting-card" :class="openVacancies > 0 ? 'waiting-card--info' : 'waiting-card--warning'">
        <div class="waiting-card__info">
          <span class="waiting-card__label">{{ t('Available Class Vacancies') }}</span>
          <span class="waiting-card__value">{{ openVacancies }}</span>
        </div>
        <div class="waiting-card__icon">
          <i class="fa-duotone" :class="openVacancies > 0 ? 'fa-chair' : 'fa-triangle-exclamation'" />
        </div>
      </div>
    </div>

    <!-- Data table (reusable, sticky head, sortable) -->
    <DataTable
      :columns="tableColumns"
      :rows="waitlist"
      row-key="id"
      default-sort-key="waitlist_rank"
      :empty-text="t('No waitlisted candidates in the queue for this class.')"
    >
      <template #application_status="{ row }">
        <span class="enq-badge enq-badge--follow">
          {{ t((row as WaitlistedCandidate).application_status) }}
        </span>
      </template>

      <template #actions="{ row }">
        <button
          type="button"
          class="btn btn--ghost br-card__btn"
          :disabled="openVacancies === 0"
          @click="requestPromotion(row as WaitlistedCandidate)"
        >
          <i class="fa-duotone fa-angles-up" /> {{ t('Promote') }}
        </button>
      </template>
    </DataTable>

    <!-- Warning modal: confirm manual promotion of a waitlisted candidate -->
    <BaseModal
      v-if="showPromoteConfirm"
      :title="t('Promote Candidate')"
      @close="showPromoteConfirm = false"
    >
      <div class="cm-confirm">
        <div class="cm-confirm__icon"><i class="fa-duotone fa-triangle-exclamation" /></div>
        <p class="cm-confirm__text">
          {{
            t('Are you sure you want to promote waitlisted candidate "{name}" into the active selected roster? This will update their application status to Selected.', {
              name: promoteTarget ? promoteTarget.candidate_name : '',
            })
          }}
        </p>
      </div>
      <template #footer>
        <button type="button" class="btn" @click="showPromoteConfirm = false">
          {{ t('Cancel') }}
        </button>
        <button type="button" class="btn btn--primary" @click="promoteTarget && executePromotion(promoteTarget)">
          <i class="fa-duotone fa-angles-up" /> {{ t('Promote') }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>
