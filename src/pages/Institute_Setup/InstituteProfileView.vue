<!-- Institute Setup > Institute Profile -->
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useAppPreferences } from "@/composables/useAppPreferences";
import { useShortcutKeySet } from "@/composables/shortcut_key_set";
import { isSaving, saveProfile, loadProfile } from "@/composables/useInstituteProfile";
import { useToast } from "@/composables/useToast";
import { uploadToImgbb, validateLogoFile } from "@/composables/useImgbbUpload";
import { useFormDirtyGuard } from "@/composables/useFormDirtyGuard";
import {
  exportProfileToExcel,
  importProfileFromExcel,
} from "@/composables/useInstituteProfileExcel";
import BaseCombobox from "@/components/ui/BaseCombobox.vue";
import BaseDatePicker from "@/components/ui/BaseDatePicker.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import InstituteProfilePreviewModal from "./InstituteProfilePreviewModal.vue";
import { FACILITY_ICONS, FACILITY_HELP } from "./facilityMeta";
import banksJson from "@/assets/jsons/banks.json";
import gendersJson from "@/assets/jsons/genders.json";
import committeePositionsJson from "@/assets/jsons/committee_positions.json";
import parliamentarySeatsJson from "@/assets/jsons/parliamentary_seat.json";
import instituteTypesJson from "@/assets/jsons/institute_types.json";
import groupsJson from "@/assets/jsons/groups.json";
import studentTypesJson from "@/assets/jsons/student_types.json";
import shiftCountsJson from "@/assets/jsons/shift_counts.json";
import accountTypesJson from "@/assets/jsons/account_types.json";
import accountPurposesJson from "@/assets/jsons/account_purposes.json";
import {
  BD_GEO_DIVISIONS,
  districtsByDivisionId,
  upazilasByDistrictId,
  unionsByUpazilaId,
} from "@/utils/bdGeo";

defineOptions({ name: "InstituteProfile" });

const { preferences } = useAppPreferences();
const isBn = computed(() => preferences.uiLanguage === "bn");

// Bilingual tooltip helper — returns the text for the active UI language.
function t(en: string, bn: string): string {
  return isBn.value ? bn : en;
}

// ── Constants / Option lists ──────────────────────────────────────────────

const MANAGEMENTS = [
  "Autonomous - স্বায়িত্বশাসিত",
  "Govt. - সরকারি",
  "Local Govt. - স্থানীয় সরকার",
  "Non-Govt. - বেসরকারি",
  "Others - অন্যান্য",
];

const DP_DIGITS = { maxlength: 10 };
const MAX3 = { maxlength: 3 };

// ── Form State ────────────────────────────────────────────────────────────

const form = reactive({
  // Identity
  institute_logo: "" as string,
  institute_name_bn: "" as string,
  institute_name_en: "" as string,
  founder_name: "" as string,
  establishment_date: "" as string,
  parliamentary_constituency: "" as string,

  // Address
  division_id: "" as string,
  district_id: "" as string,
  upazila_id: "" as string,
  union_id: "" as string,
  village_road_holding_no: "" as string,
  post_office: "" as string,
  post_code: null as number | null,

  // Contact
  institute_phone: "" as string,
  institute_email: "" as string,
  website: "" as string,

  // Classification
  institute_type: "" as string,
  attached_technical_branch_type: "" as string,
  group: "" as string,
  student_type: "" as string,
  shift_count: "" as string,
  has_english_version: false as boolean,
  management: "" as string,

  // Identifiers
  eiin: "" as string,
  board_institute_code: "" as string,
  technical_board_code: "" as string,
  mpo_code: "" as string,
  technical_branch_mpo_code: "" as string,
  stipend_code: "" as string,

  // MPO Status
  general_mpo: false as boolean,
  general_mpo_code: "" as string,
  tech_mpo: false as boolean,
  tech_mpo_code: "" as string,

  // Staff
  staff_male: null as number | null,
  staff_female: null as number | null,
  staff_mpo_male: null as number | null,
  staff_mpo_female: null as number | null,
  staff_nonmpo_male: null as number | null,
  staff_nonmpo_female: null as number | null,

  // MPO Info
  secondary_mpo_date: "" as string,
  secondary_mpo_code: "" as string,
  higher_secondary_mpo_date: "" as string,
  higher_secondary_mpo_code: "" as string,

  // Bank Account (single)
  bank_name: "" as string,
  bank_branch: "" as string,
  bank_account_type: "" as string,
  bank_account_holder: "" as string,
  bank_account_number: "" as string,
  bank_account_purpose: "" as string,

  // Committee Members
  committee_members: [] as {
    member_name: string;
    joining_date: string;
    phone: string;
    gender: string;
    committee_position: string;
    education_qualification: string;
    occupation: string;
    left_committee: boolean;
    reason_for_leaving: string;
  }[],

  // Facilities
  facilities: {
    play_ground: false,
    electricity: false,
    tubewell: false,
    tap: false,
    transport: false,
    auditorium: false,
    gas: false,
    canteen: false,
    audio_sound: false,
    health_aid: false,
    gymnasium: false,
    audio_visual: false,
    television: false,
    boundary_wall: false,
    solar_panel: false,
  } as Record<string, boolean>,
});

// ── BD Geo derived ────────────────────────────────────────────────────────

const geoDivisionOptions = computed(() => BD_GEO_DIVISIONS);
const geoDistrictOptions = computed(() =>
  form.division_id ? districtsByDivisionId(form.division_id) : [],
);
const geoUpazilaOptions = computed(() =>
  form.district_id ? upazilasByDistrictId(form.district_id) : [],
);
const geoUnionOptions = computed(() => (form.upazila_id ? unionsByUpazilaId(form.upazila_id) : []));

// ── Conditional MPO info ──────────────────────────────────────────────────

const showHigherSecondaryMpo = computed(() => {
  const n = (form.institute_name_en + form.institute_name_bn).toLowerCase();
  return n.includes("college");
});

// Live total of staff — sum of the two "Currently Working" fields only
// (Male + Female), not the MPO breakdown rows.
const staffTotal = computed(() =>
  [form.staff_male, form.staff_female].reduce<number>(
    (sum, n) => sum + (Number(n) || 0),
    0,
  ),
);

// Staff count fields: a 0 means "nothing entered" — keep the field empty so
// the placeholder shows instead of a stale 0.
const STAFF_KEYS = [
  "staff_male",
  "staff_female",
  "staff_mpo_male",
  "staff_mpo_female",
  "staff_nonmpo_male",
  "staff_nonmpo_female",
];

function isStaffKey(key: string): boolean {
  return STAFF_KEYS.includes(key);
}

