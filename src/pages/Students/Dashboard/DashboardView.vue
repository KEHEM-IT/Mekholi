<!-- Students > Student Dashboard Page -->
<script setup lang="ts">
// Student Dashboard: provides a visual overview of active enrolled students,
// gender ratios, religious distributions, and stipend eligibility metrics.
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import { fetchStudents, type Student } from '@/composables/Students/useStudents'

defineOptions({ name: 'StudentDashboardView' })

const { t } = useTranslator()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const students = ref<Student[]>([])

const totalActive = computed(() => students.value.filter((s) => s.is_active).length)

const maleCount = computed(() => students.value.filter((s) => s.gender === 'Male' && s.is_active).length)
const femaleCount = computed(() => students.value.filter((s) => s.gender === 'Female' && s.is_active).length)

const genderRatio = computed(() => {
  const tot = totalActive.value
  if (!tot) return { male: 50, female: 50 }
  return {
    male: Math.round((maleCount.value / tot) * 100),
    female: Math.round((femaleCount.value / tot) * 100),
  }
})

const stipendEligibleCount = computed(() => students.value.filter((s) => s.stipend_eligible && s.is_active).length)

async function loadAll() {
  const [y, stds] = await Promise.all([fetchAcademicYears(), fetchStudents()])
  years.value = y
  students.value = stds
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
  <!-- Page-accurate Skeleton Loader -->
  <section v-if="isPageLoading" class="ipf-skeleton" aria-busy="true">
    <div class="ipf-skeleton__header">
      <div class="ipf-skeleton__titles">
        <span class="skeleton ipf-skeleton__title" />
        <span class="skeleton ipf-skeleton__subtitle" />
      </div>
    </div>
    <div class="std-dash-grid">
      <div v-for="n in 3" :key="n" class="skeleton skeleton--card ipf-sk-field" style="height: 6rem" />
    </div>
    <div class="skeleton skeleton--card ipf-sk-section" style="height: 14rem; margin-top: 1.5rem;" />
  </section>

  <section v-else class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Student Dashboard') }} — {{ currentYearName }}</h1>
        <p>{{ t('Real-time overview of active enrolled student registers, gender ratios, and government stipend allocations.') }}</p>
      </div>
    </header>

    <!-- KPI Cards Grid -->
    <div class="std-dash-grid">
      <div class="std-dash-card">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Active Students') }}</span>
          <span class="std-dash-card__value">{{ totalActive }}</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-user-group" /></div>
      </div>
      <div class="std-dash-card std-dash-card--info">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Gender Ratio (Male / Female)') }}</span>
          <span class="std-dash-card__value">{{ genderRatio.male }}% / {{ genderRatio.female }}%</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-venus-mars" /></div>
      </div>
      <div class="std-dash-card std-dash-card--success">
        <div class="std-dash-card__info">
          <span class="std-dash-card__label">{{ t('Stipend Recipients') }}</span>
          <span class="std-dash-card__value">{{ stipendEligibleCount }}</span>
        </div>
        <div class="std-dash-card__icon"><i class="fa-duotone fa-hand-holding-dollar" /></div>
      </div>
    </div>

    <!-- Extra visual analytics card -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-chart-line" />
        {{ t('Enrollment & Demographics Summary') }}
      </h4>
      <div class="ipf-grid ipf-grid--three">
        <div class="form-field">
          <label>{{ t('Male Candidates count') }}</label>
          <div class="mock-input is-disabled">
            <span class="placeholder-mock font-bold">{{ maleCount }}</span>
          </div>
        </div>
        <div class="form-field">
          <label>{{ t('Female Candidates count') }}</label>
          <div class="mock-input is-disabled">
            <span class="placeholder-mock font-bold">{{ femaleCount }}</span>
          </div>
        </div>
        <div class="form-field">
          <label>{{ t('Total Active Student Registry') }}</label>
          <div class="mock-input is-disabled">
            <span class="placeholder-mock font-bold">{{ totalActive }} {{ t('Enrolled') }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
