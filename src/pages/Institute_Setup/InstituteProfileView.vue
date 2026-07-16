<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import { useAppPreferences } from "@/composables/useAppPreferences";
import { useInstituteProfile } from "@/composables/Institute_Setup/useInstituteProfile";
import {
  ACADEMIC_GROUP_OPTIONS,
  ACADEMIC_VERSIONS,
  EDUCATION_BOARDS,
  FACILITY_OPTIONS,
  INSTITUTE_SHIFTS,
  INSTITUTION_LEVELS,
  INSTITUTION_TYPES,
  MANAGEMENT_TYPES,
  MEDIUM_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PROFILE_STATUSES,
  STUDY_TYPES,
  WORKING_DAY_OPTIONS,
} from "@/utils/constants";
import {
  BD_GEO_DISTRICTS,
  BD_GEO_DIVISIONS,
  districtsByDivisionId,
  findDistrictByName,
  findDivisionByName,
  findUpazilaByName,
  unionsByUpazilaId,
  upazilasByDistrictId,
} from "@/utils/bdGeo";

const { preferences } = useAppPreferences();
const { profile } = useInstituteProfile();

const isBn = computed(() => preferences.uiLanguage === "bn");

// --- Loading skeleton -----------------------------------------------------
// The profile itself loads synchronously from localStorage today, but the
// page still shows a brief skeleton on mount so the UI is consistent with
// the eventual API-backed load (board/BANBEIS metadata, etc.) instead of a
// hard cut from blank to fully-rendered.
const isLoading = ref(true);
onMounted(() => {
  window.setTimeout(() => {
    isLoading.value = false;
  }, 400);
});

const selectedType = computed(
  () =>
    INSTITUTION_TYPES.find((opt) => opt.value === profile.institutionType) ?? INSTITUTION_TYPES[0],
);
const selectedBoard = computed(
  () => EDUCATION_BOARDS.find((opt) => opt.value === profile.educationBoard) ?? EDUCATION_BOARDS[0],
);
const selectedStatus = computed(
  () => PROFILE_STATUSES.find((opt) => opt.value === profile.status) ?? PROFILE_STATUSES[0],
);

// --- Division -> District -> Upazila -> Union cascading selects -----------
// Backed by the real BD geolocation dataset (src/assets/geolocation).
// profile.division/district/upazila/union store plain English names (same
// convention as before), so each level looks up its parent's id by name to
// filter the next level's options.
const selectedDivisionId = computed(() => findDivisionByName(profile.division)?.id ?? "");
const districtOptions = computed(() =>
  selectedDivisionId.value ? districtsByDivisionId(selectedDivisionId.value) : BD_GEO_DISTRICTS,
);

const selectedDistrictId = computed(() => findDistrictByName(profile.district)?.id ?? "");
const upazilaOptions = computed(() =>
  selectedDistrictId.value ? upazilasByDistrictId(selectedDistrictId.value) : [],
);

const selectedUpazilaId = computed(() => findUpazilaByName(profile.upazila)?.id ?? "");
const unionOptions = computed(() =>
  selectedUpazilaId.value ? unionsByUpazilaId(selectedUpazilaId.value) : [],
);

// Changing a level clears any child value that no longer belongs to the
// new parent's list, so the form never shows a stale mismatched chain.
function onDivisionChange() {
  if (profile.district && !districtOptions.value.some((d) => d.name === profile.district)) {
    profile.district = "";
  }
  if (profile.upazila && !upazilaOptions.value.some((u) => u.name === profile.upazila)) {
    profile.upazila = "";
  }
  if (profile.union && !unionOptions.value.some((u) => u.name === profile.union)) {
    profile.union = "";
  }
}

function onDistrictChange() {
  if (profile.upazila && !upazilaOptions.value.some((u) => u.name === profile.upazila)) {
    profile.upazila = "";
  }
  if (profile.union && !unionOptions.value.some((u) => u.name === profile.union)) {
    profile.union = "";
  }
}

function onUpazilaChange() {
  if (profile.union && !unionOptions.value.some((u) => u.name === profile.union)) {
    profile.union = "";
  }
}

// EIIN is a 6-digit government identifier (blueprint 2.2) - only flag it
// once something has been typed, so a fresh/empty form doesn't open with
// an error already showing.
const eiinError = computed(() => {
  if (!profile.eiin) return "";
  if (!/^\d{6}$/.test(profile.eiin)) {
    return isBn.value ? "EIIN অবশ্যই ৬ সংখ্যার হতে হবে" : "EIIN must be exactly 6 digits";
  }
  return "";
});

// --- Logo / letterhead / seal upload ----------------------------------------
// Read straight into a data URL and hold it on the profile object - no
// backend yet, so this is the same "good enough for a prototype" approach
// as the rest of the persisted settings (see useInstituteProfile).
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function onLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  profile.logoDataUrl = await readAsDataUrl(file);
}

