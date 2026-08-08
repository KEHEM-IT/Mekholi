<!-- Admission > Merit List Page -->
<script setup lang="ts">
// Admission Merit List: compiles, ranks, and publishes terminal student intake lists
// dynamically from test scores. Fully supports bilingual formatting, custom card
// stats, multi-tab registers, and Excel export downloads.
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchApplications, saveApplication, type AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'
import { compileMeritList, type RankedApplicant } from '@/composables/Admission/useAdmissionMeritList'
import { exportMeritListToExcel } from '@/composables/Admission/useAdmissionMeritListExcel'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import PublishMeritListModal from './PublishMeritListModal.vue'

defineOptions({ name: 'MeritListView' })

const { t } = useTranslator()
const toast = useToast()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const allApplications = ref<AdmissionApplication[]>([])

// Selected configuration state
const activeClass = ref('Class 6')
const activeYearId = ref<number | null>(null)
const intakeCapacity = ref(30)

const activeTab = ref<'merit' | 'waitlist'>('merit')
const showForm = ref(false)

const meritWinners = ref<RankedApplicant[]>([])
const waitlistQueue = ref<RankedApplicant[]>([])

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'rank', label: t('Merit Rank'), sortable: true, align: 'center' },
  { key: 'application_no', label: t('Application No'), sortable: true },
  { key: 'candidate_name', label: t('Candidate'), sortable: true, render: (r) => renderCandidateName(r as RankedApplicant) },
  { key: 'guardian_name', label: t('Guardian / Contact'), sortable: true, render: (r) => renderGuardianAndPhone(r as RankedApplicant) },
  { key: 'written_marks', label: t('Written'), sortable: true, align: 'center' },
  { key: 'viva_marks', label: t('VIVA'), sortable: true, align: 'center' },
  { key: 'total_marks', label: t('Total Score'), sortable: true, align: 'center' },
])

// ── Render Helpers ─────────────────────────────────────────────────────

function renderCandidateName(row: RankedApplicant): string {
  if (row.candidate_name_bn) {
    return `${row.candidate_name} (${row.candidate_name_bn})`
  }
  return row.candidate_name
}

function renderGuardianAndPhone(row: RankedApplicant): string {
  const isBD = !row.country || row.country.toLowerCase() === 'bangladesh' || row.country === 'বাংলাদেশ'
  const originSuffix = isBD ? '' : ` [${row.country}]`
  return `${row.guardian_name} — ${row.phone}${originSuffix}`
}

function compileList() {
  const { meritWinners: winners, waitlistedQueue: waitlist } = compileMeritList(
    activeClass.value,
    allApplications.value,
    intakeCapacity.value,
  )
  meritWinners.value = winners
  waitlistQueue.value = waitlist
}

// Watch selection states to re-compile lists in real-time
watch([activeClass, allApplications, intakeCapacity], () => {
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
    exportMeritListToExcel(activeClass.value, meritWinners.value, waitlistQueue.value)
    toast.success(t('Excel downloaded'))
  } catch (err) {
    toast.error(t('Export failed: {error}', { error: err instanceof Error ? err.message : 'unknown' }))
  }
}

function handleConfigure(payload: { className: string; capacity: number; academicYearId: number }) {
  activeClass.value = payload.className
  intakeCapacity.value = payload.capacity
  activeYearId.value = payload.academicYearId
  showForm.value = false
  compileList()
  toast.success(t('Merit roster compiled for class!'))
}

