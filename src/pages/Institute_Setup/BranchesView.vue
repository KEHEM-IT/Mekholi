<!-- Institute Setup > Branches/Campus -->
<script setup lang="ts">
// Multi-campus management page — list of branch cards with add/edit/delete,
// beautiful View modal, and Excel export/import (same design language as
// the Institute Profile page).
import { computed, onMounted, ref } from 'vue'
import { useAppPreferences } from '@/composables/useAppPreferences'
import { useToast } from '@/composables/useToast'
import {
  fetchBranches,
  saveBranch,
  deleteBranch,
  type Branch,
} from '@/composables/useBranches'
import { exportBranchesToExcel, importBranchesFromExcel } from '@/composables/useBranchesExcel'
import BaseModal from '@/components/ui/BaseModal.vue'
import BranchFormModal from './BranchFormModal.vue'
import BranchPreviewModal from './BranchPreviewModal.vue'

defineOptions({ name: 'BranchesView' })

const { preferences } = useAppPreferences()
const isBn = computed(() => preferences.uiLanguage === 'bn')
const toast = useToast()

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

const t = (en: string, bn: string) => (isBn.value ? bn : en)

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
    toast.success(
      isBn.value
        ? branch.id
          ? 'শাখা আপডেট হয়েছে'
          : 'শাখা যোগ হয়েছে'
        : branch.id
          ? 'Branch updated'
          : 'Branch added',
    )
    showForm.value = false
    await load()
  } else {
    toast.error(isBn.value ? 'সংরক্ষণ ব্যর্থ — server.py চালু আছে কি?' : 'Save failed — is server.py running?')
  }
}

async function onDelete(branch: Branch) {
  if (!branch.id) return
  const ok = window.confirm(
    isBn.value
      ? `"${branch.branch_name}" শাখাটি মুছে ফেলবেন?`
      : `Delete branch "${branch.branch_name}"?`,
  )
  if (!ok) return
  const deleted = await deleteBranch(branch.id)
  if (deleted) {
    toast.success(isBn.value ? 'শাখা মুছে ফেলা হয়েছে' : 'Branch deleted')
    await load()
  } else {
    toast.error(isBn.value ? 'মুছে ফেলা ব্যর্থ হয়েছে' : 'Delete failed')
  }
}

// ── Excel ──────────────────────────────────────────────────────────────

function handleExport() {
  try {
    exportBranchesToExcel(branches.value)
    toast.success(isBn.value ? 'এক্সেল ডাউনলোড হয়েছে' : 'Excel downloaded')
  } catch (err) {
    toast.error(`Export failed: ${err instanceof Error ? err.message : 'unknown'}`)
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
      isBn.value
        ? `${imported.length}টি শাখা ইমপোর্ট হয়েছে${skipped.length ? ` (বাদ: ${skipped.length})` : ''}`
        : `${imported.length} branches imported${skipped.length ? ` (skipped: ${skipped.length})` : ''}`,
    )
    await load()
  } catch (err) {
    toast.error(
      isBn.value
        ? 'ইমপোর্ট ব্যর্থ হয়েছে — সঠিক ফাইল নির্বাচন করুন'
        : `Import failed: ${err instanceof Error ? err.message : 'invalid file'}`,
    )
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
  return parts.join(', ') || (isBn.value ? 'ঠিকানা নেই' : 'No address')
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
        <span v-for="m in 4" :key="m" class="skeleton ipf-skeleton__field" />
      </div>
    </div>
  </section>

  <section v-else class="ipf">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Branches / Campus', 'শাখা / ক্যাম্পাস') }}</h1>
        <p>{{ t('Manage your institute campuses — main branch, annexes and sub-campuses.', 'আপনার প্রতিষ্ঠানের ক্যাম্পাসগুলো পরিচালনা করুন — প্রধান শাখা, অ্যানেক্স ও সাব-ক্যাম্পাস।') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" @click="openAdd">
          <i class="fa-duotone fa-plus" /> {{ t('Add Branch', 'শাখা যোগ করুন') }}
        </button>
        <button type="button" class="btn ipf-header__export" @click="handleExport">
          <i class="fa-duotone fa-file-excel" /> {{ t('Export', 'এক্সপোর্ট') }}
        </button>
        <button type="button" class="btn ipf-header__import" :disabled="isImporting" @click="triggerImport">
          <i class="fa-duotone" :class="isImporting ? 'fa-spinner fa-spin' : 'fa-file-import'" />
          {{ t('Import', 'ইমপোর্ট') }}
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
                <i class="fa-duotone fa-star" /> {{ t('Main', 'প্রধান') }}
              </span>
              <span v-if="b.admission_open" class="br-chip br-chip--admission">
                {{ t('Admission Open', 'ভর্তি চলছে') }}
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
            <i class="fa-duotone fa-eye" /> {{ t('View', 'দেখুন') }}
          </button>
          <button type="button" class="btn btn--ghost br-card__btn" @click="openEdit(b)">
            <i class="fa-duotone fa-pen" /> {{ t('Edit', 'সম্পাদনা') }}
          </button>
          <button type="button" class="btn btn--ghost br-card__btn br-card__btn--danger" @click="onDelete(b)">
            <i class="fa-duotone fa-trash" /> {{ t('Delete', 'মুছুন') }}
          </button>
        </div>
      </article>
    </div>

    <p v-if="!branches.length" class="ipf-class-empty">
      <i class="fa-duotone fa-building-circle-check" />
      {{
        isBn
          ? 'এখনও কোনো শাখা যোগ করা হয়নি — উপরে "শাখা যোগ করুন" চাপুন'
          : 'No branches yet — press "Add Branch" above to create your first campus'
      }}
    </p>

    <!-- Form modal -->
    <BaseModal
      v-if="showForm"
      :title="editingBranch ? t('Edit Branch', 'শাখা সম্পাদনা') : t('Add Branch', 'শাখা যোগ করুন')"
      wide
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
      :title="t('Branch Details', 'শাখার বিবরণ')"
      wide
      @close="showPreview = false"
    >
      <BranchPreviewModal :branch="previewBranch" />
      <template #footer>
        <button type="button" class="btn btn--primary" @click="showPreview = false">
          <i class="fa-duotone fa-xmark" /> {{ t('Close', 'বন্ধ করুন') }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>