async function onLetterheadChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  profile.letterheadDataUrl = await readAsDataUrl(file);
}

async function onSealChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  profile.sealImage = await readAsDataUrl(file);
}

function clearLogo() {
  profile.logoDataUrl = null;
}

function clearLetterhead() {
  profile.letterheadDataUrl = null;
}

function clearSeal() {
  profile.sealImage = null;
}

// --- Multi-select chip toggles ---------------------------------------------
// Working days, academic groups, mediums, and payment methods are all
// plain string[] fields on the profile - clicking a chip adds/removes its
// value from the array in place (the profile is a reactive() object, so
// array mutation is tracked and auto-persisted same as any other field).
function toggleArrayValue(list: string[], value: string) {
  const idx = list.indexOf(value);
  if (idx === -1) list.push(value);
  else list.splice(idx, 1);
}

// --- Save affordance ----------------------------------------------------
// Same pattern as the Language & Theme page: the profile already persists
// live via useInstituteProfile's watcher, so "Save" is just an explicit
// confirmation moment.
const justSaved = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | null = null;

function handleSave() {
  justSaved.value = true;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (justSaved.value = false), 2500);
}
</script>

<template>
  <section class="ipf">
    <template v-if="isLoading">
      <div class="ipf-header">
        <span class="skeleton ipf-skel-title" />
        <span class="skeleton ipf-skel-subtitle" />
      </div>

      <div class="ipf-layout">
        <div class="ipf-main">
          <div v-for="n in 4" :key="n" class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <span class="skeleton ipf-skel-icon" />
                <div>
                  <span class="skeleton ipf-skel-heading" />
                  <span class="skeleton ipf-skel-hint" />
                </div>
              </div>
            </div>
            <div class="ipf-section__body">
              <div class="ipf-grid">
                <span v-for="i in 4" :key="i" class="skeleton ipf-skel-field" />
              </div>
            </div>
          </div>
        </div>

        <div class="ipf-side">
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <span class="skeleton ipf-skel-icon" />
                <div>
                  <span class="skeleton ipf-skel-heading" />
                  <span class="skeleton ipf-skel-hint" />
                </div>
              </div>
            </div>
            <div class="ipf-section__body">
              <div class="ipf-upload">
                <span class="skeleton ipf-skel-square" />
                <div class="ipf-upload__controls">
                  <span class="skeleton ipf-skel-heading" />
                  <span class="skeleton ipf-skel-hint" />
                </div>
              </div>
              <div class="ipf-divider" />
              <div class="ipf-upload">
                <span class="skeleton ipf-skel-wide" />
                <div class="ipf-upload__controls">
                  <span class="skeleton ipf-skel-heading" />
                  <span class="skeleton ipf-skel-hint" />
                </div>
              </div>
            </div>
          </div>

          <div class="ipf-preview">
            <span class="skeleton ipf-skel-band" />
            <div class="ipf-preview__body">
              <span class="skeleton ipf-skel-heading" />
              <span class="skeleton ipf-skel-line" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="ipf-header">
        <h1>{{ isBn ? "প্রতিষ্ঠান প্রোফাইল ও EIIN" : "Institute Profile & EIIN" }}</h1>
        <p>
          {{
            isBn
              ? "প্রতিষ্ঠানের নাম, EIIN, ধরন, বোর্ড সংশ্লিষ্টতা এবং যোগাযোগের তথ্য নির্ধারণ করুন। বোর্ড/BANBEIS/EMIS এক্সপোর্টে এই তথ্য ব্যবহৃত হবে।"
              : "Set your institution's name, EIIN, type, board affiliation, and contact details. This information is used across board/BANBEIS/EMIS exports and printed documents."
          }}
        </p>
      </div>

      <div class="ipf-layout">
        <div class="ipf-main">
          <!-- Basic Information -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-id-card" />
                <div>
                  <h2>{{ isBn ? "মৌলিক তথ্য" : "Basic Information" }}</h2>
                  <span>{{
                    isBn
                      ? "প্রতিষ্ঠানের নাম, EIIN এবং শ্রেণিবিন্যাস"
                      : "Institution's name, EIIN, and classification"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-grid">
                <div class="form-field">
                  <label>{{
                    isBn ? "প্রতিষ্ঠানের নাম (ইংরেজি)" : "Institution Name (English)"
                  }}</label>
                  <input
                    v-model="profile.nameEn"
                    type="text"
                    placeholder="e.g. Sylhet Model High School"
                  />
                </div>

                <div class="form-field">
                  <label>{{
                    isBn ? "প্রতিষ্ঠানের নাম (বাংলা)" : "Institution Name (Bangla)"
                  }}</label>
                  <input
                    v-model="profile.nameBn"
                    type="text"
                    placeholder="যেমন: সিলেট মডেল উচ্চ বিদ্যালয়"
                  />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "সংক্ষিপ্ত নাম" : "Short Name" }}</label>
                  <input v-model="profile.shortName" type="text" placeholder="e.g. SMHS" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "EIIN" : "EIIN" }}</label>
                  <input
                    v-model="profile.eiin"
                    type="text"
                    inputmode="numeric"
                    maxlength="6"
                    placeholder="e.g. 123456"
                    :class="{ 'has-error': eiinError }"
                  />
                  <span v-if="eiinError" class="form-error">{{ eiinError }}</span>
                  <span v-else class="form-hint">
                    {{
                      isBn
                        ? "৬-সংখ্যার সরকারি শনাক্তকরণ নম্বর"
                        : "6-digit government identification number"
                    }}
                  </span>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "EMIS কোড" : "EMIS Code" }}</label>
                  <input v-model="profile.emisCode" type="text" placeholder="optional" />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "প্রতিষ্ঠা সাল" : "Established Year" }}</label>
                  <input v-model="profile.establishedYear" type="number" placeholder="e.g. 1998" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "স্বীকৃতির তারিখ" : "Recognition Date" }}</label>
                  <input v-model="profile.recognitionDate" type="date" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "নিবন্ধন / MPO কোড" : "Registration / MPO Code" }}</label>
                  <input v-model="profile.registrationCode" type="text" placeholder="optional" />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "প্রতিষ্ঠানের ধরন" : "Institution Type" }}</label>
                  <select v-model="profile.institutionType">
                    <option v-for="opt in INSTITUTION_TYPES" :key="opt.value" :value="opt.value">
                      {{ isBn ? opt.label_bn : opt.label }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "শিক্ষা স্তর" : "Institution Level" }}</label>
                  <select v-model="profile.institutionLevel">
                    <option v-for="opt in INSTITUTION_LEVELS" :key="opt.value" :value="opt.value">
                      {{ isBn ? opt.label_bn : opt.label }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "শিক্ষা বোর্ড" : "Education Board" }}</label>
                  <select v-model="profile.educationBoard">
                    <option v-for="opt in EDUCATION_BOARDS" :key="opt.value" :value="opt.value">
                      {{ isBn ? opt.label_bn : opt.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "ব্যবস্থাপনা" : "Management" }}</label>
                  <select v-model="profile.management">
                    <option v-for="opt in MANAGEMENT_TYPES" :key="opt.value" :value="opt.value">
                      {{ isBn ? opt.label_bn : opt.label }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "একাডেমিক ভার্সন" : "Academic Version" }}</label>
                  <select v-model="profile.academicVersion">
                    <option v-for="opt in ACADEMIC_VERSIONS" :key="opt.value" :value="opt.value">
                      {{ isBn ? opt.label_bn : opt.label }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "শিক্ষার্থীর ধরন" : "Study Type" }}</label>
                  <select v-model="profile.studyType">
                    <option v-for="opt in STUDY_TYPES" :key="opt.value" :value="opt.value">
                      {{ isBn ? opt.label_bn : opt.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "শিফট" : "Shift" }}</label>
                  <select v-model="profile.shift">
                    <option v-for="opt in INSTITUTE_SHIFTS" :key="opt.value" :value="opt.value">
                      {{ isBn ? opt.label_bn : opt.label }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "এমপিও স্ট্যাটাস" : "MPO Status" }}</label>
                  <button
                    type="button"
                    role="switch"
                    class="switch"
                    :class="{ 'is-on': profile.mpoStatus }"
                    :aria-checked="profile.mpoStatus"
                    @click="profile.mpoStatus = !profile.mpoStatus"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Location -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-map-location-dot" />
                <div>
                  <h2>{{ isBn ? "অবস্থান" : "Location" }}</h2>
                  <span>{{
                    isBn
                      ? "বিভাগ, জেলা ও প্রশাসনিক ঠিকানার বিবরণ"
                      : "Division, district, and administrative address breakdown"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "বিভাগ" : "Division" }}</label>
                  <select v-model="profile.division" @change="onDivisionChange">
                    <option value="" disabled>
                      {{ isBn ? "নির্বাচন করুন" : "Select division" }}
                    </option>
                    <option v-for="opt in BD_GEO_DIVISIONS" :key="opt.id" :value="opt.name">
                      {{ isBn ? opt.bn_name : opt.name }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "জেলা" : "District" }}</label>
                  <select v-model="profile.district" @change="onDistrictChange">
                    <option value="" disabled>
                      {{ isBn ? "নির্বাচন করুন" : "Select district" }}
                    </option>
                    <option v-for="opt in districtOptions" :key="opt.id" :value="opt.name">
                      {{ isBn ? opt.bn_name : opt.name }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "উপজেলা" : "Upazila" }}</label>
                  <select
                    v-model="profile.upazila"
                    :disabled="!upazilaOptions.length"
                    @change="onUpazilaChange"
                  >
                    <option value="" disabled>
                      {{
                        upazilaOptions.length
                          ? isBn
                            ? "নির্বাচন করুন"
                            : "Select upazila"
                          : isBn
                            ? "প্রথমে জেলা নির্বাচন করুন"
                            : "Select district first"
                      }}
                    </option>
                    <option v-for="opt in upazilaOptions" :key="opt.id" :value="opt.name">
                      {{ isBn ? opt.bn_name : opt.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "ইউনিয়ন" : "Union" }}</label>
                  <select v-model="profile.union" :disabled="!unionOptions.length">
                    <option value="" disabled>
                      {{
                        unionOptions.length
                          ? isBn
                            ? "নির্বাচন করুন"
                            : "Select union"
                          : isBn
                            ? "প্রথমে উপজেলা নির্বাচন করুন"
                            : "Select upazila first"
                      }}
                    </option>
                    <option v-for="opt in unionOptions" :key="opt.id" :value="opt.name">
                      {{ isBn ? opt.bn_name : opt.name }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "পোস্ট অফিস" : "Post Office" }}</label>
                  <input v-model="profile.postOffice" type="text" placeholder="e.g. Tuker Bazar" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "মৌজা" : "Mouza" }}</label>
                  <input v-model="profile.mouza" type="text" placeholder="optional" />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "গ্রাম" : "Village" }}</label>
                  <input v-model="profile.village" type="text" placeholder="optional" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "পোস্ট কোড" : "Post Code" }}</label>
                  <input v-model="profile.postCode" type="text" placeholder="e.g. 3100" />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="form-field">
                <label>{{ isBn ? "ঠিকানা (ইংরেজি)" : "Address (English)" }}</label>
                <textarea
                  v-model="profile.addressEn"
                  rows="2"
                  placeholder="Street, Upazila, District"
                  style="resize: vertical; min-height: 40px; max-height: 100px; overflow-y: auto"
                />
              </div>

              <div class="form-field">
                <label>{{ isBn ? "ঠিকানা (বাংলা)" : "Address (Bangla)" }}</label>
                <textarea v-model="profile.addressBn" rows="2" placeholder="রাস্তা, উপজেলা, জেলা"
                  style="resize: vertical; min-height: 40px; max-height: 100px; overflow-y: auto"/>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid">
                <div class="form-field">
                  <label>{{ isBn ? "অক্ষাংশ (Latitude)" : "Latitude" }}</label>
                  <input v-model="profile.latitude" type="text" placeholder="e.g. 24.901234" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "দ্রাঘিমাংশ (Longitude)" : "Longitude" }}</label>
                  <input v-model="profile.longitude" type="text" placeholder="e.g. 91.901234" />
                </div>
              </div>
            </div>
          </div>

          <!-- Contact & Social -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-phone" />
                <div>
                  <h2>{{ isBn ? "যোগাযোগ ও সামাজিক মাধ্যম" : "Contact & Social" }}</h2>
                  <span>{{
                    isBn
                      ? "প্রিন্ট ডকুমেন্ট ও ওয়েবসাইটে ব্যবহৃত যোগাযোগ ও সামাজিক মাধ্যমের তথ্য"
                      : "Contact and social details used on printed documents and the public website"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "ফোন" : "Phone" }}</label>
                  <input v-model="profile.phone" type="tel" placeholder="+880 1XXX-XXXXXX" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "বিকল্প ফোন" : "Alternate Phone" }}</label>
                  <input
                    v-model="profile.alternatePhone"
                    type="tel"
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "জরুরি ফোন" : "Emergency Phone" }}</label>
                  <input
                    v-model="profile.emergencyPhone"
                    type="tel"
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "ফ্যাক্স" : "Fax" }}</label>
                  <input v-model="profile.fax" type="text" placeholder="optional" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ইমেইল" : "Email" }}</label>
                  <input
                    v-model="profile.email"
                    type="email"
                    placeholder="info@institution.edu.bd"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "অফিসিয়াল ইমেইল" : "Official Email" }}</label>
                  <input
                    v-model="profile.officialEmail"
                    type="email"
                    placeholder="principal@institution.edu.bd"
                  />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="form-field">
                <label>{{ isBn ? "ওয়েবসাইট" : "Website" }}</label>
                <input
                  v-model="profile.website"
                  type="url"
                  placeholder="https://institution.edu.bd"
                />
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "ফেসবুক" : "Facebook" }}</label>
                  <input
                    v-model="profile.facebook"
                    type="url"
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ইউটিউব" : "YouTube" }}</label>
                  <input
                    v-model="profile.youtube"
                    type="url"
                    placeholder="https://youtube.com/@..."
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "লিংকডইন" : "LinkedIn" }}</label>
                  <input
                    v-model="profile.linkedin"
                    type="url"
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Leadership & Administration -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-user-tie" />
                <div>
                  <h2>{{ isBn ? "প্রশাসন ও নেতৃত্ব" : "Leadership & Administration" }}</h2>
                  <span>{{
                    isBn
                      ? "সনদ ও অফিসিয়াল চিঠিতে স্বাক্ষরকারী কর্তৃপক্ষ"
                      : "Signing authorities shown on certificates and official letters"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <p class="ipf-subhead">{{ isBn ? "প্রতিষ্ঠান প্রধান" : "Head of Institution" }}</p>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "নাম" : "Name" }}</label>
                  <input
                    v-model="profile.headName"
                    type="text"
                    placeholder="e.g. Md. Kamal Hossain"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "পদবি" : "Designation" }}</label>
                  <input
                    v-model="profile.headDesignation"
                    type="text"
                    placeholder="e.g. President"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ফোন" : "Phone" }}</label>
                  <input v-model="profile.headPhone" type="tel" placeholder="+880 1XXX-XXXXXX" />
                </div>
              </div>

              <div class="form-field">
                <label>{{ isBn ? "ইমেইল" : "Email" }}</label>
                <input
                  v-model="profile.headEmail"
                  type="email"
                  placeholder="president@institution.edu.bd"
                />
              </div>

              <div class="ipf-divider" />

              <p class="ipf-subhead">{{ isBn ? "অধ্যক্ষ" : "Principal" }}</p>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "নাম" : "Name" }}</label>
                  <input
                    v-model="profile.principalName"
                    type="text"
                    placeholder="e.g. Sitesh Talukder"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "পদবি" : "Designation" }}</label>
                  <input
                    v-model="profile.principalDesignation"
                    type="text"
                    placeholder="e.g. Principal"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ফোন" : "Phone" }}</label>
                  <input
                    v-model="profile.principalPhone"
                    type="tel"
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>
              </div>

              <div class="form-field">
                <label>{{ isBn ? "ইমেইল" : "Email" }}</label>
                <input
                  v-model="profile.principalEmail"
                  type="email"
                  placeholder="principal@institution.edu.bd"
                />
              </div>

              <div class="ipf-divider" />

              <p class="ipf-subhead">{{ isBn ? "সহকারী অধ্যক্ষ" : "Vice Principal" }}</p>
              <div class="ipf-grid">
                <div class="form-field">
                  <label>{{ isBn ? "নাম" : "Name" }}</label>
                  <input
                    v-model="profile.vicePrincipalName"
                    type="text"
                    placeholder="e.g. Md. Abdul Karim"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ফোন" : "Phone" }}</label>
                  <input
                    v-model="profile.vicePrincipalPhone"
                    type="tel"
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>
              </div>

              <div class="ipf-divider" />

              <p class="ipf-subhead">
                {{ isBn ? "অফিস সুপারিনটেনডেন্ট" : "Office Superintendent" }}
              </p>
              <div class="ipf-grid">
                <div class="form-field">
                  <label>{{ isBn ? "নাম" : "Name" }}</label>
                  <input
                    v-model="profile.officeSuperName"
                    type="text"
                    placeholder="e.g. Abdul Mannan"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ফোন" : "Phone" }}</label>
                  <input
                    v-model="profile.officeSuperPhone"
                    type="tel"
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Infrastructure & Capacity -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-building" />
                <div>
                  <h2>{{ isBn ? "অবকাঠামো ও ধারণক্ষমতা" : "Infrastructure & Capacity" }}</h2>
                  <span>{{
                    isBn
                      ? "ক্যাম্পাস, ভবন এবং শিক্ষার্থী/শিক্ষক ধারণক্ষমতা"
                      : "Campus, buildings, and student/teacher capacity"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "ক্যাম্পাসের আয়তন" : "Campus Area" }}</label>
                  <input v-model="profile.campusArea" type="text" placeholder="e.g. 3.50 Acres" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ভবনের সংখ্যা" : "Number of Buildings" }}</label>
                  <input v-model="profile.numberOfBuildings" type="number" placeholder="e.g. 4" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "শ্রেণিকক্ষের সংখ্যা" : "Number of Classrooms" }}</label>
                  <input v-model="profile.numberOfClassrooms" type="number" placeholder="e.g. 36" />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "ল্যাবরেটরির সংখ্যা" : "Number of Laboratories" }}</label>
                  <input
                    v-model="profile.numberOfLaboratories"
                    type="number"
                    placeholder="e.g. 5"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "লাইব্রেরির সংখ্যা" : "Number of Libraries" }}</label>
                  <input v-model="profile.numberOfLibraries" type="number" placeholder="e.g. 1" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "খেলার মাঠের সংখ্যা" : "Number of Playgrounds" }}</label>
                  <input v-model="profile.numberOfPlaygrounds" type="number" placeholder="e.g. 1" />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "শিক্ষার্থী ধারণক্ষমতা" : "Student Capacity" }}</label>
                  <input v-model="profile.studentCapacity" type="number" placeholder="e.g. 2500" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "শিক্ষক ধারণক্ষমতা" : "Teacher Capacity" }}</label>
                  <input v-model="profile.teacherCapacity" type="number" placeholder="e.g. 80" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "কর্মচারী ধারণক্ষমতা" : "Staff Capacity" }}</label>
                  <input v-model="profile.staffCapacity" type="number" placeholder="e.g. 25" />
                </div>
              </div>
            </div>
          </div>

          <!-- Timings & Working Days -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-clock" />
                <div>
                  <h2>{{ isBn ? "সময়সূচি ও কর্মদিবস" : "Timings & Working Days" }}</h2>
                  <span>{{
                    isBn
                      ? "অফিস ও শ্রেণির সময় এবং সাপ্তাহিক কর্মদিবস"
                      : "Office and class hours, and the weekly working days"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-grid">
                <div class="form-field">
                  <label>{{ isBn ? "অফিস শুরুর সময়" : "Office Start Time" }}</label>
                  <input v-model="profile.officeStartTime" type="time" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "অফিস শেষের সময়" : "Office End Time" }}</label>
                  <input v-model="profile.officeEndTime" type="time" />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-grid">
                <div class="form-field">
                  <label>{{ isBn ? "ক্লাস শুরুর সময়" : "Class Start Time" }}</label>
                  <input v-model="profile.classStartTime" type="time" />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ক্লাস শেষের সময়" : "Class End Time" }}</label>
                  <input v-model="profile.classEndTime" type="time" />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="form-field">
                <label>{{ isBn ? "কর্মদিবস" : "Working Days" }}</label>
                <div class="ipf-chips">
                  <button
                    v-for="opt in WORKING_DAY_OPTIONS"
                    :key="opt.value"
                    type="button"
                    class="ipf-chip"
                    :class="{ 'is-active': profile.workingDays.includes(opt.value) }"
                    @click="toggleArrayValue(profile.workingDays, opt.value)"
                  >
                    {{ isBn ? opt.label_bn : opt.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Academic Offering -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-graduation-cap" />
                <div>
                  <h2>{{ isBn ? "একাডেমিক অফার" : "Academic Offering" }}</h2>
                  <span>{{
                    isBn
                      ? "গ্রুপ ও শিক্ষার মাধ্যম যা প্রতিষ্ঠান প্রদান করে"
                      : "Groups and mediums the institution offers"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="form-field">
                <label>{{ isBn ? "একাডেমিক গ্রুপ" : "Academic Groups" }}</label>
                <div class="ipf-chips">
                  <button
                    v-for="opt in ACADEMIC_GROUP_OPTIONS"
                    :key="opt.value"
                    type="button"
                    class="ipf-chip"
                    :class="{ 'is-active': profile.academicGroups.includes(opt.value) }"
                    @click="toggleArrayValue(profile.academicGroups, opt.value)"
                  >
                    {{ isBn ? opt.label_bn : opt.label }}
                  </button>
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="form-field">
                <label>{{ isBn ? "শিক্ষার মাধ্যম" : "Mediums of Instruction" }}</label>
                <div class="ipf-chips">
                  <button
                    v-for="opt in MEDIUM_OPTIONS"
                    :key="opt.value"
                    type="button"
                    class="ipf-chip"
                    :class="{ 'is-active': profile.mediums.includes(opt.value) }"
                    @click="toggleArrayValue(profile.mediums, opt.value)"
                  >
                    {{ isBn ? opt.label_bn : opt.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Facilities -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-house-laptop" />
                <div>
                  <h2>{{ isBn ? "সুযোগ-সুবিধা" : "Facilities" }}</h2>
                  <span>{{
                    isBn ? "ক্যাম্পাসে উপলব্ধ সুযোগ-সুবিধাসমূহ" : "Facilities available on campus"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-toggle-grid">
                <div v-for="opt in FACILITY_OPTIONS" :key="opt.key" class="ipf-toggle-row">
                  <div class="ipf-toggle-row__label">
                    <i :class="['fa-duotone', opt.icon]" />
                    <span>{{ isBn ? opt.label_bn : opt.label }}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    class="switch"
                    :class="{ 'is-on': profile.facilities[opt.key] }"
                    :aria-checked="profile.facilities[opt.key]"
                    @click="profile.facilities[opt.key] = !profile.facilities[opt.key]"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Bank & Payment -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-building-columns" />
                <div>
                  <h2>{{ isBn ? "ব্যাংক ও পেমেন্ট" : "Bank & Payment" }}</h2>
                  <span>{{
                    isBn
                      ? "ফি সংগ্রহে ব্যবহৃত ব্যাংক হিসাব ও পেমেন্ট পদ্ধতি"
                      : "Bank account and payment methods used for fee collection"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "ব্যাংকের নাম" : "Bank Name" }}</label>
                  <input
                    v-model="profile.bankInfo.bankName"
                    type="text"
                    placeholder="e.g. Sonali Bank PLC"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "শাখা" : "Branch" }}</label>
                  <input
                    v-model="profile.bankInfo.branch"
                    type="text"
                    placeholder="e.g. Sylhet Main Branch"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "হিসাবের নাম" : "Account Name" }}</label>
                  <input
                    v-model="profile.bankInfo.accountName"
                    type="text"
                    placeholder="Institution's account name"
                  />
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="form-field">
                <label>{{ isBn ? "হিসাব নম্বর" : "Account Number" }}</label>
                <input
                  v-model="profile.bankInfo.accountNumber"
                  type="text"
                  placeholder="e.g. 1234567890123"
                />
              </div>

              <div class="ipf-divider" />

              <div class="form-field">
                <label>{{ isBn ? "পেমেন্ট পদ্ধতি" : "Payment Methods" }}</label>
                <div class="ipf-chips">
                  <button
                    v-for="opt in PAYMENT_METHOD_OPTIONS"
                    :key="opt.value"
                    type="button"
                    class="ipf-chip"
                    :class="{ 'is-active': profile.paymentMethods.includes(opt.value) }"
                    @click="toggleArrayValue(profile.paymentMethods, opt.value)"
                  >
                    {{ isBn ? opt.label_bn : opt.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Status & Verification -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-circle-check" />
                <div>
                  <h2>{{ isBn ? "স্ট্যাটাস ও যাচাইকরণ" : "Status & Verification" }}</h2>
                  <span>{{
                    isBn
                      ? "প্রতিষ্ঠানের বর্তমান স্ট্যাটাস ও যাচাইকরণ অবস্থা"
                      : "The institution's current status and verification state"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field">
                  <label>{{ isBn ? "স্ট্যাটাস" : "Status" }}</label>
                  <select v-model="profile.status">
                    <option v-for="opt in PROFILE_STATUSES" :key="opt.value" :value="opt.value">
                      {{ isBn ? opt.label_bn : opt.label }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "যাচাইকৃত" : "Verified" }}</label>
                  <button
                    type="button"
                    role="switch"
                    class="switch"
                    :class="{ 'is-on': profile.verified }"
                    :aria-checked="profile.verified"
                    @click="profile.verified = !profile.verified"
                  />
                </div>

                <div class="form-field">
                  <label>{{ isBn ? "ফিচার্ড" : "Featured" }}</label>
                  <button
                    type="button"
                    role="switch"
                    class="switch"
                    :class="{ 'is-on': profile.featured }"
                    :aria-checked="profile.featured"
                    @click="profile.featured = !profile.featured"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="ipf-side">
          <!-- Branding -->
          <div class="ipf-section">
            <div class="ipf-section__head">
              <div class="ipf-section__title">
                <i class="fa-duotone fa-image" />
                <div>
                  <h2>{{ isBn ? "লোগো ও লেটারহেড" : "Logo & Letterhead" }}</h2>
                  <span>{{
                    isBn
                      ? "আইডি কার্ড, সনদ ও প্রিন্ট ডকুমেন্টে ব্যবহৃত হবে"
                      : "Used on ID cards, certificates, and printed documents"
                  }}</span>
                </div>
              </div>
            </div>

            <div class="ipf-section__body">
              <div class="ipf-upload">
                <div class="ipf-upload__preview ipf-upload__preview--logo">
                  <img
                    v-if="profile.logoDataUrl"
                    :src="profile.logoDataUrl"
                    alt="Institution logo"
                  />
                  <i v-else class="fa-duotone fa-school" />
                </div>
                <div class="ipf-upload__controls">
                  <label class="ipf-upload__label">
                    {{ isBn ? "লোগো" : "Logo" }}
                    <span>{{
                      isBn ? "বর্গাকার, PNG পছন্দনীয়" : "Square image, PNG preferred"
                    }}</span>
                  </label>
                  <div class="ipf-upload__actions">
                    <label class="btn btn--secondary ipf-upload__button">
                      {{ isBn ? "আপলোড" : "Upload" }}
                      <input
                        type="file"
                        accept="image/*"
                        class="ipf-upload__input"
                        @change="onLogoChange"
                      />
                    </label>
                    <BaseButton v-if="profile.logoDataUrl" variant="ghost" @click="clearLogo">
                      {{ isBn ? "মুছুন" : "Remove" }}
                    </BaseButton>
                  </div>
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-upload">
                <div class="ipf-upload__preview ipf-upload__preview--letterhead">
                  <img
                    v-if="profile.letterheadDataUrl"
                    :src="profile.letterheadDataUrl"
                    alt="Institution letterhead"
                  />
                  <i v-else class="fa-duotone fa-file-image" />
                </div>
                <div class="ipf-upload__controls">
                  <label class="ipf-upload__label">
                    {{ isBn ? "লেটারহেড" : "Letterhead" }}
                    <span>{{
                      isBn ? "চওড়া ব্যানার, চিঠিপত্রের জন্য" : "Wide banner, used on letters"
                    }}</span>
                  </label>
                  <div class="ipf-upload__actions">
                    <label class="btn btn--secondary ipf-upload__button">
                      {{ isBn ? "আপলোড" : "Upload" }}
                      <input
                        type="file"
                        accept="image/*"
                        class="ipf-upload__input"
                        @change="onLetterheadChange"
                      />
                    </label>
                    <BaseButton
                      v-if="profile.letterheadDataUrl"
                      variant="ghost"
                      @click="clearLetterhead"
                    >
                      {{ isBn ? "মুছুন" : "Remove" }}
                    </BaseButton>
                  </div>
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="ipf-upload">
                <div class="ipf-upload__preview ipf-upload__preview--logo">
                  <img v-if="profile.sealImage" :src="profile.sealImage" alt="Institution seal" />
                  <i v-else class="fa-duotone fa-stamp" />
                </div>
                <div class="ipf-upload__controls">
                  <label class="ipf-upload__label">
                    {{ isBn ? "সিল" : "Seal" }}
                    <span>{{
                      isBn ? "সনদ ও চিঠিতে ব্যবহৃত হবে" : "Used on certificates and letters"
                    }}</span>
                  </label>
                  <div class="ipf-upload__actions">
                    <label class="btn btn--secondary ipf-upload__button">
                      {{ isBn ? "আপলোড" : "Upload" }}
                      <input
                        type="file"
                        accept="image/*"
                        class="ipf-upload__input"
                        @change="onSealChange"
                      />
                    </label>
                    <BaseButton v-if="profile.sealImage" variant="ghost" @click="clearSeal">
                      {{ isBn ? "মুছুন" : "Remove" }}
                    </BaseButton>
                  </div>
                </div>
              </div>

              <div class="ipf-divider" />

              <div class="form-field">
                <label>{{ isBn ? "প্রাতিষ্ঠানিক রং (প্রাথমিক)" : "School Color (Primary)" }}</label>
                <div class="ipf-color-field">
                  <input v-model="profile.schoolColor" type="color" />
                  <input v-model="profile.schoolColor" type="text" placeholder="#0F766E" />
                </div>
              </div>

              <div class="form-field">
                <label>{{
                  isBn ? "প্রাতিষ্ঠানিক রং (দ্বিতীয়)" : "School Color (Secondary)"
                }}</label>
                <div class="ipf-color-field">
                  <input v-model="profile.secondaryColor" type="color" />
                  <input v-model="profile.secondaryColor" type="text" placeholder="#F59E0B" />
                </div>
              </div>
            </div>
          </div>

          <!-- Live preview -->
          <div class="ipf-preview">
            <div class="ipf-preview__band">
              <img
                v-if="profile.logoDataUrl"
                :src="profile.logoDataUrl"
                alt=""
                class="ipf-preview__logo"
              />
              <i v-else class="fa-duotone fa-school ipf-preview__logo-fallback" />
            </div>
            <div class="ipf-preview__body">
              <strong>{{
                (isBn ? profile.nameBn : profile.nameEn) ||
                (isBn ? "প্রতিষ্ঠানের নাম" : "Institution Name")
              }}</strong>
              <span class="ipf-preview__eiin">
                {{ isBn ? "EIIN" : "EIIN" }}: {{ profile.eiin || "------" }}
              </span>
              <div class="ipf-preview__badges">
                <span class="badge badge--info">{{
                  isBn
                    ? (selectedType && selectedType.label_bn) || ""
                    : (selectedType && selectedType.label) || ""
                }}</span>
                <span class="badge badge--success">{{
                  isBn
                    ? (selectedBoard && selectedBoard.label_bn) || ""
                    : (selectedBoard && selectedBoard.label) || ""
                }}</span>
                <span
                  class="badge"
                  :class="profile.status === 'active' ? 'badge--success' : 'badge--warning'"
                >
                  {{
                    isBn
                      ? (selectedStatus && selectedStatus.label_bn) || ""
                      : (selectedStatus && selectedStatus.label) || ""
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save bar -->
      <div class="ipf-savebar">
        <div class="ipf-savebar__status">
          <i v-if="justSaved" class="fa-duotone fa-circle-check" />
          <span>{{
            justSaved
              ? isBn
                ? "সংরক্ষণ করা হয়েছে"
                : "Saved"
              : isBn
                ? "পরিবর্তনগুলো স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়"
                : "Changes are saved automatically as you go"
          }}</span>
        </div>
        <div class="ipf-savebar__actions">
          <BaseButton variant="primary" @click="handleSave">
            {{ isBn ? "সংরক্ষণ করুন" : "Save changes" }}
          </BaseButton>
        </div>
      </div>
    </template>
  </section>
</template>