// Bulk update applicants status in database to Selected or Waiting
async function lockAndPublish() {
  const ok = window.confirm(t('Are you sure you want to lock and publish the merit list for "{class}"? This will update candidate application statuses.', { class: activeClass.value }))
  if (!ok) return
  
  let successCount = 0
  for (const w of meritWinners.value) {
    const updated = await saveApplication({ ...w, application_status: 'Selected' })
    if (updated) successCount++
  }
  for (const w of waitlistQueue.value) {
    // Keep them as Submitted or mark them accordingly if you want waitlist status
    const updated = await saveApplication({ ...w, application_status: 'Submitted' })
    if (updated) successCount++
  }
  
  if (successCount > 0) {
    toast.success(t('Successfully locked and published rosters!'))
    await loadAll()
  } else {
    toast.error(t('Roster updates failed — is server.py running?'))
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
        <h1>{{ t('Admission Merit List') }}</h1>
        <p>{{ t('Generate ranked selections based on cumulative written and viva scores, assign seats, and publish final winners.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="showForm = true">
          <i class="fa-duotone fa-sliders" /> {{ t('Compile & Settings') }}
        </button>
        <button type="button" class="btn btn--ghost" :disabled="!meritWinners.length" @click="lockAndPublish">
          <i class="fa-duotone fa-circle-check" /> {{ t('Lock & Publish List') }}
        </button>
        <button type="button" class="btn ipf-header__export" :disabled="!meritWinners.length" @click="handleExport">
          <i class="fa-duotone fa-file-excel" /> {{ t('Export') }}
        </button>
      </div>
    </header>

    <!-- Stat cards grid showing active selection info -->
    <div class="merit-summary-grid">
      <div class="merit-stat-card">
        <div class="merit-stat-card__info">
          <span class="merit-stat-card__label">{{ t('Target Class') }}</span>
          <span class="merit-stat-card__value">{{ activeClass }}</span>
        </div>
        <div class="merit-stat-card__icon"><i class="fa-duotone fa-graduation-cap" /></div>
      </div>
      <div class="merit-stat-card merit-stat-card--success">
        <div class="merit-stat-card__info">
          <span class="merit-stat-card__label">{{ t('Seats Capacity (Winners)') }}</span>
          <span class="merit-stat-card__value">{{ meritWinners.length }} / {{ intakeCapacity }}</span>
        </div>
        <div class="merit-stat-card__icon"><i class="fa-duotone fa-trophy" /></div>
      </div>
      <div class="merit-stat-card merit-stat-card--warning">
        <div class="merit-stat-card__info">
          <span class="merit-stat-card__label">{{ t('Waitlisted Queue') }}</span>
          <span class="merit-stat-card__value">{{ waitlistQueue.length }}</span>
        </div>
        <div class="merit-stat-card__icon"><i class="fa-duotone fa-clock-list" /></div>
      </div>
    </div>

    <!-- Tab Selection Headers -->
    <div class="merit-tabs-header">
      <button
        type="button"
        class="merit-tab-btn"
        :class="{ 'is-active': activeTab === 'merit' }"
        @click="activeTab = 'merit'"
      >
        <i class="fa-duotone fa-circle-check" /> {{ t('Selected Merit List') }}
      </button>
      <button
        type="button"
        class="merit-tab-btn"
        :class="{ 'is-active': activeTab === 'waitlist' }"
        @click="activeTab = 'waitlist'"
      >
        <i class="fa-duotone fa-clock-list" /> {{ t('Waitlisted Queue') }}
      </button>
    </div>

    <!-- Data table (reusable, sticky head, sortable) -->
    <DataTable
      v-if="activeTab === 'merit'"
      :columns="tableColumns"
      :rows="meritWinners"
      row-key="id"
      default-sort-key="rank"
      :empty-text="t('No merit winners qualified or selected yet. Check test scores or compilation settings.')"
    />

    <DataTable
      v-else
      :columns="tableColumns"
      :rows="waitlistQueue"
      row-key="id"
      default-sort-key="rank"
      :empty-text="t('No waitlisted candidates in the queue.')"
    />

    <!-- Form modal (Compile & Settings) -->
    <BaseModal
      v-if="showForm"
      :title="t('Compile & Settings')"
      wide
      panel-class="test-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <PublishMeritListModal
        :years="years"
        @publish="handleConfigure"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
