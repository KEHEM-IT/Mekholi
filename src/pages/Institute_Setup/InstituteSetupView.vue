<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "@/components/ui/BaseButton.vue";
import { useAppPreferences } from "@/composables/useAppPreferences";
import { useInstituteProfile } from "@/composables/Institute_Setup/useInstituteProfile";
import { useInstituteSetupImport } from "@/composables/Institute_Setup/useInstituteSetupImport";
import { useToast } from "@/composables/useToast";
import type { SetupChecklistItem } from "@/types";

const { preferences } = useAppPreferences();
const { profile } = useInstituteProfile();
const router = useRouter();
const toast = useToast();

const isBn = computed(() => preferences.uiLanguage === "bn");

// --- Setup checklist --------------------------------------------------------
// Only "Profile & EIIN" is backed by a real page today; the rest of the
// blueprint's Institute Setup module (Academic Year/Structure, Grading,
// Holidays) isn't built yet, so those cards show as upcoming rather than
// linking anywhere or claiming to be "done".
const checklist = computed<SetupChecklistItem[]>(() => [
  {
    key: "profile",
    label: "Profile & EIIN",
    label_bn: "প্রোফাইল ও EIIN",
    icon: "fa-duotone fa-id-card",
    routeName: "institute-profile",
    isComplete: Boolean(profile.nameEn && profile.eiin),
  },
  {
    key: "academic-year",
    label: "Academic Year",
    label_bn: "শিক্ষাবর্ষ",
    icon: "fa-duotone fa-calendar-days",
    isComplete: false,
  },
  {
    key: "academic-structure",
    label: "Academic Structure",
    label_bn: "একাডেমিক কাঠামো",
    icon: "fa-duotone fa-sitemap",
    isComplete: false,
  },
  {
    key: "grading-scheme",
    label: "Grading Scheme",
    label_bn: "গ্রেডিং পদ্ধতি",
    icon: "fa-duotone fa-ranking-star",
    isComplete: false,
  },
  {
    key: "holidays",
    label: "Holidays",
    label_bn: "ছুটির তালিকা",
    icon: "fa-duotone fa-umbrella-beach",
    isComplete: false,
  },
]);

const completedCount = computed(() => checklist.value.filter((c) => c.isComplete).length);

function goTo(item: SetupChecklistItem) {
  if (item.routeName) router.push({ name: item.routeName });
}

// --- Excel import -----------------------------------------------------------
const {
  isParsing,
  isSaving,
  error: importError,
  parsed,
  recentImports,
  parseFile,
  saveAsJson,
  downloadAsJson,
  loadRecentImports,
  reset: resetImport,
} = useInstituteSetupImport();

onMounted(loadRecentImports);

const activeSheet = ref(0);
const savedFileName = ref("");
const isDragging = ref(false);

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  (event.target as HTMLInputElement).value = "";
  if (!file) return;
  activeSheet.value = 0;
  await parseFile(file);
  if (parsed.value) {
    savedFileName.value = parsed.value.sourceFileName.replace(/\.(xlsx|xls|csv)$/i, "");
  } else if (importError.value) {
    toast.error(importError.value);
  }
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  activeSheet.value = 0;
  parseFile(file).then(() => {
    if (parsed.value) {
      savedFileName.value = parsed.value.sourceFileName.replace(/\.(xlsx|xls|csv)$/i, "");
    } else if (importError.value) {
      toast.error(importError.value);
    }
  });
}

function chooseAnotherFile() {
  resetImport();
  savedFileName.value = "";
  activeSheet.value = 0;
}

async function handleSave() {
  if (!savedFileName.value.trim()) {
    toast.error(isBn.value ? "একটি ফাইলের নাম দিন" : "Enter a file name first");
    return;
  }
  const ok = await saveAsJson(savedFileName.value.trim());
  if (ok) {
    toast.success(
      isBn.value
        ? "JSON ফাইল হিসেবে সংরক্ষণ করা হয়েছে"
        : "Saved to src/assets/school as JSON",
    );
  } else if (importError.value) {
    toast.error(importError.value);
  }
}

