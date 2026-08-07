<!-- Institute Setup > Branches/Campus -->
<script setup lang="ts">
// Multi-campus management page — list of branch cards with add/edit/delete,
// beautiful View modal, and Excel export/import (same design language as
// the Institute Profile page).
import { onMounted, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import {
  fetchBranches,
  saveBranch,
  deleteBranch,
  type Branch,
} from '@/composables/Institute_Setup/useBranches'
import { exportBranchesToExcel, importBranchesFromExcel } from '@/composables/Institute_Setup/useBranchesExcel'
import BaseModal from '@/components/ui/BaseModal.vue'
import BranchFormModal from './BranchFormModal.vue'
import BranchPreviewModal from './BranchPreviewModal.vue'

defineOptions({ name: 'BranchesView' })

const toast = useToast()
const { t } = useTranslator()

const branches = ref<Branch[]>([])
const isPageLoading = ref(true)
const MIN_SKELETON_MS = 1500

const showForm = ref(false)
const editingBranch = ref<Branch | null>(null)
const showPreview = ref(false)
const previewBranch = ref<Branch | null>(null)
const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)

async function load() {
  branches.value = await fetchBranches()
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([load(), minDelay])
  isPageLoading.value = false
})

function openAdd() {
  editingBranch.value = null
  showForm.value = true
}
function openEdit(branch: Branch) {
  editingBranch.value = branch
  showForm.value = true
}
function openView(branch: Branch) {
  previewBranch.value = branch
  showPreview.value = true
}

async function onSave(branch: Branch) {
  const saved = await saveBranch(branch)
  if (saved) {
    toast.success(branch.id ? t('branches.savedUpdate') : t('branches.savedAdd'))
    showForm.value = false
    await load()
  } else {
    toast.error(t('common.saveFailed'))
  }
}

async function onDelete(branch: Branch) {
  if (!branch.id) return
  const ok = window.confirm(t('common.confirmDelete', { name: branch.branch_name }))
  if (!ok) return
  const deleted = await deleteBranch(branch.id)
  if (deleted) {
    toast.success(t('common.deleted'))
    await load()
  } else {
    toast.error(t('common.deleteFailed'))
  }
}

// ── Excel ──────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportBranchesToExcel(branches.value)
    toast.success(t('common.excelDownloaded'))
  } catch (err) {
    toast.error(t('common.exportFailed', { error: err instanceof Error ? err.message : 'unknown' }))
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
    const { branches: imported, skipped } = await importBranchesFromExcel(file)
    for (const b of imported) await saveBranch(b)
    toast.success(
      t('branches.importedCount', { count: imported.length, skipped: skipped.length }),
    )
    await load()
  } catch (err) {
    toast.error(t('common.importFailed', { error: err instanceof Error ? err.message : 'invalid file' }))
  } finally {
    isImporting.value = false
  }
}

// ── Card helpers ───────────────────────────────────────────────────────

function cardInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'BR'
}
function shortAddress(b: Branch): string {
  const parts = [b.village_road_holding_no, b.post_office, b.district_id ? '' : ''].filter(Boolean)
  return parts.join(', ') || t('common.noAddress')
}
</script>

