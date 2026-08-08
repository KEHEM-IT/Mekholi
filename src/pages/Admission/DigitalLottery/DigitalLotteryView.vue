<!-- Admission > Digital Lottery Draw View -->
<script setup lang="ts">
// Digital Lottery Draw: manages the execution, publication, and deletion of
// randomized student intake selection. Fully integrated with SQL persistence,
// quotas, and robust responsive layouts.
import { computed, onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchLotteries,
  saveLottery,
  deleteLottery,
  type LotteryDraw,
} from '@/composables/Admission/useAdmissionLottery'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import LotteryDrawModal from './LotteryDrawModal.vue'

defineOptions({ name: 'DigitalLotteryView' })

const { t } = useTranslator()
const toast = useToast()

const lotteries = ref<LotteryDraw[]>([])
const years = ref<AcademicYear[]>([])

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const showForm = ref(false)
const editingLottery = ref<LotteryDraw | null>(null)

const yearLabel = computed(() => {
  return (id: unknown) => {
    const y = years.value.find((x) => x.id === Number(id))
    return y ? y.year_name : String(id ?? '')
  }
})

// ── Table columns ──────────────────────────────────────────────────────
const tableColumns = computed<TableColumn[]>(() => [
  { key: 'draw_date', label: t('Draw Date'), sortable: true, render: (r) => formatDate((r as LotteryDraw).draw_date) },
  { key: 'class_name', label: t('Class'), sortable: true },
  { key: 'academic_year_id', label: t('Year'), sortable: true, render: (r) => yearLabel.value((r as LotteryDraw).academic_year_id) },
  { key: 'total_seats', label: t('Available Seats'), sortable: true, align: 'center' },
  { key: 'winners_count', label: t('Selected Winners'), align: 'center', render: (r) => String((r as LotteryDraw).selected_applicant_ids?.length ?? 0) },
  { key: 'waiting_count', label: t('Waitlisted Queue'), align: 'center', render: (r) => String((r as LotteryDraw).waiting_applicant_ids?.length ?? 0) },
  { key: 'is_published', label: t('Status'), align: 'center', sortable: true },
])

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

async function loadAll() {
  const [lData, y] = await Promise.all([fetchLotteries(), fetchAcademicYears()])
  lotteries.value = lData
  years.value = y
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingLottery.value = null
  showForm.value = true
}

function openEdit(item: LotteryDraw) {
  editingLottery.value = item
  showForm.value = true
}

async function onSave(lottery: LotteryDraw) {
  const saved = await saveLottery(lottery)
  if (saved) {
    toast.success(lottery.id ? t('Updated') : t('Added'))
    showForm.value = false
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
  }
}

async function onDelete(item: LotteryDraw) {
  const id = item.id
  if (!id) return
  const ok = window.confirm(t('Delete draw results for class "{name}"?', { name: item.class_name }))
  if (!ok) return
  const deleted = await deleteLottery(id)
  if (deleted) {
    await loadAll()
    toast.success(t('Deleted'))
  } else {
    toast.error(t('Delete failed'))
  }
}

async function onTogglePublished(item: LotteryDraw) {
  const updated = { ...item, is_published: !item.is_published }
  const saved = await saveLottery(updated)
  if (saved) {
    toast.success(t('Updated'))
    await loadAll()
  } else {
    toast.error(t('Save failed — is server.py running?'))
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
        <h1>{{ t('Digital Lottery Draw') }}</h1>
        <p>{{ t('Configure quota distributions, execute randomized student selection, and publish official merit-winners lists.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-ticket-simple" /> {{ t('Configure & Run Draw') }}
        </button>
      </div>
    </header>

    <!-- Data table (reusable, sticky head, sortable) -->
    <DataTable
      :columns="tableColumns"
      :rows="lotteries"
      row-key="id"
      default-sort-key="draw_date"
      :empty-text="t('No digital lottery draws executed yet. Click “Configure & Run Draw” to start student selection.')"
    >
      <template #is_published="{ row }">
        <span
          v-if="(row as LotteryDraw).is_published"
          class="enq-badge enq-badge--converted cursor-pointer"
          @click="onTogglePublished(row as LotteryDraw)"
        >
          <i class="fa-duotone fa-bullhorn" /> {{ t('Published') }}
        </span>
        <span
          v-else
          class="enq-badge enq-badge--follow cursor-pointer"
          @click="onTogglePublished(row as LotteryDraw)"
        >
          <i class="fa-duotone fa-file-pen" /> {{ t('Draft') }}
        </span>
      </template>

      <template #actions="{ row }">
        <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(row as LotteryDraw)">
          <i class="fa-duotone fa-eye" /> {{ t('View') }}
        </button>
        <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(row as LotteryDraw)">
          <i class="fa-duotone fa-trash" /> {{ t('Delete') }}
        </button>
      </template>
    </DataTable>

    <!-- Form modal (Configure & Run Draw) -->
    <BaseModal
      v-if="showForm"
      :title="editingLottery ? t('Lottery Draw Details') : t('Configure & Run Draw')"
      wide
      panel-class="lottery-form-modal"
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <LotteryDrawModal
        :lottery="editingLottery"
        :years="years"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>
  </section>
</template>
