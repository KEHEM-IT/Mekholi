<!-- D:\Web\ERP\Mekholi\src\pages\Institute_Setup\Index.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppPreferences } from '@/composables/useAppPreferences'
import { useDragScroll } from '@/composables/useDragScroll'
import { profileProgress } from '@/composables/Institute_Setup/useInstituteProfile'
import {
  TABLE_TABS,
  formatBytes,
  useInstituteSetupImport,
} from '@/composables/Institute_Setup/useInstituteSetupImport'
import navigationJson from '@/assets/navigation/shikkha_erp_navigation.json'
import type { NavigationMap } from '@/types'

// Explicit multi-word component name to satisfy the linter (filename is
// single-word "Index.vue" per pages/Institute_Setup/ convention).
defineOptions({ name: 'InstituteDashboard' })

const router = useRouter()
const { preferences } = useAppPreferences()
const isBn = computed(() => preferences.uiLanguage === 'bn')

// Skeleton loader — the dashboard shows a shimmer skeleton for at least
// 2s on mount, matching the Institute Profile page behaviour.
const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, MIN_SKELETON_MS))
  isPageLoading.value = false
})

const {
  school,
  fileName,
  fileSize,
  isDragging,
  isBusy,
  isSaving,
  errorMessage,
  activeTab,
  activeRows,
  activeColumns,
  onDrop,
  onFileInputChange,
  clear,
  saveAs,
} = useInstituteSetupImport()

// Setup checklist mirrors the other "Institute Setup" sub-menus from the
// nav JSON (everything after this dashboard itself), so it stays in sync
// automatically as more of them get real pages behind them.
const navigation = navigationJson.shikkha_erp_navigation as unknown as NavigationMap
const checklistSteps = computed(
  () => navigation.institute_admin?.find((m) => m.menu === 'Institute Setup')?.sub_menus.slice(1) ?? [],
)

// Map nav step names to Vue Router route names + progress percentages.
const STEP_ROUTES: Record<string, string> = {
  // Maps each checklist step name (from the nav JSON) to its route name.
  'Institute Dashboard': 'institute-setup',
  'Institute Profile': 'institute-profile',
  'Branches/Campus': 'institute-setup-branches',
  'Academic Year': 'institute-setup-academic-year',
  'Class/Section/Group/Shift': 'institute-setup-classes',
  'Holidays & Working Days': 'institute-setup-holidays',
  'Grading Scheme': 'institute-setup-grading',
  'Board & Regulatory Setup': 'institute-setup-boards',
  'Subjects & Curriculum': 'institute-setup-subjects',
  'Exam Terms & Types': 'institute-setup-exam-terms',
  'Classrooms / Rooms / Buildings': 'institute-setup-rooms',
  'Academic Sessions & Terms': 'institute-setup-sessions',
}

/** Per-step progress pct — each step maps to its own data source.
 *  Only Institute Profile has real data today; more will join as pages
 *  get built and their JSON sources are registered here. */
const STEP_PCTS: Record<string, () => number> = {
  'Institute Profile': () => profileProgress.value.pct,
}

/** Pick a fill color for the vertical bar based on completion percentage. */
function barColor(pct: number): string {
  if (pct >= 67) return '#22c55e'
  if (pct >= 34) return '#eab308'
  return '#ef4444'
}

function stepHasRoute(name: string) {
  return STEP_ROUTES[name] != null
}

function goToStep(name: string) {
  const route = STEP_ROUTES[name]
  if (route) router.push({ name: route })
}

const saveName = ref('')

function tabRowCount(key: (typeof TABLE_TABS)[number]['key']) {
  if (key === 'general_info') {
    const info = school.value?.general_info
    if (!info) return 0
    let count = 0
    const walk = (obj: Record<string, unknown>) => {
      for (const v of Object.values(obj)) {
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          walk(v as Record<string, unknown>)
        } else {
          count++
        }
      }
    }
    walk(info as unknown as Record<string, unknown>)
    return count
  }
  const rows = school.value?.[key]
  return Array.isArray(rows) ? rows.length : 0
}

