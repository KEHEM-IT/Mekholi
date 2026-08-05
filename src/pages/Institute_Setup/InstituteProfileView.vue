<!-- Institute Setup > Institute Profile -->
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, watch } from "vue";
import { useAppPreferences } from "@/composables/useAppPreferences";
import { useShortcutKeySet } from "@/composables/shortcut_key_set";
import { isSaving, saveProfile, loadProfile } from "@/composables/useInstituteProfile";
import BaseCombobox from "@/components/ui/BaseCombobox.vue";
import banksJson from "@/assets/jsons/banks.json";
import gendersJson from "@/assets/jsons/genders.json";
import committeePositionsJson from "@/assets/jsons/committee_positions.json";
import {
  BD_GEO_DIVISIONS,
  districtsByDivisionId,
  upazilasByDistrictId,
  unionsByUpazilaId,
} from "@/utils/bdGeo";

defineOptions({ name: "InstituteProfile" });

const { preferences } = useAppPreferences();
const isBn = computed(() => preferences.uiLanguage === "bn");

// ── Constants / Option lists ──────────────────────────────────────────────

const INSTITUTE_TYPES = [
  "Primary",
  "Secondary",
  "Higher Secondary",
  "School & College",
  "Dakhil",
  "Alim",
  "Fazil",
  "Kamil",
  "SSC (Vocational)",
  "HSC (Vocational)",
  "Polytechnic Institute",
  "Technical School & College (TSC)",
  "Agricultural Diploma Institute",
  "Nursing Institute",
  "Medical College",
  "University",
  "College (Degree/Honours)",
  "Teachers' Training College",
];

const GROUPS = [
  "Science",
  "Business Studies",
  "Humanities",
  "General",
  "Vocational",
  "Agriculture",
  "Home Economics",
  "Madrasah",
  "Arts",
  "Commerce",
];

const STUDENT_TYPES = ["সহশিক্ষা (Co-Education)", "বালক (Boys)", "বালিকা (Girls)"];

const SHIFT_COUNTS = ["Day", "Morning", "Evening", "Night"];

const MANAGEMENTS = [
  "Autonomous - স্বায়িত্বশাসিত",
  "Govt. - সরকারি",
  "Local Govt. - স্থানীয় সরকার",
  "Non-Govt. - বেসরকারি",
  "Others - অন্যান্য",
];

const ACCOUNT_TYPES = ["Savings", "Current", "FD", "Other"];
const ACCOUNT_PURPOSES = [
  "বিদ্যালয়ের পরিচালনা",
  "বিদ্যালয় পরিচালনা",
  "Saving Account",
  "খেলা তহবিল",
  "স্কাউট তহবিল",
  "দরিদ্র তহবিল",
  "কমন রুম তহবিল",
  "বৃক্ষ তহবিল",
  "ম্যাগাজিন তহবিল",
  "সেবা তহবিল",
  "মসজিদ তহবিল",
  "মিলাদ তহবিল",
  "পূজা তহবিল",
  "বিবিধ তহবিল",
  "পরীক্ষা তহবিল",
  "পরিস্কার তহবিল",
  "কম্পিউটার তহবিল",
  "সংস্কৃতি তহবিল",
  "রেড ক্রিসেন্ট তহবিল",
  "নৈশ প্রহরী তহবিল",
  "নবীন বরণ তহবিল",
  "Transection",
  "Other",
];

const DP_DIGITS = { maxlength: 10 };
const MAX3 = { maxlength: 3 };

// ── Form State ────────────────────────────────────────────────────────────