function previewRows(rows: Record<string, unknown>[]) {
  return rows.slice(0, 8);
}

function columnsOf(rows: Record<string, unknown>[]) {
  return rows.length ? Object.keys(rows[0]) : [];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(isBn.value ? "bn-BD" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
</script>


<template>
  <section class="isc">
    <div class="isc-header">
      <h1>{{ isBn ? "প্রতিষ্ঠান সেটআপ" : "Institute Setup" }}</h1>
      <p>
        {{
          isBn
            ? "শিক্ষা প্রতিষ্ঠানের বুনিয়াদি কনফিগারেশন সম্পন্ন করুন - প্রোফাইল থেকে শুরু করে শিক্ষাবর্ষ, কাঠামো ও ছুটির তালিকা পর্যন্ত।"
            : "Complete your institution's foundational configuration - from profile through academic year, structure, and holidays."
        }}
      </p>
    </div>

    <!-- Setup checklist -->
    <div class="isc-section">
      <div class="isc-section__head">
        <div class="isc-section__title">
          <i class="fa-duotone fa-list-check" />
          <div>
            <h2>{{ isBn ? "সেটআপ চেকলিস্ট" : "Setup Checklist" }}</h2>
            <span>
              {{
                isBn
                  ? `${completedCount} / ${checklist.length} সম্পন্ন হয়েছে`
                  : `${completedCount} of ${checklist.length} completed`
              }}
            </span>
          </div>
        </div>

        <div
          class="isc-progress"
          role="progressbar"
          :aria-valuenow="completedCount"
          :aria-valuemin="0"
          :aria-valuemax="checklist.length"
        >
          <div
            class="isc-progress__bar"
            :style="{ width: `${(completedCount / checklist.length) * 100}%` }"
          />
        </div>
      </div>

      <div class="isc-checklist">
        <button
          v-for="item in checklist"
          :key="item.key"
          type="button"
          class="isc-check-card"
          :class="{
            'is-complete': item.isComplete,
            'is-linked': item.routeName,
            'is-upcoming': !item.routeName,
          }"
          :disabled="!item.routeName"
          @click="goTo(item)"
        >
          <span class="isc-check-card__icon">
            <i :class="item.icon" />
          </span>
          <span class="isc-check-card__label">{{ isBn ? item.label_bn : item.label }}</span>
          <span v-if="item.isComplete" class="isc-check-card__badge badge badge--success">
            <i class="fa-duotone fa-check" />
            {{ isBn ? "সম্পন্ন" : "Done" }}
          </span>
          <span v-else-if="item.routeName" class="isc-check-card__badge badge badge--warning">
            {{ isBn ? "বাকি আছে" : "Pending" }}
          </span>
          <span v-else class="isc-check-card__badge badge badge--info">
            {{ isBn ? "শীঘ্রই আসছে" : "Coming soon" }}
          </span>
        </button>
      </div>
    </div>

    <!-- Excel import -->
    <div class="isc-section">
      <div class="isc-section__head">
        <div class="isc-section__title">
          <i class="fa-duotone fa-file-excel" />
          <div>
            <h2>{{ isBn ? "এক্সেল থেকে ইম্পোর্ট" : "Import from Excel" }}</h2>
            <span>
              {{
                isBn
                  ? "একটি এক্সেল ফাইল আপলোড করুন এবং JSON হিসেবে সংরক্ষণ করুন"
                  : "Upload an Excel workbook and save it as JSON"
              }}
            </span>
          </div>
        </div>
      </div>

      <div class="isc-section__body">
        <div
          v-if="!parsed"
          class="isc-dropzone"
          :class="{ 'is-dragging': isDragging, 'is-busy': isParsing }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <i class="fa-duotone fa-cloud-arrow-up" />
          <p v-if="isParsing">{{ isBn ? "ফাইল পড়া হচ্ছে…" : "Reading file…" }}</p>
          <template v-else>
            <p>
              {{
                isBn
                  ? "এখানে .xlsx বা .xls ফাইল টেনে আনুন, অথবা"
                  : "Drag & drop an .xlsx or .xls file here, or"
              }}
            </p>
            <label class="isc-dropzone__browse">
              {{ isBn ? "ফাইল বেছে নিন" : "Browse file" }}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                class="isc-dropzone__input"
                @change="onFileChange"
              />
            </label>
          </template>
        </div>

        <p v-if="importError && !parsed" class="form-error">{{ importError }}</p>

        <template v-if="parsed">
          <div class="isc-import-meta">
            <div class="isc-import-meta__file">
              <i class="fa-duotone fa-file-spreadsheet" />
              <div>
                <strong>{{ parsed.sourceFileName }}</strong>
                <span>
                  {{ parsed.sheets.length }}
                  {{ isBn ? "শিট" : parsed.sheets.length === 1 ? "sheet" : "sheets" }}
                </span>
              </div>
            </div>
            <button type="button" class="isc-import-meta__clear" @click="chooseAnotherFile">
              <i class="fa-duotone fa-xmark" />
              {{ isBn ? "অন্য ফাইল বেছে নিন" : "Choose another file" }}
            </button>
          </div>

          <div v-if="parsed.sheets.length > 1" class="isc-tabs">
            <button
              v-for="(sheet, idx) in parsed.sheets"
              :key="sheet.name"
              type="button"
              class="isc-tab"
              :class="{ 'is-active': activeSheet === idx }"
              @click="activeSheet = idx"
            >
              {{ sheet.name }}
              <span class="isc-tab__count">{{ sheet.rows.length }}</span>
            </button>
          </div>

          <div v-if="parsed.sheets[activeSheet]" class="isc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th v-for="col in columnsOf(parsed.sheets[activeSheet].rows)" :key="col">
                    {{ col }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in previewRows(parsed.sheets[activeSheet].rows)" :key="idx">
                  <td v-for="col in columnsOf(parsed.sheets[activeSheet].rows)" :key="col">
                    {{ row[col] }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="parsed.sheets[activeSheet].rows.length > 8" class="isc-table-more">
              {{
                isBn
                  ? `+ আরও ${parsed.sheets[activeSheet].rows.length - 8} সারি`
                  : `+ ${parsed.sheets[activeSheet].rows.length - 8} more rows`
              }}
            </p>
          </div>

          <div class="isc-divider" />

          <div class="isc-save-row">
            <div class="form-field">
              <label>{{ isBn ? "ফাইলের নাম" : "File name" }}</label>
              <input v-model="savedFileName" type="text" placeholder="e.g. institute_students" />
              <span class="form-hint">
                {{
                  isBn
                    ? "src/assets/school/-এ .json হিসেবে সংরক্ষিত হবে"
                    : "Will be saved as .json under src/assets/school/"
                }}
              </span>
            </div>
            <div class="isc-save-row__actions">
              <BaseButton
                variant="secondary"
                type="button"
                :disabled="isSaving"
                @click="downloadAsJson(savedFileName || parsed.sourceFileName)"
              >
                <i class="fa-duotone fa-download" />
                {{ isBn ? "ডাউনলোড" : "Download" }}
              </BaseButton>
              <BaseButton variant="primary" type="button" :disabled="isSaving" @click="handleSave">
                <i v-if="isSaving" class="fa-duotone fa-spinner-third fa-spin" />
                <i v-else class="fa-duotone fa-floppy-disk" />
                {{ isBn ? "JSON হিসেবে সংরক্ষণ করুন" : "Save as JSON" }}
              </BaseButton>
            </div>
          </div>

          <p v-if="importError" class="form-error">{{ importError }}</p>
        </template>

        <div v-if="recentImports.length" class="isc-divider" />

        <div v-if="recentImports.length" class="isc-recent">
          <p class="isc-subhead">{{ isBn ? "সাম্প্রতিক ইম্পোর্ট" : "Recent imports" }}</p>
          <ul class="isc-recent__list">
            <li v-for="file in recentImports" :key="file.name" class="isc-recent__item">
              <i class="fa-duotone fa-file-code" />
              <span class="isc-recent__name">{{ file.name }}</span>
              <span class="isc-recent__meta">
                {{ formatDate(file.savedAt) }} · {{ formatBytes(file.size) }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
