<!-- Admission > Admission Dashboard Page -->
<script setup lang="ts">
// Admission Dashboard: provides a fully functional, highly visual overview
// of the student intake pipeline, dynamic KPI statistics, circular notices,
// and real-time candidate progression metrics. Includes a page-accurate skeleton loader.
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchEnquiries } from '@/composables/Admission/useAdmissionEnquiries'
import { fetchApplications } from '@/composables/Admission/useAdmissionApplications'
import { fetchAdmissionTests } from '@/composables/Admission/useAdmissionTests'
import { fetchLotteries } from '@/composables/Admission/useAdmissionLottery'

defineOptions({ name: 'AdmissionDashboardView' })

const { t } = useTranslator()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const enquiries = ref<unknown[]>([])
const applications = ref<unknown[]>([])
const tests = ref<unknown[]>([])
const lotteries = ref<unknown[]>([])

// ── Metrics Mappings ───────────────────────────────────────────────────

const totalEnquiries = computed(() => enquiries.value.length)
const totalApplications = computed(() => applications.value.length)

const selectedCount = computed(() => {
  return (applications.value as Record<string, unknown>[]).filter(
    (a) => a.application_status === 'Selected',
  ).length
})

const paidFeeCount = computed(() => {
  return (applications.value as Record<string, unknown>[]).filter(
    (a) => a.payment_status === 'Paid',
  ).length
})

const totalTestsCount = computed(() => tests.value.length)
const totalLotteriesCount = computed(() => lotteries.value.length)

async function loadAll() {
  const [y, enq, apps, tst, lot] = await Promise.all([
    fetchAcademicYears(),
    fetchEnquiries(),
    fetchApplications(),
    fetchAdmissionTests(),
    fetchLotteries(),
  ])
  years.value = y
  enquiries.value = enq
  applications.value = apps
  tests.value = tst
  lotteries.value = lot
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

const currentYearName = computed(() => {
  const activeYear = years.value.find((y) => y.is_current)
  return activeYear ? activeYear.year_name : '2026'
})
</script>

<template>
  <!-- Beautiful Page-accurate Skeleton Loader -->
  <section v-if="isPageLoading" class="ipf-skeleton" aria-busy="true">
    <div class="ipf-skeleton__header">
      <div class="ipf-skeleton__titles">
        <span class="skeleton ipf-skeleton__title" />
        <span class="skeleton ipf-skeleton__subtitle" />
      </div>
    </div>
    <div class="waiting-summary-grid">
      <div v-for="n in 3" :key="n" class="skeleton skeleton--card ipf-sk-field" style="height: 6rem" />
    </div>
    <div class="skeleton skeleton--card ipf-sk-section" style="height: 12rem; margin-top: 1.5rem;" />
  </section>

  <section v-else class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Admission Dashboard') }} — {{ currentYearName }}</h1>
        <p>{{ t('Real-time overview of prospective candidate inquiries, submitted applications, payment collections, and exam schedules.') }}</p>
      </div>
    </header>

    <!-- Stat KPI Cards Grid -->
    <div class="waiting-summary-grid">
      <div class="waiting-card">
        <div class="waiting-card__info">
          <span class="waiting-card__label">{{ t('Total Enquiries') }}</span>
          <span class="waiting-card__value">{{ totalEnquiries }}</span>
        </div>
        <div class="waiting-card__icon"><i class="fa-duotone fa-clipboard-question" /></div>
      </div>
      <div class="waiting-card waiting-card--info">
        <div class="waiting-card__info">
          <span class="waiting-card__label">{{ t('Online Applications') }}</span>
          <span class="waiting-card__value">{{ totalApplications }}</span>
        </div>
        <div class="waiting-card__icon"><i class="fa-duotone fa-inbox" /></div>
      </div>
      <div class="waiting-card waiting-card--info">
        <div class="waiting-card__info">
          <span class="waiting-card__label">{{ t('Selected Candidates') }}</span>
          <span class="waiting-card__value">{{ selectedCount }}</span>
        </div>
        <div class="waiting-card__icon"><i class="fa-duotone fa-trophy" /></div>
      </div>
    </div>

    <!-- Interactive Pipeline Flow Visual Chart -->
    <div class="adm-dash-pipeline">
      <h4 class="pipeline-flow-header">
        <i class="fa-duotone fa-chart-network" />
        {{ t('Admission Intake Pipeline & Conversion Flow') }}
      </h4>

      <div class="pipeline-flow-steps">
        <!-- Stage 1: Enquiries -->
        <div class="pipeline-flow-step">
          <div class="pipeline-flow-step__icon"><i class="fa-duotone fa-clipboard-question" /></div>
          <span class="pipeline-flow-step__value">{{ totalEnquiries }}</span>
          <span class="pipeline-flow-step__label">{{ t('Logged Enquiries') }}</span>
        </div>

        <div class="pipeline-flow-arrow"><i class="fa-duotone fa-arrow-right-long" /></div>

        <!-- Stage 2: Applications -->
        <div class="pipeline-flow-step pipeline-flow-step--info">
          <div class="pipeline-flow-step__icon"><i class="fa-duotone fa-inbox" /></div>
          <span class="pipeline-flow-step__value">{{ totalApplications }}</span>
          <span class="pipeline-flow-step__label">{{ t('Applications Submitted') }}</span>
        </div>

        <div class="pipeline-flow-arrow"><i class="fa-duotone fa-arrow-right-long" /></div>

        <!-- Stage 3: Paid Fees -->
        <div class="pipeline-flow-step pipeline-flow-step--warning">
          <div class="pipeline-flow-step__icon"><i class="fa-duotone fa-money-check-dollar" /></div>
          <span class="pipeline-flow-step__value">{{ paidFeeCount }}</span>
          <span class="pipeline-flow-step__label">{{ t('Paid Application Fees') }}</span>
        </div>

        <div class="pipeline-flow-arrow"><i class="fa-duotone fa-arrow-right-long" /></div>

        <!-- Stage 4: Selected Winners -->
        <div class="pipeline-flow-step pipeline-flow-step--success">
          <div class="pipeline-flow-step__icon"><i class="fa-duotone fa-trophy" /></div>
          <span class="pipeline-flow-step__value">{{ selectedCount }}</span>
          <span class="pipeline-flow-step__label">{{ t('Selected Candidates') }}</span>
        </div>
      </div>
    </div>

    <!-- Informational notices / circulars widget -->
    <div class="adm-dash-notices">
      <h4 class="pipeline-flow-header">
        <i class="fa-duotone fa-newspaper" />
        {{ t('Admissions Circular Notices') }}
      </h4>

      <div class="notice-list">
        <div class="notice-item">
          <span class="notice-item__date">15/10/2026</span>
          <span class="notice-item__content">
            {{ t('Written entrance examinations scheduled to be conducted inside BLK-01 / Main Building classrooms.') }}
            (<strong>{{ totalTestsCount }}</strong> {{ t('Exams mapped') }})
          </span>
        </div>
        <div class="notice-item">
          <span class="notice-item__date">08/10/2026</span>
          <span class="notice-item__content">
            {{ t('Digital Lottery Draw configured and completed for all designated non-viva class levels.') }}
            (<strong>{{ totalLotteriesCount }}</strong> {{ t('Draw sessions executed') }})
          </span>
        </div>
        <div class="notice-item">
          <span class="notice-item__date">01/10/2026</span>
          <span class="notice-item__content">
            {{ t('Online Admission Application Window for session 2026 is officially open on the public portal!') }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