const form = reactive({
  // Identity
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

// While restoring a saved profile we must NOT run the geo cascade resets —
// the watchers below would otherwise clear the loaded child selections
// (district / upazila / union) the moment division_id is assigned.
let isRestoringProfile = false;

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

// Committee member gender options (English + Bangla)
const GENDER_OPTIONS = gendersJson;

// Committee member position options (English + Bangla), "Others" last
const COMMITTEE_POSITION_OPTIONS = committeePositionsJson;

// Font Awesome 6 Pro icon for each facility toggle
const FACILITY_ICONS: Record<string, string> = {
  play_ground: "fa-futbol",
  electricity: "fa-bolt",
  tubewell: "fa-faucet-drip",
  tap: "fa-faucet",
  transport: "fa-bus-school",
  auditorium: "fa-people-roof",
  gas: "fa-fire",
  canteen: "fa-utensils",
  audio_sound: "fa-volume-high",
  health_aid: "fa-kit-medical",
  gymnasium: "fa-dumbbell",
  audio_visual: "fa-projector",
  television: "fa-tv",
  boundary_wall: "fa-brick-wall",
  solar_panel: "fa-solar-panel",
};

// ── Save ──────────────────────────────────────────────────────────────────

// ── Save / Load ───────────────────────────────────────────────────────

async function handleSave() {
  await saveProfile({ ...form });
}

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
        // Assign values from loaded partial data
        // Index via Record<..., unknown> to avoid any-casts
        (form as Record<keyof typeof form, unknown>)[key] = data[key];
      }
    }
    // Let queued watchers run (they no-op via the flag), then restore behavior
    await nextTick();
    isRestoringProfile = false;
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
      <h1>{{ isBn ? "ইনস্টিটিউট প্রোফাইল" : "Institute Profile" }}</h1>
      <p>
        {{ isBn ? "আপনার প্রতিষ্ঠানের তথ্য সম্পাদনা করুন।" : "Edit your institute information." }}
      </p>
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
          <div class="ipf-grid">
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠানের নাম (বাংলায়)" : "Institute Name (Bangla)" }}</label
              ><input v-model="form.institute_name_bn" type="text" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠানের নাম (ইংরেজি)" : "Institute Name (English)" }}</label
              ><input v-model="form.institute_name_en" type="text" />
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
              ><input v-model="form.founder_name" type="text" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "প্রতিষ্ঠার তারিখ" : "Est. Date" }}</label
              ><input v-model="form.establishment_date" type="date" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "সংসদীয় আসন" : "Parliamentary Constituency" }}</label
              ><input v-model="form.parliamentary_constituency" type="text" />
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
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "জেলা" : "District" }}</label>
              <BaseCombobox
                v-model="form.district_id"
                option-value="id"
                :options="geoDistrictOptions"
                option-label="LookupText"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
                :disabled="!form.division_id"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "উপজেলা/থানা" : "Upazila / Thana" }}</label>
              <BaseCombobox
                v-model="form.upazila_id"
                option-value="id"
                :options="geoUpazilaOptions"
                option-label="LookupText"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
                :disabled="!form.district_id"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ইউনিয়ন" : "Union" }}</label>
              <BaseCombobox
                v-model="form.union_id"
                option-value="id"
                :options="geoUnionOptions"
                option-label="LookupText"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
                :disabled="!form.upazila_id"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "গ্রাম/হোল্ডিং/রোড" : "Village / Road" }}</label
              ><input v-model="form.village_road_holding_no" type="text" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ডাকঘর" : "Post Office" }}</label
              ><input v-model="form.post_office" type="text" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "পোস্ট কোড" : "Post Code" }}</label
              ><input v-model.number="form.post_code" type="number" />
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
              ><input v-model="form.institute_phone" type="text" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ইমেইল" : "Email" }}</label
              ><input v-model="form.institute_email" type="email" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ওয়েবসাইট" : "Website" }}</label
              ><input v-model="form.website" type="text" />
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
                :options="comboOptions(INSTITUTE_TYPES)"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "সংযুক্ত কারিগরি শাখা" : "Attached Tech. Branch" }}</label>
              <BaseCombobox
                v-model="form.attached_technical_branch_type"
                :options="comboOptions(INSTITUTE_TYPES)"
                :placeholder="isBn ? 'প্রযোজ্য নয়' : 'N/A'"
                :clearable="false"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "গ্রুপ" : "Group" }}</label>
              <BaseCombobox
                v-model="form.group"
                :options="comboOptions(GROUPS)"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "কাদের জন্য" : "Student Type" }}</label>
              <BaseCombobox
                v-model="form.student_type"
                :options="comboOptions(STUDENT_TYPES)"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "শিফট সংখ্যা" : "Shift Count" }}</label>
              <BaseCombobox
                v-model="form.shift_count"
                :options="comboOptions(SHIFT_COUNTS)"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "ইংরেজি ভার্সন" : "English Version" }}</label>
              <div class="form-field__check">
                <input id="eng-ver" v-model="form.has_english_version" type="checkbox" />
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
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
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
              <label>EIIN</label><input v-model="form.eiin" type="text" v-bind="DP_DIGITS" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "বোর্ড কোড" : "Board Code" }}</label
              ><input v-model="form.board_institute_code" type="text" v-bind="DP_DIGITS" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "কারিগরি বোর্ড কোড" : "Technical Board Code" }}</label
              ><input v-model="form.technical_board_code" type="text" v-bind="DP_DIGITS" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "এমপিও কোড" : "MPO Code" }}</label
              ><input v-model="form.mpo_code" type="text" v-bind="DP_DIGITS" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "কারিগরি এমপিও কোড" : "Tech. Branch MPO Code" }}</label
              ><input v-model="form.technical_branch_mpo_code" type="text" v-bind="DP_DIGITS" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "উপবৃত্তি কোড" : "Stipend Code" }}</label
              ><input v-model="form.stipend_code" type="text" v-bind="DP_DIGITS" />
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
                <input id="gen-mpo" v-model="form.general_mpo" type="checkbox" />
                <label for="gen-mpo" class="form-field__check-label">{{
                  form.general_mpo ? (isBn ? "হ্যাঁ" : "Yes") : isBn ? "না" : "No"
                }}</label>
              </div>
              <input
                v-if="form.general_mpo"
                v-model="form.general_mpo_code"
                type="text"
                v-bind="DP_DIGITS"
                :placeholder="isBn ? 'এমপিও কোড' : 'MPO Code'"
                style="margin-top: 0.5rem"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "কারিগরি শাখা এমপিওভুক্ত?" : "Technical Branch MPO?" }}</label>
              <div class="form-field__check">
                <input id="tech-mpo" v-model="form.tech_mpo" type="checkbox" />
                <label for="tech-mpo" class="form-field__check-label">{{
                  form.tech_mpo ? (isBn ? "হ্যাঁ" : "Yes") : isBn ? "না" : "No"
                }}</label>
              </div>
              <input
                v-if="form.tech_mpo"
                v-model="form.tech_mpo_code"
                type="text"
                v-bind="DP_DIGITS"
                :placeholder="isBn ? 'এমপিও কোড' : 'MPO Code'"
                style="margin-top: 0.5rem"
              />
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
        </div>
        <div class="ipf-section__body">
          <div class="ipf-grid ipf-grid--three">
            <div class="form-field">
              <label>{{ isBn ? "বর্তমানে কর্মরত (পুরুষ)" : "Currently Working (Male)" }}</label
              ><input v-model.number="form.staff_male" type="number" v-bind="MAX3" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "বর্তমানে কর্মরত (মহিলা)" : "Currently Working (Female)" }}</label
              ><input v-model.number="form.staff_female" type="number" v-bind="MAX3" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "এমপিও (পুরুষ)" : "MPO Staff (Male)" }}</label
              ><input v-model.number="form.staff_mpo_male" type="number" v-bind="MAX3" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "এমপিও (মহিলা)" : "MPO Staff (Female)" }}</label
              ><input v-model.number="form.staff_mpo_female" type="number" v-bind="MAX3" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "অ-এমপিও (পুরুষ)" : "Non-MPO Staff (Male)" }}</label
              ><input v-model.number="form.staff_nonmpo_male" type="number" v-bind="MAX3" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "অ-এমপিও (মহিলা)" : "Non-MPO Staff (Female)" }}</label
              ><input v-model.number="form.staff_nonmpo_female" type="number" v-bind="MAX3" />
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
              <label>{{ isBn ? "মাধ্যমিক এমপিও তারিখ" : "Secondary MPO Date" }}</label
              ><input v-model="form.secondary_mpo_date" type="date" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "মাধ্যমিক এমপিও কোড" : "Secondary MPO Code" }}</label
              ><input v-model="form.secondary_mpo_code" type="text" v-bind="DP_DIGITS" />
            </div>
          </div>
          <div v-if="showHigherSecondaryMpo" class="ipf-grid" style="margin-top: 1rem">
            <div class="form-field">
              <label>{{ isBn ? "উচ্চ মাধ্যমিক এমপিও তারিখ" : "Higher Secondary MPO Date" }}</label
              ><input v-model="form.higher_secondary_mpo_date" type="date" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "উচ্চ মাধ্যমিক এমপিও কোড" : "Higher Secondary MPO Code" }}</label
              ><input v-model="form.higher_secondary_mpo_code" type="text" v-bind="DP_DIGITS" />
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
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "শাখা" : "Branch" }}</label
              ><input v-model="form.bank_branch" type="text" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "হিসাবের ধরন" : "Account Type" }}</label>
              <BaseCombobox
                v-model="form.bank_account_type"
                :options="comboOptions(ACCOUNT_TYPES)"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "একাউন্ট হোল্ডার" : "Account Holder" }}</label
              ><input v-model="form.bank_account_holder" type="text" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "হিসাব নম্বর" : "Account Number" }}</label
              ><input v-model="form.bank_account_number" type="text" />
            </div>
            <div class="form-field">
              <label>{{ isBn ? "হিসাবের উদ্দেশ্য" : "Account Purpose" }}</label>
              <BaseCombobox
                v-model="form.bank_account_purpose"
                :options="comboOptions(ACCOUNT_PURPOSES)"
                :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
              />
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
                ><input v-model="form.committee_members[i].member_name" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "যোগদানের তারিখ" : "Joining Date" }}</label
                ><input v-model="form.committee_members[i].joining_date" type="date" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "ফোন" : "Phone" }}</label
                ><input v-model="form.committee_members[i].phone" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "লিঙ্গ" : "Gender" }}</label>
                <BaseCombobox
                  v-model="form.committee_members[i].gender"
                  :options="GENDER_OPTIONS"
                  option-value="LookupText"
                  option-label="LookupText"
                  :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
                />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "কমিটিতে অবস্থান" : "Committee Position" }}</label>
                <BaseCombobox
                  v-model="form.committee_members[i].committee_position"
                  :options="COMMITTEE_POSITION_OPTIONS"
                  option-value="LookupText"
                  option-label="LookupText"
                  :placeholder="isBn ? 'নির্বাচন করুন' : 'Select'"
                />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "শিক্ষাগত যোগ্যতা" : "Education" }}</label
                ><input v-model="form.committee_members[i].education_qualification" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "পেশা" : "Occupation" }}</label
                ><input v-model="form.committee_members[i].occupation" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? "কমিটি ত্যাগ" : "Left Committee" }}</label>
                <div class="form-field__check">
                  <input
                    :id="`left-cmt-${i}`"
                    v-model="form.committee_members[i].left_committee"
                    type="checkbox"
                  />
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
                ><input v-model="form.committee_members[i].reason_for_leaving" type="text" />
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
  </section>
</template>
