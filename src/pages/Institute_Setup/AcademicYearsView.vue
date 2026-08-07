<!-- Institute Setup > Academic Year -->
<script setup lang="ts">
// Academic year management — list of year cards with add/edit/delete,
// beautiful View modal, Excel export/import (same pattern as Branches).
import { onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchAcademicYears,
  saveAcademicYear,
  deleteAcademicYear,
  type AcademicYear,
} from '@/composables/Institute_Setup/useAcademicYears'
import {
  exportAcademicYearsToExcel,
  importAcademicYearsFromExcel,
} from '@/composables/Institute_Setup/useAcademicYearsExcel'
import BaseModal from '@/components/ui/BaseModal.vue'
import AcademicYearFormModal from './AcademicYearFormModal.vue'
import AcademicYearPreviewModal from './AcademicYearPreviewModal.vue'

defineOptions({ name: 'AcademicYearsView' })

const { t } = useTranslator()
const toast = useToast()

const years = ref<AcademicYear[]>([])
const isPageLoading = ref(true)
const MIN_SKELETON_MS = 1200

const showForm = ref(false)
const editingYear = ref<AcademicYear | null>(null)
const showPreview = ref(false)
const previewYear = ref<AcademicYear | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

async function load() {
  years.value = await fetchAcademicYears()
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([load(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingYear.value = null
  showForm.value = true
}
function openEdit(year: AcademicYear) {
  editingYear.value = year
  showForm.value = true
}
function openView(year: AcademicYear) {
  previewYear.value = year
  showPreview.value = true
}

async function onSave(year: AcademicYear) {
  const saved = await saveAcademicYear(year)
  if (saved) {
    toast.success(year.id ? t('Year updated') : t('Year added'))
    showForm.value = false
    await load()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(year: AcademicYear) {
  if (!year.id) return
  const ok = window.confirm(t('Delete "{name}"?', { name: year.year_name }))
  if (!ok) return
  const deleted = await deleteAcademicYear(year.id)
  if (deleted) {
    toast.success(t('Deleted'))
    await load()
  } else {
    toast.error(t('Delete failed'))
  }
}

// ── Excel ──────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportAcademicYearsToExcel(years.value)
    toast.success(t('Excel downloaded'))
  } catch (err) {
    toast.error(t('Export failed: {error}', { error: err instanceof Error ? err.message : 'unknown' }))
  }
}

function triggerImport() {
  if (!isImporting.value) excelInput.value?.click()
}
async function onImportPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  isImporting.value = true
  try {
    const { years: imported } = await importAcademicYearsFromExcel(file)
    for (const y of imported) await saveAcademicYear(y)
    toast.success(t('{count} years imported', { count: imported.length }))
    await load()
  } catch (err) {
    toast.error(t('Import failed: {error}', { error: err instanceof Error ? err.message : 'invalid file' }))
  } finally {
    isImporting.value = false
  }
}

function sessionRange(y: AcademicYear): string {
  if (!y.start_date && !y.end_date) return t('—')
  return `${y.start_date || '?'} → ${y.end_date || '?'}`
}
</script>

<template>
  <!-- Skeleton -->
  <section v-if="isPageLoading" class="ipf-skeleton" aria-busy="true">
    <div class="ipf-skeleton__header">
      <div class="ipf-skeleton__titles">
        <span class="skeleton ipf-skeleton__title" />
        <span class="skeleton ipf-skeleton__subtitle" />
      </div>
      <div class="ipf-skeleton__actions">
        <span class="skeleton ipf-skeleton__pill" />
        <span class="skeleton ipf-skeleton__pill" />
        <span class="skeleton ipf-skeleton__pill" />
      </div>
    </div>
    <div v-for="n in 3" :key="n" class="ipf-skeleton__section">
      <span class="skeleton ipf-skeleton__section-title" />
      <div class="ipf-skeleton__grid">
        <span v-for="m in 3" :key="m" class="skeleton ipf-skeleton__field" />
      </div>
    </div>
  </section>

  <section v-else class="ipf">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Academic Year') }}</h1>
        <p>{{ t('Manage the academic sessions — one current year drives enrolment, fees and exams.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Year') }}
        </button>
        <button type="button" class="btn ipf-header__export" @click="handleExport">
          <i class="fa-duotone fa-file-excel" /> {{ t('Export') }}
        </button>
        <button type="button" class="btn ipf-header__import" :disabled="isImporting" @click="triggerImport">
          <i class="fa-duotone" :class="isImporting ? 'fa-spinner fa-spin' : 'fa-file-import'" />
          {{ t('Import') }}
        </button>
      </div>
      <input ref="excelInput" type="file" accept=".xlsx,.xls" class="ipf-logo__input" @change="onImportPicked" />
    </header>

    <!-- Year cards -->
    <div class="ay-grid">
      <article v-for="y in years" :key="y.id" class="ay-card" :class="{ 'ay-card--inactive': !y.is_active }">
        <div class="br-card__head">
          <div class="ay-card__year">{{ (y.year_name || 'YY').trim().slice(-2) }}</div>
          <div class="br-card__titles">
            <h3>{{ y.year_name }}</h3>
            <p v-if="y.year_name_bn">{{ y.year_name_bn }}</p>
            <div class="br-card__chips">
              <span v-if="y.is_current" class="br-chip br-chip--main">
                <i class="fa-duotone fa-star" /> {{ t('Current') }}
              </span>
              <span v-if="!y.is_active" class="br-chip br-chip--closed">
                {{ t('Closed') }}
              </span>
            </div>
          </div>
        </div>

        <div class="br-card__body">
          <p class="br-card__headline">
            <i class="fa-duotone fa-calendar-days" /> {{ sessionRange(y) }}
          </p>
          <p v-if="y.reg_start || y.reg_end">
            <i class="fa-duotone fa-door-open" />
            {{ t('Registration') }}: {{ y.reg_start || '?' }} → {{ y.reg_end || '?' }}
          </p>
          <p v-if="y.remarks" class="ay-card__remarks"><i class="fa-duotone fa-note-sticky" /> {{ y.remarks }}</p>
        </div>

        <div class="br-card__foot">
          <button type="button" class="btn btn--ghost br-card__btn" @click="openView(y)">
            <i class="fa-duotone fa-eye" /> {{ t('View') }}
          </button>
          <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(y)">
            <i class="fa-duotone fa-pen" /> {{ t('Edit') }}
          </button>
          <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(y)">
            <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
          </button>
        </div>
      </article>
    </div>

    <p v-if="!years.length" class="ipf-class-empty">
      <i class="fa-duotone fa-calendar-days" />
      {{ t('No academic years yet — press "Add Year" above to create your first session') }}
    </p>

    <!-- Form modal -->
    <BaseModal
      v-if="showForm"
      :title="editingYear ? t('Edit Year') : t('Add Year')"
      wide
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <AcademicYearFormModal
        :year="editingYear"
        :current-exists="years.some((y) => y.is_current)"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>

    <!-- View modal -->
    <BaseModal
      v-if="showPreview && previewYear"
      :title="t('Academic Year Details')"
      wide
      @close="showPreview = false"
    >
      <AcademicYearPreviewModal :year="previewYear" />
      <template #footer>
        <button type="button" class="btn btn--primary" @click="showPreview = false">
          <i class="fa-duotone fa-xmark" /> {{ t('Close') }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>