<template>
  <!-- Skeleton — mirrors the real page: header + branch-card grid -->
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

    <div class="br-grid">
      <div v-for="n in 6" :key="n" class="skeleton skeleton--card br-sk-card">
        <div class="br-sk-head">
          <span class="skeleton br-sk-logo" />
          <div class="br-sk-titles">
            <span class="skeleton br-sk-name" />
            <span class="skeleton br-sk-namebn" />
            <span class="skeleton br-sk-chip" />
          </div>
        </div>
        <span class="skeleton br-sk-line" />
        <span class="skeleton br-sk-line br-sk-line--short" />
        <div class="br-sk-foot">
          <span class="skeleton br-sk-btn" />
          <span class="skeleton br-sk-btn" />
          <span class="skeleton br-sk-btn" />
        </div>
      </div>
    </div>
  </section>

  <section v-else class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('branches.title') }}</h1>
        <p>{{ t('branches.subtitle') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('branches.addTitle') }}
        </button>
        <button type="button" class="btn ipf-header__export" @click="handleExport">
          <i class="fa-duotone fa-file-excel" /> {{ t('common.export') }}
        </button>
        <button type="button" class="btn ipf-header__import" :disabled="isImporting" @click="triggerImport">
          <i class="fa-duotone" :class="isImporting ? 'fa-spinner fa-spin' : 'fa-file-import'" />
          {{ t('common.import') }}
        </button>
      </div>
      <input ref="excelInput" type="file" accept=".xlsx,.xls" class="ipf-logo__input" @change="onImportPicked" />
    </header>

    <!-- Branch cards -->
    <div class="br-grid">
      <article v-for="b in branches" :key="b.id" class="br-card" :class="{ 'br-card--inactive': !b.is_active }">
        <div class="br-card__head">
          <div class="br-card__logo">
            <img v-if="b.logo" :src="b.logo" alt="logo" />
            <span v-else>{{ cardInitials(b.branch_name) }}</span>
          </div>
          <div class="br-card__titles">
            <h3>{{ b.branch_name }}</h3>
            <p v-if="b.branch_name_bn">{{ b.branch_name_bn }}</p>
            <div class="br-card__chips">
              <span v-if="b.branch_code" class="br-chip br-chip--code">{{ b.branch_code }}</span>
              <span class="br-chip">{{ b.campus_type }}</span>
              <span v-if="b.is_main" class="br-chip br-chip--main">
                <i class="fa-duotone fa-star" /> {{ t('common.main') }}
              </span>
              <span v-if="b.admission_open" class="br-chip br-chip--admission">
                {{ t('common.admissionOpen') }}
              </span>
            </div>
          </div>
        </div>

        <div class="br-card__body">
          <p v-if="b.head_name" class="br-card__headline">
            <i class="fa-duotone fa-user-tie" /> {{ b.head_name }}
            <template v-if="b.head_designation"> — {{ b.head_designation }}</template>
          </p>
          <p class="br-card__addr"><i class="fa-duotone fa-location-dot" /> {{ shortAddress(b) }}</p>
          <p v-if="b.phone" class="br-card__phone"><i class="fa-duotone fa-phone" /> {{ b.phone }}</p>
        </div>

        <div class="br-card__foot">
          <button type="button" class="btn btn--ghost br-card__btn" @click="openView(b)">
            <i class="fa-duotone fa-eye" /> {{ t('common.view') }}
          </button>
          <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(b)">
            <i class="fa-duotone fa-pen" /> {{ t('common.edit') }}
          </button>
          <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(b)">
            <i class="fa-duotone fa-trash" /> {{ t('common.delete') }}
          </button>
        </div>
      </article>
    </div>

    <p v-if="!branches.length" class="ipf-class-empty">
      <i class="fa-duotone fa-building-circle-check" />
      {{
        t('branches.empty')
      }}
    </p>

    <!-- Form modal — only closes via ✕ / Cancel so edits are never lost -->
    <BaseModal
      v-if="showForm"
      :title="editingBranch ? t('branches.editTitle') : t('branches.addTitle')"
      wide
      :close-on-overlay="false"
      @close="showForm = false"
    >
      <BranchFormModal
        :branch="editingBranch"
        :main-exists="branches.some((b) => b.is_main)"
        @save="onSave"
        @close="showForm = false"
      />
    </BaseModal>

    <!-- View modal -->
    <BaseModal
      v-if="showPreview && previewBranch"
      :title="t('branches.detailsTitle')"
      wide
      @close="showPreview = false"
    >
      <BranchPreviewModal :branch="previewBranch" />
      <template #footer>
        <button type="button" class="btn btn--primary" @click="showPreview = false">
          <i class="fa-duotone fa-xmark" /> {{ t('common.close') }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>