async function handleSave() {
  await saveAs(saveName.value)
}

// Click-and-drag panning for the tab strip - see useDragScroll for the
// shared logic.
const {
  elRef: tabsRef,
  isDragging: isDraggingTabs,
  onMouseDown: onTabsMouseDown,
} = useDragScroll<HTMLDivElement>()
</script>

<template>
  <!-- ── Skeleton loader (min 2s) ─────────────────────── -->
  <section v-if="isPageLoading" class="isc-skeleton" aria-busy="true" aria-label="Loading institute dashboard">
    <div class="isc-skeleton__header">
      <span class="skeleton isc-skeleton__title" />
      <span class="skeleton isc-skeleton__subtitle" />
    </div>

    <div class="isc-skeleton__section">
      <div class="isc-skeleton__section-head">
        <div>
          <span class="skeleton isc-skeleton__section-title" />
          <span class="skeleton isc-skeleton__section-sub" />
        </div>
        <span class="skeleton isc-skeleton__progress" />
      </div>
      <div class="isc-skeleton__cards">
        <span v-for="n in 4" :key="n" class="skeleton isc-skeleton__card" />
      </div>
    </div>

    <div class="isc-skeleton__section">
      <div class="isc-skeleton__section-head">
        <div>
          <span class="skeleton isc-skeleton__section-title" />
          <span class="skeleton isc-skeleton__section-sub" />
        </div>
      </div>
      <span class="skeleton isc-skeleton__dropzone" />
    </div>
  </section>

  <section v-else class="isc">
    <header class="isc-header">
      <h1>{{ isBn ? 'ইনস্টিটিউট ড্যাশবোর্ড' : 'Institute Dashboard' }}</h1>
      <p>
        {{
          isBn
            ? 'আপনার প্রতিষ্ঠানের সেটআপ অগ্রগতি দেখুন এবং সরকারি ইএমআইএস ওয়ার্কবুক থেকে তথ্য আমদানি করুন।'
            : 'Track your institute setup progress and import data from a government EMIS workbook.'
        }}
      </p>
    </header>

    <!-- Setup checklist -->
    <div class="isc-section">
      <div class="isc-section__head">
        <div class="isc-section__title">
          <i class="fa-duotone fa-list-check" />
          <div>
            <h2>{{ isBn ? 'সেটআপ চেকলিস্ট' : 'Setup checklist' }}</h2>
            <span>{{
              isBn
                ? 'এই ধাপগুলো একে একে সম্পন্ন করুন'
                : 'Work through these to finish setting up your institute'
            }}</span>
          </div>
        </div>
      </div>

      <div class="isc-section__body">
        <div class="isc-checklist">
          <button
            v-for="step in checklistSteps"
            :key="step.name"
            type="button"
            class="isc-check-card"
            :class="{
              'is-active': stepHasRoute(step.name),
              'is-upcoming': !stepHasRoute(step.name),
            }"
            :disabled="!stepHasRoute(step.name)"
            @click="goToStep(step.name)"
          >
            <span class="isc-check-card__icon"><i :class="step.icon" /></span>
            <span class="isc-check-card__label">{{ isBn ? step.name_bn : step.name }}</span>
            <span class="isc-check-card__pct">{{ (STEP_PCTS[step.name]?.() ?? 0) }}%</span>
            <!-- Vertical progress bar on the right edge -->
            <div class="isc-check-card__bar">
              <div
                class="isc-check-card__bar-fill"
                :style="{
                  height: (STEP_PCTS[step.name]?.() ?? 0) + '%',
                  background: barColor(STEP_PCTS[step.name]?.() ?? 0),
                }"
              />
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- EMIS data import -->
    <div class="isc-section">
      <div class="isc-section__head">
        <div class="isc-section__title">
          <i class="fa-duotone fa-file-import" />
          <div>
            <h2>{{ isBn ? 'ইএমআইএস তথ্য আমদানি' : 'EMIS data import' }}</h2>
            <span>{{
              isBn
                ? 'সরকারি ইএমআইএস ওয়ার্কবুক (মার্কডাউন/জেএসওএন) থেকে প্রতিষ্ঠানের তথ্য আমদানি করুন'
                : 'Import institute data from a government EMIS workbook export (Markdown/JSON)'
            }}</span>
          </div>
        </div>
      </div>

      <div class="isc-section__body">
        <div
          class="isc-dropzone"
          :class="{ 'is-dragging': isDragging, 'is-busy': isBusy }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop="onDrop"
        >
          <i class="fa-duotone fa-cloud-arrow-up" />
          <p>
            {{ isBn ? 'ফাইল টেনে আনুন অথবা' : 'Drag a file here, or' }}
          </p>

            <span class="isc-dropzone__browse">
              {{ isBn ? 'ব্রাউজ করুন' : 'Browse' }}
              <input
                type="file"
                class="isc-dropzone__input"
                accept=".md,.txt,.json"
                aria-label="Upload EMIS workbook"
                @change="onFileInputChange"
              />
            </span>
          <span class="isc-dropzone__hint">{{ isBn ? 'গ্রহণযোগ্য: .md, .json' : 'Accepted: .md, .json' }}</span>
        </div>

        <p v-if="errorMessage" class="isc-error">{{ errorMessage }}</p>

        <template v-if="school">
          <div class="isc-import-meta">
            <div class="isc-import-meta__file">
              <i class="fa-duotone fa-file-lines" />
              <div>
                <strong>{{ fileName }}</strong>
                <span>{{ formatBytes(fileSize) }}</span>
              </div>
            </div>
            <button type="button" class="isc-import-meta__clear" @click="clear">
              <i class="fa-duotone fa-xmark" />
              {{ isBn ? 'সাফ করুন' : 'Clear' }}
            </button>
          </div>

          <div class="isc-divider" />

          <div class="isc-subhead">
            {{ isBn ? 'প্রতিষ্ঠান সংক্ষিপ্ত তথ্য' : 'Institute summary' }}
          </div>
          <p>
            <strong>{{ isBn ? school.general_info.institute_name_bn : school.general_info.institute_name_en }}</strong>
            <template v-if="school.general_info.classification.institute_type">
              &mdash; {{ school.general_info.classification.institute_type }}
            </template>
          </p>

          <div
            ref="tabsRef"
            class="isc-tabs"
            :class="{ 'is-drag-scrolling': isDraggingTabs }"
            @mousedown="onTabsMouseDown"
          >
            <button
              v-for="tab in TABLE_TABS"
              :key="tab.key"
              type="button"
              class="isc-tab"
              :class="{ 'is-active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ isBn ? tab.label_bn : tab.label }}
              <span class="isc-tab__count">{{ tabRowCount(tab.key) }}</span>
            </button>
          </div>

          <div class="isc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th v-for="col in activeColumns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in activeRows" :key="i">
                  <td v-for="col in activeColumns" :key="col">{{ row[col] ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!activeRows.length" class="isc-table-more">
              {{ isBn ? 'এই বিভাগে কোনো তথ্য নেই' : 'No rows in this section' }}
            </p>
          </div>

          <div class="isc-save-row">
            <div class="form-field">
              <label>{{ isBn ? 'সংরক্ষণের নাম (EIIN)' : 'Save as (EIIN)' }}</label>
              <input
                v-model="saveName"
                type="text"
                :placeholder="isBn ? 'যেমন: 129332' : 'e.g. 129332'"
              />
            </div>
            <div class="isc-save-row__actions">
              <button
                type="button"
                class="btn btn--primary"
                :disabled="isSaving || !saveName.trim()"
                @click="handleSave"
              >
                <i class="fa-duotone fa-floppy-disk" />
                {{
                  isSaving
                    ? isBn
                      ? 'সংরক্ষণ হচ্ছে...'
                      : 'Saving...'
                    : isBn
                      ? 'JSON হিসেবে সংরক্ষণ করুন'
                      : 'Save as JSON'
                }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
