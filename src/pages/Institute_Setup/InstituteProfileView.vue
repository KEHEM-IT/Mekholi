<!-- Institute Setup > Institute Profile -->
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useShortcutKeySet } from "@/composables/shortcut_key_set";
import { isSaving, saveProfile, loadProfile } from "@/composables/Institute_Setup/useInstituteProfile";
import { useToast } from "@/composables/useToast";
import { uploadToImgbb, validateLogoFile } from "@/composables/useImgbbUpload";
import { useFormDirtyGuard } from "@/composables/useFormDirtyGuard";
import {
  exportProfileToExcel,
  importProfileFromExcel,
} from "@/composables/Institute_Setup/useInstituteProfileExcel";
import BaseCombobox from "@/components/ui/BaseCombobox.vue";
import BaseDatePicker from "@/components/ui/BaseDatePicker.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import BaseToggle from "@/components/ui/BaseToggle.vue";
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

import { useTranslator } from "@/Translator";
const { t, labelKey } = useTranslator();

// Option label key per active language:
//   JSON options → Name / NameInBangla · geo options → name / bn_name
const optLabelKey = computed(() => labelKey("Name", "NameInBangla"));
const geoLabelKey = computed(() => labelKey("name", "bn_name"));

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

  // Staff
  // Staff (v2): Total / Male / Female / MPO / Non-MPO — Female & Non-MPO
  // are auto-derived (Total − Male / Total − MPO) and stored for history.
  staff_total: null as number | null,
  staff_male: null as number | null,
  staff_female: null as number | null,
  staff_mpo: null as number | null,
  staff_nonmpo: null as number | null,

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

  // Classification rows (added via the "+" button): each row holds one
  // institute type (unique across rows), multiple groups, and an optional
  // MPO entry (status toggle → code + date).
  classifications: [] as {
    institute_type: string;
    groups: string[];
    mpo_status: boolean;
    mpo_code: string;
    mpo_date: string;
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

// Live total staff — mirrors the manual "Total Staffs" input (badge in the
// section header). Falls back to Male + Female when total is not entered yet.
const staffTotal = computed(() => {
  const t = Number(form.staff_total) || 0;
  return t > 0 ? t : (Number(form.staff_male) || 0) + (Number(form.staff_female) || 0);
});

// Staff count fields: a 0 means "nothing entered" — keep the field empty so
// the placeholder shows instead of a stale 0.
const STAFF_KEYS = [
  "staff_total",
  "staff_male",
  "staff_female",
  "staff_mpo",
  "staff_nonmpo",
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

// Derived staff fields: Female = Total − Male, Non-MPO = Total − MPO.
// Clamped at 0; recomputed live as the user types the manual fields.
function deriveStaff(key: "staff_female" | "staff_nonmpo", from: "staff_male" | "staff_mpo") {
  const total = Number(form.staff_total) || 0;
  const part = Number(form[from]) || 0;
  const derived = total - part;
  form[key] = derived > 0 ? derived : null;
}
watch([() => form.staff_total, () => form.staff_male], () => deriveStaff("staff_female", "staff_male"));
watch([() => form.staff_total, () => form.staff_mpo], () => deriveStaff("staff_nonmpo", "staff_mpo"));

// While restoring a saved profile we must NOT run the geo cascade resets —
// the watchers below would otherwise clear the loaded child selections
// (district / upazila / union) the moment division_id is assigned.
let isRestoringProfile = false;

// Unsaved-changes guard: toasts when the form becomes dirty, warns on
// tab close / reload, and lets handleSave skip DB writes when nothing changed.
const dirtyGuard = useFormDirtyGuard(form, {
  isRestoring: () => isRestoringProfile,
  dirtyToast: t("You have unsaved changes — save before leaving"),
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

// Split "English - বাংলা" strings into localized option objects.
// The stored value stays the full LookupText ("EN - BN") for DB/Excel
// compatibility; the displayed label follows the active language.
function comboOptions(items: string[]) {
  return items.map((v) => {
    const sep = v.indexOf(" - ");
    if (sep > 0) {
      return {
        Id: v,
        Name: v.slice(0, sep).trim(),
        NameInBangla: v.slice(sep + 3).trim(),
        LookupText: v,
      };
    }
    return { Id: v, Name: v, NameInBangla: v, LookupText: v };
  });
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

/** Live normalization while typing: collapse runs of 2+ spaces/tabs into a
 *  single space. A single trailing space is kept so typing words isn't
 *  broken; ends are trimmed on blur / save. */
function onNormalizeInput(event: Event) {
  const el = event.target as HTMLInputElement;
  const cleaned = el.value.replace(/[ \t]+/g, " ");
  if (el.value !== cleaned) el.value = cleaned;
}

/** Full normalization when the field loses focus: collapse whitespace runs
 *  and trim both ends, then sync the model via an input event. */
function onNormalizeBlur(event: Event) {
  const el = event.target as HTMLInputElement;
  const cleaned = normalizeText(el.value);
  if (el.value !== cleaned) {
    el.value = cleaned;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

const toast = useToast();
const isUploadingLogo = ref(false);
const isDraggingLogo = ref(false);
const logoInput = ref<HTMLInputElement | null>(null);
const showPreview = ref(false);
const excelInput = ref<HTMLInputElement | null>(null);
const isImportingExcel = ref(false);
// Skeleton loader — the page shows a shimmer skeleton for at least 2s on
// mount while the profile loads from the backend.
const isPageLoading = ref(true);
const MIN_SKELETON_MS = 2000;

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
    const saved = await saveProfile({ ...trimmedForm() });
    if (saved) {
      dirtyGuard.markClean();
      toast.success(t("Logo uploaded & saved"));
    } else {
      toast.error(
        t("Logo uploaded but could not save — is server.py running?"),
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
    toast.success(t("Excel file downloaded"));
  } catch (err) {
    toast.error(t("Export failed: {error}", { error: err instanceof Error ? err.message : "unknown error" }));
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
    const { profile, facilities, committee_members, classifications, skipped } =
      await importProfileFromExcel(file);

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
    if (classifications.length) {
      form.classifications = classifications as typeof form.classifications;
    }
    await nextTick();
    isRestoringProfile = false;

    toast.success(
      t(
        skipped.length
          ? "Excel imported — review & save (skipped: {n})"
          : "Excel imported — review & save",
        { n: skipped.length },
      ),
    );
    if (skipped.length) {
      toast.warning(t("Unknown columns skipped: {cols}", { cols: skipped.slice(0, 5).join(", ") }));
    }
  } catch (err) {
    toast.error(t("Import failed: {error}", { error: err instanceof Error ? err.message : "invalid Excel file" }));
  } finally {
    isImportingExcel.value = false;
  }
}

// ── Save / Load ───────────────────────────────────────────────────────

/** Collapse all whitespace runs to single spaces, then trim the ends.
 *  "  Sofir   Uddin  High School  " -> "Sofir Uddin High School" */
function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Trim every string field in the form (single choke point on save). */
function trimmedForm(): typeof form {
  const out = { ...form };
  for (const key of Object.keys(out) as (keyof typeof out)[]) {
    const v = out[key];
    if (typeof v === "string") {
      (out as Record<string, unknown>)[key] = normalizeText(v);
    } else if (key === "committee_members" && Array.isArray(v)) {
      out.committee_members = (v as typeof form.committee_members).map((m) => {
        const clean = { ...m };
        for (const k of Object.keys(clean) as (keyof typeof clean)[]) {
          if (typeof clean[k] === "string") (clean as Record<string, unknown>)[k] = normalizeText(String(clean[k]));
        }
        return clean;
      });
    } else if (key === "classifications" && Array.isArray(v)) {
      out.classifications = (v as typeof form.classifications).map((c) => {
        const clean = {
          ...c,
          institute_type: normalizeText(c.institute_type),
          mpo_code: normalizeText(c.mpo_code),
          mpo_date: normalizeText(c.mpo_date),
          groups: c.groups.map((g) => normalizeText(g)),
        };
        return clean;
      });
    }
  }
  return out;
}

async function handleSave() {
  // Do not write to the DB when nothing changed — just inform the user.
  if (!dirtyGuard.hasChanges()) {
    toast.info(t("No changes to save"));
    return;
  }
  // Apply whitespace-trim to all text inputs before saving.
  const cleaned = trimmedForm();
  Object.assign(form, cleaned);
  const saved = await saveProfile({ ...cleaned });
  if (saved) {
    dirtyGuard.markClean();
    toast.success(t("Saved"));
  } else {
    toast.error(
      t("Save failed — is server.py running?"),
    );
  }
}

// Warn before leaving the page (SPA navigation) with unsaved changes.
onBeforeRouteLeave(() => {
  if (!dirtyGuard.isDirty.value) return true;
  const leave = window.confirm(
    t("You have unsaved changes. Leave anyway?"),
  );
  return leave;
});

// Try loading from SQLite on mount; stays empty if server not running.
// The skeleton stays visible for at least 2 seconds (MIN_SKELETON_MS) so
// the page never flashes content instantly.
onMounted(async () => {
  const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_SKELETON_MS));
  const [data] = await Promise.all([loadProfile(), minDelay]);
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
  // Skeleton done — reveal the real form.
  isPageLoading.value = false;
});

// ── Shortcuts ─────────────────────────────────────────────────────────────

useShortcutKeySet([{ key: "s", ctrl: true, handler: () => handleSave() }]);

// ── Committee add/remove ────────────────────────────────────────────────

// ── Classification rows ────────────────────────────────────────────────

function addClassification() {
  form.classifications.push({
    institute_type: "",
    groups: [],
    mpo_status: false,
    mpo_code: "",
    mpo_date: "",
  });
}
function removeClassification(i: number) {
  form.classifications.splice(i, 1);
}

/** Institute-type options for a given row — types already chosen in OTHER
 *  rows are excluded so a type can only be used once. */
function availableInstituteTypes(rowIndex: number) {
  const used = new Set(
    form.classifications
      .map((c, i) => (i === rowIndex ? "" : c.institute_type))
      .filter(Boolean),
  );
  return INSTITUTE_TYPE_OPTIONS.filter((o) => !used.has(String(o.LookupText)));
}

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
  <!-- ── Skeleton loader (min 2s) — mirrors the real form layout ─────── -->
  <section v-if="isPageLoading" class="ipf-skeleton" aria-busy="true" aria-label="Loading profile">
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

    <!-- Identity section: logo uploader + name fields -->
    <div class="skeleton skeleton--card ipf-sk-section">
      <span class="skeleton ipf-sk-section-title" />
      <span class="skeleton ipf-sk-logo" />
      <div class="ipf-sk-grid ipf-sk-grid--two">
        <span v-for="m in 2" :key="m" class="skeleton ipf-sk-field" />
      </div>
    </div>

    <!-- Founder/Date + Address + Contact: mixed field densities -->
    <div class="skeleton skeleton--card ipf-sk-section">
      <span class="skeleton ipf-sk-section-title" />
      <div class="ipf-sk-grid ipf-sk-grid--three">
        <span v-for="m in 3" :key="m" class="skeleton ipf-sk-field" />
      </div>
    </div>

    <div class="skeleton skeleton--card ipf-sk-section">
      <span class="skeleton ipf-sk-section-title" />
      <div class="ipf-sk-grid ipf-sk-grid--three">
        <span v-for="m in 6" :key="m" class="skeleton ipf-sk-field" />
      </div>
    </div>

    <!-- Classification + Identifiers -->
    <div class="skeleton skeleton--card ipf-sk-section">
      <span class="skeleton ipf-sk-section-title" />
      <div class="ipf-sk-grid ipf-sk-grid--three">
        <span v-for="m in 4" :key="m" class="skeleton ipf-sk-field" />
      </div>
      <span class="skeleton ipf-sk-row" />
    </div>

    <div class="skeleton skeleton--card ipf-sk-section">
      <span class="skeleton ipf-sk-section-title" />
      <div class="ipf-sk-grid ipf-sk-grid--three">
        <span v-for="m in 6" :key="m" class="skeleton ipf-sk-field" />
      </div>
    </div>

    <!-- Facilities: toggle chips row -->
    <div class="skeleton skeleton--card ipf-sk-section">
      <span class="skeleton ipf-sk-section-title" />
      <div class="ipf-sk-facilities">
        <span v-for="m in 10" :key="m" class="skeleton ipf-sk-chip" />
      </div>
    </div>

    <!-- Sticky save bar -->
    <div class="ipf-skeleton__savebar">
      <span class="skeleton ipf-sk-savebtn" />
    </div>
  </section>

  <section v-else class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('profile.title') }}</h1>
        <p>
          {{ t("Edit your institute information.") }}
        </p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary ipf-header__view" @click="showPreview = true">
          <i class="fa-duotone fa-eye" />
          {{ t("View") }}
        </button>
        <button
          type="button"
          class="btn ipf-header__export"
          :title="t('Export to Excel')"
          @click="handleExportExcel"
        >
          <i class="fa-duotone fa-file-excel" />
          {{ t("Export") }}
        </button>
        <button
          type="button"
          class="btn ipf-header__import"
          :disabled="isImportingExcel"
          :title="t('Import from Excel')"
          @click="triggerExcelImport"
        >
          <i class="fa-duotone" :class="isImportingExcel ? 'fa-spinner fa-spin' : 'fa-file-import'" />
          {{ t("Import") }}
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
              <h2>{{ t("Identity") }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <!-- Institute Logo -->
          <div class="form-field">
            <label>{{ t("Institute Logo") }}</label>
            <div
              class="ipf-logo"
              :class="{
                'is-uploading': isUploadingLogo,
                'is-dragging': isDraggingLogo && !isUploadingLogo,
              }"
              :title="t('Click or drag & drop to upload the institute logo (PNG, JPG, WEBP, GIF - max 5 MB)')"
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
                  {{ t("Uploading...") }}
                </template>
                <template v-else-if="isDraggingLogo">
                  {{ t("Drop the image here") }}
                </template>
                <template v-else-if="form.institute_logo">
                  {{ t("Click or drag to replace logo") }}
                </template>
                <template v-else>
                  {{ t("Click or drag & drop an image here") }}
                </template>
                <small>{{
                  t("PNG, JPG, WEBP or GIF — max 5 MB")
                }}</small>
              </div>
              <span
                v-if="form.institute_logo && !isUploadingLogo && !isDraggingLogo"
                class="ipf-logo__remove"
                role="button"
                tabindex="-1"
                :aria-label="t('Remove logo')"
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
              <label>{{ t("Institute Name (Bangla)") }}</label
              ><input v-model="form.institute_name_bn" type="text"  :title="t('Institute name in Bangla - e.g. Sofir Uddin High School and College')"  :placeholder="t('Institute name in Bangla - e.g. Sofir Uddin High School and College')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
            </div>
            <div class="form-field">
              <label>{{ t("Institute Name (English)") }}</label
              ><input v-model="form.institute_name_en" type="text"  :title="t('Institute name in English - e.g. Sofir Uddin High School and College')"  :placeholder="t('Institute name in English - e.g. Sofir Uddin High School and College')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
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
              <h2>{{ t("Founder & Date") }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ t("Founder") }}</label
              ><input v-model="form.founder_name" type="text"  :title="t('Founder full name')"  :placeholder="t('Founder full name')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
            </div>
            <div class="form-field">
              <label>{{ t("Est. Date") }}</label>
              <BaseDatePicker v-model="form.establishment_date"  :title="t('Select the date the institute was established')"  :placeholder="t('DD/MM/YYYY')" />
            </div>
            <div class="form-field">
              <label>{{ t("Parliamentary Constituency") }}</label>
              <BaseCombobox
                v-model="form.parliamentary_constituency"
                :options="PARLIAMENTARY_SEAT_OPTIONS"
                option-value="LookupText"
                :option-label="optLabelKey"
                :placeholder="t('Select the parliamentary constituency of the institute area')"
               :title="t('Select the parliamentary constituency of the institute area')" />
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
              <h2>{{ t("Address") }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ t("Division / Region") }}</label>
              <BaseCombobox
                v-model="form.division_id"
                option-value="id"
                :options="geoDivisionOptions"
                :option-label="geoLabelKey"
                :placeholder="t('Select the division / region')"
               :title="t('Select the division / region')" />
            </div>
            <div class="form-field">
              <label>{{ t("District") }}</label>
              <BaseCombobox
                v-model="form.district_id"
                option-value="id"
                :options="geoDistrictOptions"
                :option-label="geoLabelKey"
                :placeholder="t('Select the district')"
                :disabled="!form.division_id"
               :title="t('Select the district')" />
            </div>
            <div class="form-field">
              <label>{{ t("Upazila / Thana") }}</label>
              <BaseCombobox
                v-model="form.upazila_id"
                option-value="id"
                :options="geoUpazilaOptions"
                :option-label="geoLabelKey"
                :placeholder="t('Select the upazila / thana')"
                :disabled="!form.district_id"
               :title="t('Select the upazila / thana')" />
            </div>
            <div class="form-field">
              <label>{{ t("Union") }}</label>
              <BaseCombobox
                v-model="form.union_id"
                option-value="id"
                :options="geoUnionOptions"
                :option-label="geoLabelKey"
                :placeholder="t('Select the union')"
                :disabled="!form.upazila_id"
               :title="t('Select the union')" />
            </div>
            <div class="form-field">
              <label>{{ t("Village / Road") }}</label
              ><input v-model="form.village_road_holding_no" type="text"  :title="t('Village / road / holding number - e.g. 12, Uttar Para')"  :placeholder="t('Village / road / holding number - e.g. 12, Uttar Para')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
            </div>
            <div class="form-field">
              <label>{{ t("Post Office") }}</label
              ><input v-model="form.post_office" type="text"  :title="t('Nearest post office name')"  :placeholder="t('Nearest post office name')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
            </div>
            <div class="form-field">
              <label>{{ t("Post Code") }}</label
              ><input v-model.number="form.post_code" type="number"  :title="t('Postal code - e.g. 3100')"  :placeholder="t('Postal code - e.g. 3100')" />
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
              <h2>{{ t("Contact") }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ t("Institute Phone") }}</label
              ><input v-model="form.institute_phone" type="text"  :title="t('Contact phone number - e.g. 01712-345678')"  :placeholder="t('Contact phone number - e.g. 01712-345678')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ t("Email") }}</label
              ><input v-model="form.institute_email" type="email"  :title="t('Official email address - e.g. info@school.edu.bd')"  :placeholder="t('Official email address - e.g. info@school.edu.bd')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
            </div>
            <div class="form-field">
              <label>{{ t("Website") }}</label
              ><input v-model="form.website" type="text"  :title="t('Institute website URL - e.g. https://example.com')"  :placeholder="t('Institute website URL - e.g. https://example.com')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
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
              <h2>{{ t("Classification") }}</h2>
            </div>
          </div>
          <button
            type="button"
            class="ipf-add-btn"
            @click="addClassification"
            :title="t('Add classification')"
          >
            <i class="fa-duotone fa-plus" /> {{ t("Add") }}
          </button>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ t("Student Type") }}</label>
              <BaseCombobox
                v-model="form.student_type"
                :options="STUDENT_TYPE_OPTIONS"
                option-value="LookupText"
                :option-label="optLabelKey"
                :placeholder="t('Select the student type - Co-Education / Boys / Girls')"
               :title="t('Select the student type - Co-Education / Boys / Girls')" />
            </div>
            <div class="form-field">
              <label>{{ t("Shift") }}</label>
              <BaseCombobox
                v-model="form.shift_count"
                :options="SHIFT_COUNT_OPTIONS"
                option-value="LookupText"
                :option-label="optLabelKey"
                :placeholder="t('Select the shift - Day / Morning / Evening / Night')"
               :title="t('Select the shift - Day / Morning / Evening / Night')" />
            </div>
            <div class="form-field">
              <label>{{ t("English Version") }}</label>
              <BaseToggle
                v-model="form.has_english_version"
                :yes-label="t('Yes')"
                :no-label="t('No')"
                :title="t('Check if the institute has an English version')"
              />
            </div>
            <div class="form-field">
              <label>{{ t("Management") }}</label>
              <BaseCombobox
                v-model="form.management"
                :options="comboOptions(MANAGEMENTS)"
                :placeholder="t('Select the management type - Govt. / Non-Govt. etc.')"
               :title="t('Select the management type - Govt. / Non-Govt. etc.')" />
            </div>
          </div>

          <!-- Classification rows (added via "+") -->
          <div v-for="(row, i) in form.classifications" :key="i" class="ipf-class-row">
            <div class="ipf-class-row__head">
              <span class="ipf-class-row__num">#{{ i + 1 }}</span>
              <button type="button" class="ipf-array-card__remove" @click="removeClassification(i)">
                &times;
              </button>
            </div>
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>{{ t("Institute Type") }}</label>
                <BaseCombobox
                  v-model="row.institute_type"
                  :options="availableInstituteTypes(i)"
                  option-value="LookupText"
                  :option-label="optLabelKey"
                  :placeholder="t('Select the institute type - e.g. School & College')"
                 :title="t('Each type can be used only once')" />
              </div>
              <div class="form-field">
                <label>{{ t("Group") }}</label>
                <BaseCombobox
                  v-model="row.groups"
                  multiple
                  :options="GROUP_OPTIONS"
                  option-value="LookupText"
                  :option-label="optLabelKey"
                  :placeholder="t('Select one or more groups')"
                 :title="t('Select one or more groups')" />
              </div>
              <div class="form-field">
                <label>{{ t("MPO Status") }}</label>
                <BaseToggle
                  v-model="row.mpo_status"
                  :yes-label="t('Yes')"
                  :no-label="t('No')"
                />
              </div>
              <template v-if="row.mpo_status">
                <div class="form-field">
                  <label>{{ t("MPO Code") }}</label
                  ><input
                    v-model="row.mpo_code"
                    type="text"
                    v-bind="DP_DIGITS"
                    inputmode="numeric"
                    @input="onDigitsOnly"
                    :title="t('MPO code')"
                    :placeholder="t('MPO code')"
                  />
                </div>
                <div class="form-field">
                  <label>{{ t("MPO Date") }}</label>
                  <BaseDatePicker
                    v-model="row.mpo_date"
                    :title="t('Select the MPO approval date')"
                    :placeholder="t('DD/MM/YYYY')" />
                </div>
              </template>
            </div>
          </div>
          <p v-if="!form.classifications.length" class="ipf-class-empty">
            <i class="fa-duotone fa-plus" />
            {{
              t("Press 'Add' above to add an institute type, groups and MPO info")
            }}
          </p>
        </div>
      </div>

      <!-- ── 6. Identifiers ───────────────────────────── -->
      <div class="ipf-section">
        <div class="ipf-section__head">
          <div class="ipf-section__title">
            <i class="fa-duotone fa-hashtag" />
            <div>
              <h2>{{ t("Identifiers") }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>EIIN</label><input v-model="form.eiin" type="text" v-bind="DP_DIGITS"  :title="t('EIIN number (11 digits) - e.g. 130430')"  :placeholder="t('EIIN number (11 digits) - e.g. 130430')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ t("Board Code") }}</label
              ><input v-model="form.board_institute_code" type="text" v-bind="DP_DIGITS"  :title="t('Board institute code - e.g. 110123')"  :placeholder="t('Board institute code - e.g. 110123')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ t("Technical Board Code") }}</label
              ><input v-model="form.technical_board_code" type="text" v-bind="DP_DIGITS"  :title="t('Technical board code - if applicable')"  :placeholder="t('Technical board code - if applicable')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ t("MPO Code") }}</label
              ><input v-model="form.mpo_code" type="text" v-bind="DP_DIGITS"  :title="t('MPO code of the institute')"  :placeholder="t('MPO code of the institute')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ t("Tech. Branch MPO Code") }}</label
              ><input v-model="form.technical_branch_mpo_code" type="text" v-bind="DP_DIGITS"  :title="t('MPO code of the technical branch')"  :placeholder="t('MPO code of the technical branch')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ t("Stipend Code") }}</label
              ><input v-model="form.stipend_code" type="text" v-bind="DP_DIGITS"  :title="t('Stipend code - if applicable')"  :placeholder="t('Stipend code - if applicable')"  inputmode="numeric" @input="onDigitsOnly" />
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
              <h2>{{ t('profile.staff') }}</h2>
            </div>
          </div>
          <div class="ipf-staff-total" :title="t('Total staffs')">
            <i class="fa-duotone fa-calculator" />
            <span>
              {{ t('staff.total') }}:
              <strong>{{ staffTotal }}</strong>
            </span>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ t('staff.total') }}</label
              ><input v-model.number="form.staff_total" type="number" v-bind="MAX3"  :title="t('Total number of staff members')"  :placeholder="t('Total number of staff members')"  @input="onStaffInput('staff_total')" />
            </div>
            <div class="form-field">
              <label>{{ t('staff.male') }}</label
              ><input v-model.number="form.staff_male" type="number" v-bind="MAX3"  :title="t('Number of male staff members')"  :placeholder="t('Number of male staff members')"  @input="onStaffInput('staff_male')" />
            </div>
            <div class="form-field">
              <label>
                {{ t('staff.female') }}
                <small class="ipf-field-auto">{{ t('staff.auto') }}</small>
              </label
              ><input
                type="number"
                readonly
                :value="form.staff_female ?? ''"
                class="ipf-field-readonly"
                :title="t('Auto-calculated: Total Staffs − Male Staffs')"
                :placeholder="t('Auto (Total − Male)')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('staff.mpo') }}</label
              ><input v-model.number="form.staff_mpo" type="number" v-bind="MAX3"  :title="t('Number of staff under MPO')"  :placeholder="t('Number of staff under MPO')"  @input="onStaffInput('staff_mpo')" />
            </div>
            <div class="form-field">
              <label>
                {{ t('staff.nonMpo') }}
                <small class="ipf-field-auto">{{ t('staff.auto') }}</small>
              </label
              ><input
                type="number"
                readonly
                :value="form.staff_nonmpo ?? ''"
                class="ipf-field-readonly"
                :title="t('Auto-calculated: Total Staffs − MPO Staffs')"
                :placeholder="t('Auto (Total − MPO)')"
              />
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
              <h2>{{ t("Bank Account") }}</h2>
            </div>
          </div>
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ t("Bank Name") }}</label>
              <BaseCombobox
                v-model="form.bank_name"
                :options="BANK_OPTIONS"
                option-value="LookupText"
                :option-label="optLabelKey"
                :placeholder="t('Select the bank name')"
               :title="t('Select the bank name')" />
            </div>
            <div class="form-field">
              <label>{{ t("Branch") }}</label
              ><input v-model="form.bank_branch" type="text"  :title="t('Bank branch name - e.g. Sylhet Main Branch')"  :placeholder="t('Bank branch name - e.g. Sylhet Main Branch')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
            </div>
            <div class="form-field">
              <label>{{ t("Account Type") }}</label>
              <BaseCombobox
                v-model="form.bank_account_type"
                :options="ACCOUNT_TYPE_OPTIONS"
                option-value="LookupText"
                :option-label="optLabelKey"
                :placeholder="t('Select the account type - Savings / Current / FD')"
               :title="t('Select the account type - Savings / Current / FD')" />
            </div>
            <div class="form-field">
              <label>{{ t("Account Holder") }}</label
              ><input v-model="form.bank_account_holder" type="text"  :title="t('Name of the account holder')"  :placeholder="t('Name of the account holder')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
            </div>
            <div class="form-field">
              <label>{{ t("Account Number") }}</label
              ><input v-model="form.bank_account_number" type="text"  :title="t('Bank account number')"  :placeholder="t('Bank account number')"  inputmode="numeric" @input="onDigitsOnly" />
            </div>
            <div class="form-field">
              <label>{{ t("Account Purpose") }}</label>
              <BaseCombobox
                v-model="form.bank_account_purpose"
                :options="ACCOUNT_PURPOSE_OPTIONS"
                option-value="LookupText"
                :option-label="optLabelKey"
                :placeholder="t('Select the purpose of the account')"
               :title="t('Select the purpose of the account')" />
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
              <h2>{{ t('profile.committee') }}</h2>
              <span>{{ form.committee_members.length }} {{ t("members") }}</span>
            </div>
          </div>
          <button
            type="button"
            class="ipf-add-btn"
            @click="addCommittee"
            :title="t('Add member')"
          >
            <i class="fa-duotone fa-plus" /> {{ t("Add") }}
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
                <label>{{ t("Member Name") }}</label
                ><input v-model="form.committee_members[i].member_name" type="text"  :title="t('Member full name')"  :placeholder="t('Member full name')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
              </div>
              <div class="form-field">
                <label>{{ t("Joining Date") }}</label>
                <BaseDatePicker v-model="form.committee_members[i].joining_date"  :title="t('Select the date the member joined the committee')"  :placeholder="t('DD/MM/YYYY')" />
              </div>
              <div class="form-field">
                <label>{{ t("Phone") }}</label
                ><input v-model="form.committee_members[i].phone" type="text"  :title="t('Member contact number')"  :placeholder="t('Member contact number')"  inputmode="numeric" @input="onDigitsOnly" />
              </div>
              <div class="form-field">
                <label>{{ t("Gender") }}</label>
                <BaseCombobox
                  v-model="form.committee_members[i].gender"
                  :options="GENDER_OPTIONS"
                  option-value="LookupText"
                  :option-label="optLabelKey"
                  :placeholder="t('Select the gender')"
                 :title="t('Select the gender')" />
              </div>
              <div class="form-field">
                <label>{{ t("Committee Position") }}</label>
                <BaseCombobox
                  v-model="form.committee_members[i].committee_position"
                  :options="COMMITTEE_POSITION_OPTIONS"
                  option-value="LookupText"
                  :option-label="optLabelKey"
                  :placeholder="t('Select the position in the committee')"
                 :title="t('Select the position in the committee')" />
              </div>
              <div class="form-field">
                <label>{{ t("Education") }}</label
                ><input v-model="form.committee_members[i].education_qualification" type="text"  :title="t('Highest education qualification')"  :placeholder="t('Highest education qualification')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
              </div>
              <div class="form-field">
                <label>{{ t("Occupation") }}</label
                ><input v-model="form.committee_members[i].occupation" type="text"  :title="t('Current occupation')"  :placeholder="t('Current occupation')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
              </div>
              <div class="form-field">
                <label>{{ t("Left Committee") }}</label>
                <BaseToggle
                  v-model="form.committee_members[i].left_committee"
                  :yes-label="t('Yes')"
                  :no-label="t('No')"
                  :title="t('Check if the member has left the committee')"
                />
              </div>
              <div v-if="form.committee_members[i].left_committee" class="form-field">
                <label>{{ t("Reason for Leaving") }}</label
                ><input v-model="form.committee_members[i].reason_for_leaving" type="text"  :title="t('Reason for leaving the committee')"  :placeholder="t('Reason for leaving the committee')"  @input="onNormalizeInput" @blur="onNormalizeBlur" />
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
              <h2>{{ t('profile.facilities') }}</h2>
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
              :title="t(FACILITY_HELP[key]?.en ?? key)"
              @click="form.facilities[key] = !val"
            >
              <span class="ipf-toggle-btn__name">
                <i :class="['fa-duotone', FACILITY_ICONS[key] ?? 'fa-circle']" />
                <span class="ipf-toggle-btn__label">{{
                  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                }}</span>
              </span>
              <span class="ipf-toggle-btn__state">{{
                val ? (t("Yes")) : t("No")
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
        <span>{{ t('profile.saveHint') }}</span>
      </div>
      <div class="ipf-savebar__actions">
        <button type="button" class="btn btn--primary" :disabled="isSaving" @click="handleSave">
          <i class="fa-duotone fa-floppy-disk" />
          {{
            isSaving ? t("Saving...") : t("Save Profile")
          }}
        </button>
      </div>
    </div>

    <!-- ── Profile preview modal ─────────────────────── -->
    <BaseModal
      v-if="showPreview"
      :title="t('Institute Profile')"
      wide
      @close="showPreview = false"
    >
      <InstituteProfilePreviewModal :form="form as unknown as Record<string, unknown>" />
      <template #footer>
        <button type="button" class="btn btn--primary" @click="showPreview = false">
          <i class="fa-duotone fa-xmark" /> {{ t("Close") }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>