/** Called on input of any staff field — clears the value when it's 0. */
function onStaffInput(key: string) {
  const current = (form as Record<string, unknown>)[key];
  if (Number(current) === 0) {
    (form as Record<string, unknown>)[key] = null;
  }
}

// While restoring a saved profile we must NOT run the geo cascade resets —
// the watchers below would otherwise clear the loaded child selections
// (district / upazila / union) the moment division_id is assigned.
let isRestoringProfile = false;

// Unsaved-changes guard: toasts when the form becomes dirty, warns on
// tab close / reload, and lets handleSave skip DB writes when nothing changed.
const dirtyGuard = useFormDirtyGuard(form, {
  isRestoring: () => isRestoringProfile,
  dirtyToast: isBn.value
    ? "অসংরক্ষিত পরিবর্তন আছে — ছাড়ার আগে সংরক্ষণ করুন"
    : "You have unsaved changes — save before leaving",
});

watch(
  () => form.division_id,
  () => {
    if (isRestoringProfile) return;
    form.district_id = "";
    form.upazila_id = "";
    form.union_id = "";
  },
);
watch(
  () => form.district_id,
  () => {
    if (isRestoringProfile) return;
    form.upazila_id = "";
    form.union_id = "";
  },
);
watch(
  () => form.upazila_id,
  () => {
    if (isRestoringProfile) return;
    form.union_id = "";
  },
);

// ── Combobox-as-array helpers ─────────────────────────────────────────────

function comboOptions(items: string[]) {
  return items.map((v) => ({ Id: v, LookupText: v }));
}

// Scheduled banks of Bangladesh (English + Bangla) from assets/jsons/banks.json
const BANK_OPTIONS = banksJson;

// Bilingual option lists (English + Bangla) from assets/jsons
const INSTITUTE_TYPE_OPTIONS = instituteTypesJson;
const GROUP_OPTIONS = groupsJson;
const STUDENT_TYPE_OPTIONS = studentTypesJson;
const SHIFT_COUNT_OPTIONS = shiftCountsJson;
const ACCOUNT_TYPE_OPTIONS = accountTypesJson;
const ACCOUNT_PURPOSE_OPTIONS = accountPurposesJson;

// Committee member gender options (English + Bangla)
const GENDER_OPTIONS = gendersJson;

// Committee member position options (English + Bangla), "Others" last
const COMMITTEE_POSITION_OPTIONS = committeePositionsJson;

// Parliamentary constituencies of Bangladesh (300 seats, English + Bangla)
const PARLIAMENTARY_SEAT_OPTIONS = parliamentarySeatsJson;

// ── Save ──────────────────────────────────────────────────────────────────

// ── Institute Logo (ImgBB upload) ───────────────────────────────────────

/** Keep only digits in numeric-only inputs (codes, phones, account numbers).
 *  Fields stay type="text" so leading zeros are preserved in the stored
 *  string, but anything non-numeric is stripped as the user types/pastes. */
function onDigitsOnly(event: Event) {
  const el = event.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, "");
  if (el.value !== digits) el.value = digits;
}

const toast = useToast();
const isUploadingLogo = ref(false);
const isDraggingLogo = ref(false);
const logoInput = ref<HTMLInputElement | null>(null);
const showPreview = ref(false);
const excelInput = ref<HTMLInputElement | null>(null);
const isImportingExcel = ref(false);

function triggerLogoPick() {
  if (!isUploadingLogo.value) logoInput.value?.click();
}

async function uploadLogoFile(file: File) {
  const validationError = validateLogoFile(file);
  if (validationError) {
    toast.error(validationError);
    return;
  }

  isUploadingLogo.value = true;
  try {
    const url = await uploadToImgbb(file);
    form.institute_logo = url;
    // Persist right away so the logo survives a page reload without
    // requiring the user to press Ctrl+S afterwards.
    const saved = await saveProfile({ ...form });
    if (saved) {
      dirtyGuard.markClean();
      toast.success(isBn.value ? "লোগো আপলোড ও সংরক্ষিত হয়েছে" : "Logo uploaded & saved");
    } else {
      toast.error(
        isBn.value
          ? "লোগো আপলোড হয়েছে কিন্তু সংরক্ষণ ব্যর্থ — server.py চালু আছে কি?"
          : "Logo uploaded but could not save — is server.py running?",
      );
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Logo upload failed");
  } finally {
    isUploadingLogo.value = false;
  }
}

function onLogoFilePicked(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // allow re-selecting the same file
  if (file) void uploadLogoFile(file);
}

function onLogoDragOver(event: DragEvent) {  if (isUploadingLogo.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  isDraggingLogo.value = true;
}

function onLogoDragLeave(event: DragEvent) {
  // Ignore leave events fired while moving between child elements.
  if (!event.currentTarget || event.relatedTarget === event.currentTarget) return;
  isDraggingLogo.value = false;
}

function onLogoDrop(event: DragEvent) {
  event.preventDefault();
  isDraggingLogo.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) void uploadLogoFile(file);
}

function removeLogo() {
  form.institute_logo = "";
}

// ── Excel Export / Import ───────────────────────────────────────────────

function handleExportExcel() {
  try {
    exportProfileToExcel({ ...form });
    toast.success(isBn.value ? "এক্সেল ফাইল ডাউনলোড হয়েছে" : "Excel file downloaded");
  } catch (err) {
    toast.error(
      isBn.value
        ? "এক্সেল এক্সপোর্ট ব্যর্থ হয়েছে"
        : `Export failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
}

function triggerExcelImport() {
  if (!isImportingExcel.value) excelInput.value?.click();
}

async function onExcelImportPicked(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // allow re-selecting the same file
  if (!file) return;

  isImportingExcel.value = true;
  try {
    const { profile, facilities, committee_members, skipped } = await importProfileFromExcel(file);

    // Apply without triggering the geo cascade resets (division changes
    // would otherwise clear district/upazila/union).
    isRestoringProfile = true;
    for (const [key, value] of Object.entries(profile)) {
      (form as Record<string, unknown>)[key] = value;
    }
    if (Object.keys(facilities).length) {
      Object.assign(form.facilities, facilities);
    }
    if (committee_members.length) {
      form.committee_members = committee_members as typeof form.committee_members;
    }
    await nextTick();
    isRestoringProfile = false;

    toast.success(
      isBn.value
        ? `এক্সেল ইমপোর্ট হয়েছে — পর্যালোচনা করে সংরক্ষণ করুন${skipped.length ? ` (বাদ পড়েছে: ${skipped.length})` : ""}`
        : `Excel imported — review & save${skipped.length ? ` (skipped: ${skipped.length})` : ""}`,
    );
    if (skipped.length) {
      toast.warning(
        isBn.value
          ? `অজানা কলাম বাদ পড়েছে: ${skipped.slice(0, 5).join(", ")}`
          : `Unknown columns skipped: ${skipped.slice(0, 5).join(", ")}`,
      );
    }
  } catch (err) {
    toast.error(
      isBn.value
        ? "এক্সেল ইমপোর্ট ব্যর্থ হয়েছে — সঠিক ফাইলটি নির্বাচন করুন"
        : `Import failed: ${err instanceof Error ? err.message : "invalid Excel file"}`,
    );
  } finally {
    isImportingExcel.value = false;
  }
}

// ── Save / Load ───────────────────────────────────────────────────────

async function handleSave() {
  // Do not write to the DB when nothing changed — just inform the user.
  if (!dirtyGuard.hasChanges()) {
    toast.info(isBn.value ? "সংরক্ষণের কোনো নতুন পরিবর্তন নেই" : "No changes to save");
    return;
  }
  const saved = await saveProfile({ ...form });
  if (saved) {
    dirtyGuard.markClean();
    toast.success(isBn.value ? "সংরক্ষিত হয়েছে" : "Saved");
  } else {
    toast.error(
      isBn.value
        ? "সংরক্ষণ ব্যর্থ হয়েছে — server.py চালু আছে কি?"
        : "Save failed — is server.py running?",
    );
  }
}

// Warn before leaving the page (SPA navigation) with unsaved changes.
onBeforeRouteLeave(() => {
  if (!dirtyGuard.isDirty.value) return true;
  const leave = window.confirm(
    isBn.value
      ? "আপনার অসংরক্ষিত পরিবর্তন আছে। তবুও কি পেজ ছেড়ে যাবেন?"
      : "You have unsaved changes. Leave anyway?",
  );
  return leave;
});

// Try loading from SQLite on mount; stays empty if server not running
onMounted(async () => {
  const data = (await loadProfile()) as Partial<typeof form> | null;
  if (data) {
    // Suppress the geo cascade watchers while restoring — otherwise the
    // division change would wipe the loaded district / upazila / union.
    isRestoringProfile = true;
    // Object.keys returns string[]; narrow to keys of form to satisfy TypeScript
    const keys = Object.keys(form) as (keyof typeof form)[];
    for (const key of keys) {
      if (key in data) {
        // Facilities: merge over the form's default 15 keys instead of
        // replacing the whole object — the API may return a partial/empty
        // set (older client saved without facilities) and we must keep
        // all toggles available.
        if (key === "facilities" && typeof data[key] === "object" && data[key] !== null) {
          Object.assign(form.facilities, data[key]);
          continue;
        }
        // Staff counts: a stored 0 means "none entered" — keep the field
        // empty (placeholder visible) instead of showing a stale 0.
        if (isStaffKey(key) && Number(data[key]) === 0) {
          (form as Record<keyof typeof form, unknown>)[key] = null;
          continue;
        }
        // Assign values from loaded partial data
        // Index via Record<..., unknown> to avoid any-casts
        (form as Record<keyof typeof form, unknown>)[key] = data[key];
      }
    }
    // Let queued watchers run (they no-op via the flag), then restore behavior
    await nextTick();
    isRestoringProfile = false;
    // Loaded state = clean baseline for the unsaved-changes guard
    dirtyGuard.markClean();
  }
});

// ── Shortcuts ─────────────────────────────────────────────────────────────

useShortcutKeySet([{ key: "s", ctrl: true, handler: () => handleSave() }]);

// ── Committee add/remove ────────────────────────────────────────────────

function addCommittee() {
  form.committee_members.push({
    member_name: "",
    joining_date: "",
    phone: "",
    gender: "",
    committee_position: "",
    education_qualification: "",
    occupation: "",
    left_committee: false,
    reason_for_leaving: "",
  });
}
function removeCommittee(i: number) {
  form.committee_members.splice(i, 1);
}
</script>

<template>
  <section class="ipf">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ isBn ? "ইনস্টিটিউট প্রোফাইল" : "Institute Profile" }}</h1>
        <p>
          {{ isBn ? "আপনার প্রতিষ্ঠানের তথ্য সম্পাদনা করুন।" : "Edit your institute information." }}
        </p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary ipf-header__view" @click="showPreview = true">
          <i class="fa-duotone fa-eye" />
          {{ isBn ? "দেখুন" : "View" }}
        </button>
        <button
          type="button"
          class="btn ipf-header__export"
          :title="isBn ? 'এক্সেলে ডাউনলোড করুন' : 'Export to Excel'"
          @click="handleExportExcel"
        >
          <i class="fa-duotone fa-file-excel" />
          {{ isBn ? "এক্সপোর্ট" : "Export" }}
        </button>
        <button
          type="button"
          class="btn ipf-header__import"
          :disabled="isImportingExcel"
          :title="isBn ? 'এক্সেল ফাইল থেকে ইমপোর্ট করুন' : 'Import from Excel'"
          @click="triggerExcelImport"
        >
          <i class="fa-duotone" :class="isImportingExcel ? 'fa-spinner fa-spin' : 'fa-file-import'" />
          {{ isBn ? "ইমপোর্ট" : "Import" }}
        </button>
      </div>
      <input
        ref="excelInput"
        type="file"
        accept=".xlsx,.xls"
        class="ipf-logo__input"
        @change="onExcelImportPicked"
      />
    </header>

    <div class="ipf-main">
      <!-- ── 1. Identity ──────────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-id-card" />
            <div>
              <h2>{{ isBn ? "পরিচয়" : "Identity" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <!-- Institute Logo -->
          <div class="form-field">
            <label>{{ isBn ? "প্রতিষ্ঠানের লোগো" : "Institute Logo" }}</label>
            <div
              class="ipf-logo"
              :class="{
                'is-uploading': isUploadingLogo,
                'is-dragging': isDraggingLogo && !isUploadingLogo,
              }"
              :title="t(
                'Click or drag & drop to upload the institute logo (PNG, JPG, WEBP, GIF - max 5 MB)',
                'লোগো আপলোড করতে ক্লিক করুন বা ছবি ড্র্যাগ করুন (PNG, JPG, WEBP, GIF - সর্বোচ্চ ৫ MB)',
              )"
              @click="triggerLogoPick"
              @keydown.enter="triggerLogoPick"
              @dragover.prevent="onLogoDragOver"
              @dragenter.prevent="isDraggingLogo = true"
              @dragleave="onLogoDragLeave"
              @drop.prevent="onLogoDrop"
              role="button"
              tabindex="0"
            >
              <img
                v-if="form.institute_logo && !isUploadingLogo && !isDraggingLogo"
                :src="form.institute_logo"
                alt="Institute logo"
                class="ipf-logo__preview"
              />
              <i
                v-else-if="isUploadingLogo"
                class="fa-duotone fa-spinner fa-spin ipf-logo__icon"
              />
              <i v-else-if="isDraggingLogo" class="fa-duotone fa-down-to-bracket ipf-logo__icon" />
              <i v-else class="fa-duotone fa-cloud-arrow-up ipf-logo__icon" />
              <div class="ipf-logo__text">
                <template v-if="isUploadingLogo">
                  {{ isBn ? "আপলোড হচ্ছে..." : "Uploading..." }}
                </template>
                <template v-else-if="isDraggingLogo">
                  {{ isBn ? "লোগো এখানে ছেড়ে দিন" : "Drop the image here" }}
                </template>
                <template v-else-if="form.institute_logo">
                  {{ isBn ? "লোগো পরিবর্তন করতে ক্লিক বা ড্র্যাগ করুন" : "Click or drag to replace logo" }}
                </template>
                <template v-else>
                  {{ isBn ? "ক্লিক করুন অথবা ছবি এখানে ড্র্যাগ করুন" : "Click or drag & drop an image here" }}
                </template>
                <small>{{
                  isBn
                    ? "PNG, JPG, WEBP বা GIF — সর্বোচ্চ ৫ MB"
                    : "PNG, JPG, WEBP or GIF — max 5 MB"
                }}</small>
              </div>
              <span
                v-if="form.institute_logo && !isUploadingLogo && !isDraggingLogo"
                class="ipf-logo__remove"
                role="button"
                tabindex="-1"
                :aria-label="isBn ? 'লোগো মুছুন' : 'Remove logo'"
                @click.stop="removeLogo"
              >
                &#10005;
              </span>
            </div>
            <input
              ref="logoInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              class="ipf-logo__input"
              @change="onLogoFilePicked"
            />
          </div>
          <div class="ipf-grid">
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠানের নাম (বাংলায়)" : "Institute Name (Bangla)" }}</label
              ><input v-model="form.institute_name_bn" type="text"  :title="t('Institute name in Bangla - e.g. Sofir Uddin High School and College', 'প্রতিষ্ঠানের নাম বাংলায় লিখুন - যেমন: সোফির উদ্দিন উচ্চ বিদ্যালয় এন্ড কলেজ')"  :placeholder="t('Institute name in Bangla - e.g. Sofir Uddin High School and College', 'প্রতিষ্ঠানের নাম বাংলায় লিখুন - যেমন: সোফির উদ্দিন উচ্চ বিদ্যালয় এন্ড কলেজ')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠানের নাম (ইংরেজি)" : "Institute Name (English)" }}</label
              ><input v-model="form.institute_name_en" type="text"  :title="t('Institute name in English - e.g. Sofir Uddin High School and College', 'প্রতিষ্ঠানের নাম ইংরেজিতে লিখুন - যেমন: সোফির উদ্দিন উচ্চ বিদ্যালয় এন্ড কলেজ')"  :placeholder="t('Institute name in English - e.g. Sofir Uddin High School and College', 'প্রতিষ্ঠানের নাম ইংরেজিতে লিখুন - যেমন: সোফির উদ্দিন উচ্চ বিদ্যালয় এন্ড কলেজ')" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 2. Founder / Date / Constituency ────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-user" />
            <div>
              <h2>{{ isBn ? "প্রতিষ্ঠাতা ও তারিখ" : "Founder & Date" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠাতা" : "Founder" }}</label
              ><input v-model="form.founder_name" type="text"  :title="t('Founder full name', 'প্রতিষ্ঠাতার পূর্ণ নাম লিখুন')"  :placeholder="t('Founder full name', 'প্রতিষ্ঠাতার পূর্ণ নাম লিখুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠার তারিখ" : "Est. Date" }}</label>
              <BaseDatePicker v-model="form.establishment_date"  :title="t('Select the date the institute was established (DD/MM/YYYY)', 'প্রতিষ্ঠার তারিখ নির্বাচন করুন (DD/MM/YYYY)')"  :placeholder="t('Select the date the institute was established (DD/MM/YYYY)', 'প্রতিষ্ঠার তারিখ নির্বাচন করুন (DD/MM/YYYY)')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "সংসদীয় আসন" : "Parliamentary Constituency" }}</label>
              <BaseCombobox
                v-model="form.parliamentary_constituency"
                :options="PARLIAMENTARY_SEAT_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the parliamentary constituency of the institute area', 'প্রতিষ্ঠানের এলাকার সংসদীয় আসন নির্বাচন করুন')"
               :title="t('Select the parliamentary constituency of the institute area', 'প্রতিষ্ঠানের এলাকার সংসদীয় আসন নির্বাচন করুন')" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 3. Address ───────────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-location-dot" />
            <div>
              <h2>{{ isBn ? "ঠিকানা" : "Address" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ isBn ? "বিভাগ / অঞ্চল" : "Division / Region" }}</label>
              <BaseCombobox
                v-model="form.division_id"
                option-value="id"
                :options="geoDivisionOptions"
                option-label="LookupText"
                :placeholder="t('Select the division / region', 'বিভাগ / অঞ্চল নির্বাচন করুন')"
               :title="t('Select the division / region', 'বিভাগ / অঞ্চল নির্বাচন করুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "জেলা" : "District" }}</label>
              <BaseCombobox
                v-model="form.district_id"
                option-value="id"
                :options="geoDistrictOptions"
                option-label="LookupText"
                :placeholder="t('Select the district', 'জেলা নির্বাচন করুন')"
                :disabled="!form.division_id"
               :title="t('Select the district', 'জেলা নির্বাচন করুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "উপজেলা/থানা" : "Upazila / Thana" }}</label>
              <BaseCombobox
                v-model="form.upazila_id"
                option-value="id"
                :options="geoUpazilaOptions"
                option-label="LookupText"
                :placeholder="t('Select the upazila / thana', 'উপজেলা / থানা নির্বাচন করুন')"
                :disabled="!form.district_id"
               :title="t('Select the upazila / thana', 'উপজেলা / থানা নির্বাচন করুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ইউনিয়ন" : "Union" }}</label>
              <BaseCombobox
                v-model="form.union_id"
                option-value="id"
                :options="geoUnionOptions"
                option-label="LookupText"
                :placeholder="t('Select the union', 'ইউনিয়ন নির্বাচন করুন')"
                :disabled="!form.upazila_id"
               :title="t('Select the union', 'ইউনিয়ন নির্বাচন করুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "গ্রাম/হোল্ডিং/রোড" : "Village / Road" }}</label
              ><input v-model="form.village_road_holding_no" type="text"  :title="t('Village / road / holding number - e.g. 12, Uttar Para', 'গ্রাম / রোড / হোল্ডিং নম্বর লিখুন - যেমন: ১২, উত্তর পাড়া')"  :placeholder="t('Village / road / holding number - e.g. 12, Uttar Para', 'গ্রাম / রোড / হোল্ডিং নম্বর লিখুন - যেমন: ১২, উত্তর পাড়া')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ডাকঘর" : "Post Office" }}</label
              ><input v-model="form.post_office" type="text"  :title="t('Nearest post office name', 'নিকটবর্তী ডাকঘরের নাম লিখুন')"  :placeholder="t('Nearest post office name', 'নিকটবর্তী ডাকঘরের নাম লিখুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "পোস্ট কোড" : "Post Code" }}</label
              ><input v-model.number="form.post_code" type="number"  :title="t('Postal code - e.g. 3100', 'পোস্ট কোড লিখুন - যেমন: ৩১০০')"  :placeholder="t('Postal code - e.g. 3100', 'পোস্ট কোড লিখুন - যেমন: ৩১০০')" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 4. Contact ───────────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-phone" />
            <div>
              <h2>{{ isBn ? "যোগাযোগ" : "Contact" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠানের ফোন" : "Institute Phone" }}</label
              ><input v-model="form.institute_phone" type="text"  :title="t('Contact phone number - e.g. 01712-345678', 'যোগাযোগের ফোন নম্বর লিখুন - যেমন: ০১৭১২-৩৪৫৬৭৮')"  :placeholder="t('Contact phone number - e.g. 01712-345678', 'যোগাযোগের ফোন নম্বর লিখুন - যেমন: ০১৭১২-৩৪৫৬৭৮')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ইমেইল" : "Email" }}</label
              ><input v-model="form.institute_email" type="email"  :title="t('Official email address - e.g. info@school.edu.bd', 'অফিসিয়াল ইমেইল ঠিকানা লিখুন - যেমন: info@school.edu.bd')"  :placeholder="t('Official email address - e.g. info@school.edu.bd', 'অফিসিয়াল ইমেইল ঠিকানা লিখুন - যেমন: info@school.edu.bd')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ওয়েবসাইট" : "Website" }}</label
              ><input v-model="form.website" type="text"  :title="t('Institute website URL - e.g. https://example.com', 'প্রতিষ্ঠানের ওয়েবসাইট লিখুন - যেমন: https://example.com')"  :placeholder="t('Institute website URL - e.g. https://example.com', 'প্রতিষ্ঠানের ওয়েবসাইট লিখুন - যেমন: https://example.com')" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 5. Classification ────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-tag" />
            <div>
              <h2>{{ isBn ? "শ্রেণিবিন্যাস" : "Classification" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠানের প্রকার" : "Institute Type" }}</label>
              <BaseCombobox
                v-model="form.institute_type"
                :options="INSTITUTE_TYPE_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the institute type - e.g. School & College', 'প্রতিষ্ঠানের ধরন নির্বাচন করুন - যেমন: স্কুল এন্ড কলেজ')"
               :title="t('Select the institute type - e.g. School & College', 'প্রতিষ্ঠানের ধরন নির্বাচন করুন - যেমন: স্কুল এন্ড কলেজ')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "সংযুক্ত কারিগরি শাখা" : "Attached Tech. Branch" }}</label>
              <BaseCombobox
                v-model="form.attached_technical_branch_type"
                :options="INSTITUTE_TYPE_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the attached technical branch type - leave blank if not applicable', 'সংযুক্ত কারিগরি শাখার ধরন নির্বাচন করুন - প্রযোজ্য না হলে ফাঁকা রাখুন')"
                :clearable="false"
               :title="t('Select the attached technical branch type - leave blank if not applicable', 'সংযুক্ত কারিগরি শাখার ধরন নির্বাচন করুন - প্রযোজ্য না হলে ফাঁকা রাখুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "গ্রুপ" : "Group" }}</label>
              <BaseCombobox
                v-model="form.group"
                :options="GROUP_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the education group - e.g. Science', 'শিক্ষা গ্রুপ নির্বাচন করুন - যেমন: বিজ্ঞান')"
               :title="t('Select the education group - e.g. Science', 'শিক্ষা গ্রুপ নির্বাচন করুন - যেমন: বিজ্ঞান')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "কাদের জন্য" : "Student Type" }}</label>
              <BaseCombobox
                v-model="form.student_type"
                :options="STUDENT_TYPE_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the student type - Co-Education / Boys / Girls', 'শিক্ষার্থীর ধরন নির্বাচন করুন - সহশিক্ষা / বালক / বালিকা')"
               :title="t('Select the student type - Co-Education / Boys / Girls', 'শিক্ষার্থীর ধরন নির্বাচন করুন - সহশিক্ষা / বালক / বালিকা')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "শিফট সংখ্যা" : "Shift Count" }}</label>
              <BaseCombobox
                v-model="form.shift_count"
                :options="SHIFT_COUNT_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the shift - Day / Morning / Evening / Night', 'শিফট নির্বাচন করুন - দিন / সকাল / বিকাল / রাত')"
               :title="t('Select the shift - Day / Morning / Evening / Night', 'শিফট নির্বাচন করুন - দিন / সকাল / বিকাল / রাত')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ইংরেজি ভার্সন" : "English Version" }}</label>
              <div class="form-field__check">
                <input id="eng-ver" v-model="form.has_english_version" type="checkbox"  :title="t('Check if the institute has an English version', 'ইংরেজি ভার্সন থাকলে টিক দিন')" />
                <label for="eng-ver" class="form-field__check-label">{{
                  form.has_english_version ? (isBn ? "হ্যাঁ" : "Yes") : isBn ? "না" : "No"
                }}</label>
              </div>
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ব্যবস্থাপনা" : "Management" }}</label>
              <BaseCombobox
                v-model="form.management"
                :options="comboOptions(MANAGEMENTS)"
                :placeholder="t('Select the management type - Govt. / Non-Govt. etc.', 'ব্যবস্থাপনার ধরন নির্বাচন করুন - সরকারি / বেসরকারি ইত্যাদি')"
               :title="t('Select the management type - Govt. / Non-Govt. etc.', 'ব্যবস্থাপনার ধরন নির্বাচন করুন - সরকারি / বেসরকারি ইত্যাদি')" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 6. Identifiers ───────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-hashtag" />
            <div>
              <h2>{{ isBn ? "কোডসমূহ" : "Identifiers" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>EIIN</label><input v-model="form.eiin" type="text" v-bind="DP_DIGITS"  :title="t('EIIN number (11 digits) - e.g. 130430', 'EIIN নম্বর লিখুন (১১ সংখ্যা) - যেমন: ১৩০৪৩০')"  :placeholder="t('EIIN number (11 digits) - e.g. 130430', 'EIIN নম্বর লিখুন (১১ সংখ্যা) - যেমন: ১৩০৪৩০')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "বোর্ড কোড" : "Board Code" }}</label
              ><input v-model="form.board_institute_code" type="text" v-bind="DP_DIGITS"  :title="t('Board institute code - e.g. 110123', 'বোর্ড ইনস্টিটিউট কোড লিখুন - যেমন: ১১০১২৩')"  :placeholder="t('Board institute code - e.g. 110123', 'বোর্ড ইনস্টিটিউট কোড লিখুন - যেমন: ১১০১২৩')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "কারিগরি বোর্ড কোড" : "Technical Board Code" }}</label
              ><input v-model="form.technical_board_code" type="text" v-bind="DP_DIGITS"  :title="t('Technical board code - if applicable', 'টেকনিক্যাল বোর্ড কোড লিখুন - প্রযোজ্য হলে')"  :placeholder="t('Technical board code - if applicable', 'টেকনিক্যাল বোর্ড কোড লিখুন - প্রযোজ্য হলে')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "এমপিও কোড" : "MPO Code" }}</label
              ><input v-model="form.mpo_code" type="text" v-bind="DP_DIGITS"  :title="t('MPO code of the institute', 'প্রতিষ্ঠানের এমপিও কোড লিখুন')"  :placeholder="t('MPO code of the institute', 'প্রতিষ্ঠানের এমপিও কোড লিখুন')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "কারিগরি এমপিও কোড" : "Tech. Branch MPO Code" }}</label
              ><input v-model="form.technical_branch_mpo_code" type="text" v-bind="DP_DIGITS"  :title="t('MPO code of the technical branch', 'কারিগরি শাখার এমপিও কোড লিখুন')"  :placeholder="t('MPO code of the technical branch', 'কারিগরি শাখার এমপিও কোড লিখুন')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "উপবৃত্তি কোড" : "Stipend Code" }}</label
              ><input v-model="form.stipend_code" type="text" v-bind="DP_DIGITS"  :title="t('Stipend code - if applicable', 'স্টাইপেন্ড কোড লিখুন - প্রযোজ্য হলে')"  :placeholder="t('Stipend code - if applicable', 'স্টাইপেন্ড কোড লিখুন - প্রযোজ্য হলে')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 7. MPO Status ─────────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-check-circle" />
            <div>
              <h2>{{ isBn ? "এমপিও অবস্থা" : "MPO Status" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid">
            <div class="form-field">
              <label>{{ isBn ? "সাধারণ শাখা এমপিওভুক্ত?" : "General Branch MPO?" }}</label>
              <div class="form-field__check">
                <input id="gen-mpo" v-model="form.general_mpo" type="checkbox"  :title="t('Check if the institute is under general MPO', 'সাধারণ এমপিওভুক্ত হলে টিক দিন')" />
                <label for="gen-mpo" class="form-field__check-label">{{
                  form.general_mpo ? (isBn ? "হ্যাঁ" : "Yes") : isBn ? "না" : "No"
                }}</label>
              </div>
              <input
                v-if="form.general_mpo"
                v-model="form.general_mpo_code"
                type="text"
                v-bind="DP_DIGITS"
                style="margin-top: 0.5rem"
               :title="t('General MPO code', 'সাধারণ এমপিও কোড লিখুন')"  :placeholder="t('General MPO code', 'সাধারণ এমপিও কোড লিখুন')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "কারিগরি শাখা এমপিওভুক্ত?" : "Technical Branch MPO?" }}</label>
              <div class="form-field__check">
                <input id="tech-mpo" v-model="form.tech_mpo" type="checkbox"  :title="t('Check if the institute is under technical MPO', 'টেকনিক্যাল এমপিওভুক্ত হলে টিক দিন')" />
                <label for="tech-mpo" class="form-field__check-label">{{
                  form.tech_mpo ? (isBn ? "হ্যাঁ" : "Yes") : isBn ? "না" : "No"
                }}</label>
              </div>
              <input
                v-if="form.tech_mpo"
                v-model="form.tech_mpo_code"
                type="text"
                v-bind="DP_DIGITS"
                style="margin-top: 0.5rem"
               :title="t('Technical MPO code', 'টেকনিক্যাল এমপিও কোড লিখুন')"  :placeholder="t('Technical MPO code', 'টেকনিক্যাল এমপিও কোড লিখুন')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 8. Staff ──────────────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-people-group" />
            <div>
              <h2>{{ isBn ? "জনবল" : "Staff" }}</h2>
            </div>
          </div>
          <div class="ipf-staff-total" :title="isBn ? 'মোট কর্মচারী' : 'Total staffs'">
            <i class="fa-duotone fa-calculator" />
            <span>
              {{ isBn ? "মোট কর্মচারী" : "Total Staffs" }}:
              <strong>{{ staffTotal }}</strong>
            </span>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ isBn ? "বর্তমানে কর্মরত (পুরুষ)" : "Currently Working (Male)" }}</label
              ><input v-model.number="form.staff_male" type="number" v-bind="MAX3"  :title="t('Number of male staff members', 'পুরুষ কর্মচারীর সংখ্যা লিখুন')"  :placeholder="t('Number of male staff members', 'পুরুষ কর্মচারীর সংখ্যা লিখুন')"  @input="onStaffInput('staff_male')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "বর্তমানে কর্মরত (মহিলা)" : "Currently Working (Female)" }}</label
              ><input v-model.number="form.staff_female" type="number" v-bind="MAX3"  :title="t('Number of female staff members', 'মহিলা কর্মচারীর সংখ্যা লিখুন')"  :placeholder="t('Number of female staff members', 'মহিলা কর্মচারীর সংখ্যা লিখুন')"  @input="onStaffInput('staff_female')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "এমপিও (পুরুষ)" : "MPO Staff (Male)" }}</label
              ><input v-model.number="form.staff_mpo_male" type="number" v-bind="MAX3"  :title="t('Male staff under MPO', 'এমপিওভুক্ত পুরুষ কর্মচারীর সংখ্যা')"  :placeholder="t('Male staff under MPO', 'এমপিওভুক্ত পুরুষ কর্মচারীর সংখ্যা')"  @input="onStaffInput('staff_mpo_male')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "এমপিও (মহিলা)" : "MPO Staff (Female)" }}</label
              ><input v-model.number="form.staff_mpo_female" type="number" v-bind="MAX3"  :title="t('Female staff under MPO', 'এমপিওভুক্ত মহিলা কর্মচারীর সংখ্যা')"  :placeholder="t('Female staff under MPO', 'এমপিওভুক্ত মহিলা কর্মচারীর সংখ্যা')"  @input="onStaffInput('staff_mpo_female')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "অ-এমপিও (পুরুষ)" : "Non-MPO Staff (Male)" }}</label
              ><input v-model.number="form.staff_nonmpo_male" type="number" v-bind="MAX3"  :title="t('Male staff not under MPO', 'অ-এমপিওভুক্ত পুরুষ কর্মচারীর সংখ্যা')"  :placeholder="t('Male staff not under MPO', 'অ-এমপিওভুক্ত পুরুষ কর্মচারীর সংখ্যা')"  @input="onStaffInput('staff_nonmpo_male')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "অ-এমপিও (মহিলা)" : "Non-MPO Staff (Female)" }}</label
              ><input v-model.number="form.staff_nonmpo_female" type="number" v-bind="MAX3"  :title="t('Female staff not under MPO', 'অ-এমপিওভুক্ত মহিলা কর্মচারীর সংখ্যা')"  :placeholder="t('Female staff not under MPO', 'অ-এমপিওভুক্ত মহিলা কর্মচারীর সংখ্যা')"  @input="onStaffInput('staff_nonmpo_female')" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 9. MPO Info (conditional) ────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-building-columns" />
            <div>
              <h2>{{ isBn ? "এমপিও তথ্য" : "MPO Info" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid">
            <div class="form-field">
              <label>{{ isBn ? "মাধ্যমিক এমপিও তারিখ" : "Secondary MPO Date" }}</label>
              <BaseDatePicker v-model="form.secondary_mpo_date"  :title="t('Select the date of secondary MPO approval', 'মাধ্যমিক এমপিও অনুমোদনের তারিখ নির্বাচন করুন')"  :placeholder="t('Select the date of secondary MPO approval', 'মাধ্যমিক এমপিও অনুমোদনের তারিখ নির্বাচন করুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "মাধ্যমিক এমপিও কোড" : "Secondary MPO Code" }}</label
              ><input v-model="form.secondary_mpo_code" type="text" v-bind="DP_DIGITS"  :title="t('Secondary MPO code', 'মাধ্যমিক এমপিও কোড লিখুন')"  :placeholder="t('Secondary MPO code', 'মাধ্যমিক এমপিও কোড লিখুন')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
          </div>
          <div v-if="showHigherSecondaryMpo" class="ipf-grid" style="margin-top: 1rem">
            <div class="form-field">
              <label>{{ isBn ? "উচ্চ মাধ্যমিক এমপিও তারিখ" : "Higher Secondary MPO Date" }}</label>
              <BaseDatePicker v-model="form.higher_secondary_mpo_date"  :title="t('Select the date of higher secondary MPO approval', 'উচ্চ মাধ্যমিক এমপিও অনুমোদনের তারিখ নির্বাচন করুন')"  :placeholder="t('Select the date of higher secondary MPO approval', 'উচ্চ মাধ্যমিক এমপিও অনুমোদনের তারিখ নির্বাচন করুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "উচ্চ মাধ্যমিক এমপিও কোড" : "Higher Secondary MPO Code" }}</label
              ><input v-model="form.higher_secondary_mpo_code" type="text" v-bind="DP_DIGITS"  :title="t('Higher secondary MPO code', 'উচ্চ মাধ্যমিক এমপিও কোড লিখুন')"  :placeholder="t('Higher secondary MPO code', 'উচ্চ মাধ্যমিক এমপিও কোড লিখুন')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 10. Bank Account ────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-piggy-bank" />
            <div>
              <h2>{{ isBn ? "ব্যাংক হিসাব" : "Bank Account" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ isBn ? "ব্যাংকের নাম" : "Bank Name" }}</label>
              <BaseCombobox
                v-model="form.bank_name"
                :options="BANK_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the bank name', 'ব্যাংকের নাম নির্বাচন করুন')"
               :title="t('Select the bank name', 'ব্যাংকের নাম নির্বাচন করুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "শাখা" : "Branch" }}</label
              ><input v-model="form.bank_branch" type="text"  :title="t('Bank branch name - e.g. Sylhet Main Branch', 'ব্যাংক শাখার নাম লিখুন - যেমন: সিলেট প্রধান শাখা')"  :placeholder="t('Bank branch name - e.g. Sylhet Main Branch', 'ব্যাংক শাখার নাম লিখুন - যেমন: সিলেট প্রধান শাখা')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "হিসাবের ধরন" : "Account Type" }}</label>
              <BaseCombobox
                v-model="form.bank_account_type"
                :options="ACCOUNT_TYPE_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the account type - Savings / Current / FD', 'হিসাবের ধরন নির্বাচন করুন - সঞ্চয় / চলতি / মেয়াদি')"
               :title="t('Select the account type - Savings / Current / FD', 'হিসাবের ধরন নির্বাচন করুন - সঞ্চয় / চলতি / মেয়াদি')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "একাউন্ট হোল্ডার" : "Account Holder" }}</label
              ><input v-model="form.bank_account_holder" type="text"  :title="t('Name of the account holder', 'হিসাবের মালিকের নাম লিখুন')"  :placeholder="t('Name of the account holder', 'হিসাবের মালিকের নাম লিখুন')" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "হিসাব নম্বর" : "Account Number" }}</label
              ><input v-model="form.bank_account_number" type="text"  :title="t('Bank account number', 'ব্যাংক হিসাব নম্বর লিখুন')"  :placeholder="t('Bank account number', 'ব্যাংক হিসাব নম্বর লিখুন')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "হিসাবের উদ্দেশ্য" : "Account Purpose" }}</label>
              <BaseCombobox
                v-model="form.bank_account_purpose"
                :options="ACCOUNT_PURPOSE_OPTIONS"
                option-value="LookupText"
                option-label="LookupText"
                :placeholder="t('Select the purpose of the account', 'হিসাবের উদ্দেশ্য নির্বাচন করুন')"
               :title="t('Select the purpose of the account', 'হিসাবের উদ্দেশ্য নির্বাচন করুন')" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── 11. Committee Members ────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-users" />
            <div>
              <h2>{{ isBn ? "কমিটির সদস্য" : "Committee Members" }}</h2>
              <span>{{ form.committee_members.length }} {{ isBn ? "সদস্য" : "members" }}</span>
            </div>
          </div>
          <button
            type="button"
            class="ipf-add-btn"
            @click="addCommittee"
            :title="isBn ? 'সদস্য যোগ করুন' : 'Add member'"
          >
            <i class="fa-duotone fa-plus" /> {{ isBn ? "যোগ করুন" : "Add" }}
          </button>
        </div>
        <div class="ipf-section__body">
          <div v-for="(m, i) in form.committee_members" :key="i" class="ipf-array-card">
            <div class="ipf-array-card__head">
              #{{ i + 1 }}
              <button type="button" class="ipf-array-card__remove" @click="removeCommittee(i)">
                &times;
              </button>
            </div>
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>{{ isBn ? "সদস্যের নাম" : "Member Name" }}</label
                ><input v-model="form.committee_members[i].member_name" type="text"  :title="t('Member full name', 'সদস্যের পূর্ণ নাম লিখুন')"  :placeholder="t('Member full name', 'সদস্যের পূর্ণ নাম লিখুন')" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "যোগদানের তারিখ" : "Joining Date" }}</label>
                <BaseDatePicker v-model="form.committee_members[i].joining_date"  :title="t('Select the date the member joined the committee', 'কমিটিতে যোগদানের তারিখ নির্বাচন করুন')"  :placeholder="t('Select the date the member joined the committee', 'কমিটিতে যোগদানের তারিখ নির্বাচন করুন')" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "ফোন" : "Phone" }}</label
                ><input v-model="form.committee_members[i].phone" type="text"  :title="t('Member contact number', 'সদস্যের ফোন নম্বর লিখুন')"  :placeholder="t('Member contact number', 'সদস্যের ফোন নম্বর লিখুন')"  inputmode="numeric" @input="onDigitsOnly" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "লিঙ্গ" : "Gender" }}</label>
                <BaseCombobox
                  v-model="form.committee_members[i].gender"
                  :options="GENDER_OPTIONS"
                  option-value="LookupText"
                  option-label="LookupText"
                  :placeholder="t('Select the gender', 'লিঙ্গ নির্বাচন করুন')"
                 :title="t('Select the gender', 'লিঙ্গ নির্বাচন করুন')" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "কমিটিতে অবস্থান" : "Committee Position" }}</label>
                <BaseCombobox
                  v-model="form.committee_members[i].committee_position"
                  :options="COMMITTEE_POSITION_OPTIONS"
                  option-value="LookupText"
                  option-label="LookupText"
                  :placeholder="t('Select the position in the committee', 'কমিটিতে অবস্থান নির্বাচন করুন')"
                 :title="t('Select the position in the committee', 'কমিটিতে অবস্থান নির্বাচন করুন')" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "শিক্ষাগত যোগ্যতা" : "Education" }}</label
                ><input v-model="form.committee_members[i].education_qualification" type="text"  :title="t('Highest education qualification', 'সর্বোচ্চ শিক্ষাগত যোগ্যতা লিখুন')"  :placeholder="t('Highest education qualification', 'সর্বোচ্চ শিক্ষাগত যোগ্যতা লিখুন')" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "পেশা" : "Occupation" }}</label
                ><input v-model="form.committee_members[i].occupation" type="text"  :title="t('Current occupation', 'বর্তমান পেশা লিখুন')"  :placeholder="t('Current occupation', 'বর্তমান পেশা লিখুন')" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "কমিটি ত্যাগ" : "Left Committee" }}</label>
                <div class="form-field__check">
                  <input
                    :id="`left-cmt-${i}`"
                    v-model="form.committee_members[i].left_committee"
                    type="checkbox"
                   :title="t('Check if the member has left the committee', 'সদস্য কমিটি ছেড়ে দিলে টিক দিন')" />
                  <label :for="`left-cmt-${i}`" class="form-field__check-label">{{
                    form.committee_members[i].left_committee
                      ? isBn
                        ? "হ্যাঁ"
                        : "Yes"
                      : isBn
                        ? "না"
                        : "No"
                  }}</label>
                </div>
              </div>
              <div v-if="form.committee_members[i].left_committee" class="form-field">
                <label>{{ isBn ? "ত্যাগের কারণ" : "Reason for Leaving" }}</label
                ><input v-model="form.committee_members[i].reason_for_leaving" type="text"  :title="t('Reason for leaving the committee', 'কমিটি ছাড়ার কারণ লিখুন')"  :placeholder="t('Reason for leaving the committee', 'কমিটি ছাড়ার কারণ লিখুন')" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 12. Facilities ────────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-grid-2" />
            <div>
              <h2>{{ isBn ? "সুবিধাদি" : "Facilities" }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-toggle-grid">
            <div
              v-for="(val, key) in form.facilities"
              :key="key"
              class="ipf-toggle-btn"
              :class="{ 'is-active': val }"
              :title="isBn ? FACILITY_HELP[key]?.bn : FACILITY_HELP[key]?.en"
              @click="form.facilities[key] = !val"
            >
              <span class="ipf-toggle-btn__name">
                <i :class="['fa-duotone', FACILITY_ICONS[key] ?? 'fa-circle']" />
                <span class="ipf-toggle-btn__label">{{
                  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                }}</span>
              </span>
              <span class="ipf-toggle-btn__state">{{
                val ? (isBn ? "হ্যাঁ" : "Yes") : isBn ? "না" : "No"
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Sticky save bar ────────────────────────────── -->
    <div class="ipf-savebar">
      <div class="ipf-savebar__status">
        <i class="fa-duotone fa-circle-check" />
        <span>{{ isBn ? "Ctrl+S দিয়ে সংরক্ষণ করুন" : "Press Ctrl+S to save" }}</span>
      </div>
      <div class="ipf-savebar__actions">
        <button type="button" class="btn btn--primary" :disabled="isSaving" @click="handleSave">
          <i class="fa-duotone fa-floppy-disk" />
          {{
            isSaving
              ? isBn
                ? "সংরক্ষণ হচ্ছে..."
                : "Saving..."
              : isBn
                ? "সংরক্ষণ করুন"
                : "Save Profile"
          }}
        </button>
      </div>
    </div>

    <!-- ── Profile preview modal ─────────────────────── -->
    <BaseModal
      v-if="showPreview"
      :title="isBn ? 'প্রতিষ্ঠানের প্রোফাইল' : 'Institute Profile'"
      wide
      @close="showPreview = false"
    >
      <InstituteProfilePreviewModal :form="form as unknown as Record<string, unknown>" />
      <template #footer>
        <button type="button" class="btn btn--primary" @click="showPreview = false">
          <i class="fa-duotone fa-xmark" /> {{ isBn ? "বন্ধ করুন" : "Close" }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>
