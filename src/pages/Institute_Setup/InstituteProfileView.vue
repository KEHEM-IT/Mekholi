<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAppPreferences } from '@/composables/useAppPreferences'
import { useInstituteProfile } from '@/composables/Institute_Setup/useInstituteProfile'
import { EDUCATION_BOARDS, INSTITUTION_TYPES } from '@/utils/constants'

const { preferences } = useAppPreferences()
const { profile } = useInstituteProfile()

const isBn = computed(() => preferences.uiLanguage === 'bn')

// --- Loading skeleton -----------------------------------------------------
// The profile itself loads synchronously from localStorage today, but the
// page still shows a brief skeleton on mount so the UI is consistent with
// the eventual API-backed load (board/BANBEIS metadata, etc.) instead of a
// hard cut from blank to fully-rendered.
const isLoading = ref(true)
onMounted(() => {
  window.setTimeout(() => {
    isLoading.value = false
  }, 400)
})

const selectedType = computed(
  () => INSTITUTION_TYPES.find((opt) => opt.value === profile.institutionType) ?? INSTITUTION_TYPES[0],
)
const selectedBoard = computed(
  () => EDUCATION_BOARDS.find((opt) => opt.value === profile.educationBoard) ?? EDUCATION_BOARDS[0],
)

// EIIN is a 6-digit government identifier (blueprint 2.2) - only flag it
// once something has been typed, so a fresh/empty form doesn't open with
// an error already showing.
const eiinError = computed(() => {
  if (!profile.eiin) return ''
  if (!/^\d{6}$/.test(profile.eiin)) {
    return isBn.value ? 'EIIN অবশ্যই ৬ সংখ্যার হতে হবে' : 'EIIN must be exactly 6 digits'
  }
  return ''
})

// --- Logo / letterhead upload ----------------------------------------
// Read straight into a data URL and hold it on the profile object - no
// backend yet, so this is the same "good enough for a prototype" approach
// as the rest of the persisted settings (see useInstituteProfile).
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  profile.logoDataUrl = await readAsDataUrl(file)
}

async function onLetterheadChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  profile.letterheadDataUrl = await readAsDataUrl(file)
}

function clearLogo() {
  profile.logoDataUrl = null
}

function clearLetterhead() {
  profile.letterheadDataUrl = null
}

// --- Save affordance ----------------------------------------------------
// Same pattern as the Language & Theme page: the profile already persists
// live via useInstituteProfile's watcher, so "Save" is just an explicit
// confirmation moment.
const justSaved = ref(false)
let savedTimer: ReturnType<typeof setTimeout> | null = null

function handleSave() {
  justSaved.value = true
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => (justSaved.value = false), 2500)
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
          <div v-for="n in 3" :key="n" class="ipf-section">
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
      <h1>{{ isBn ? 'প্রতিষ্ঠান প্রোফাইল ও EIIN' : 'Institute Profile & EIIN' }}</h1>
      <p>
        {{
          isBn
            ? 'প্রতিষ্ঠানের নাম, EIIN, ধরন, বোর্ড সংশ্লিষ্টতা এবং যোগাযোগের তথ্য নির্ধারণ করুন। বোর্ড/BANBEIS/EMIS এক্সপোর্টে এই তথ্য ব্যবহৃত হবে।'
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
                <h2>{{ isBn ? 'মৌলিক তথ্য' : 'Basic Information' }}</h2>
                <span>{{
                  isBn
                    ? 'প্রতিষ্ঠানের নাম, EIIN এবং শ্রেণিবিন্যাস'
                    : "Institution's name, EIIN, and classification"
                }}</span>
              </div>
            </div>
          </div>

          <div class="ipf-section__body">
            <div class="ipf-grid">
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institution Name (English)' }}</label>
                <input v-model="profile.nameEn" type="text" placeholder="e.g. Sylhet Model High School" />
              </div>

              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Institution Name (Bangla)' }}</label>
                <input v-model="profile.nameBn" type="text" placeholder="যেমন: সিলেট মডেল উচ্চ বিদ্যালয়" />
              </div>
            </div>

            <div class="ipf-divider" />

            <div class="ipf-grid">
              <div class="form-field">
                <label>{{ isBn ? 'EIIN' : 'EIIN' }}</label>
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
                  {{ isBn ? '৬-সংখ্যার সরকারি শনাক্তকরণ নম্বর' : '6-digit government identification number' }}
                </span>
              </div>

              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠা সাল' : 'Established Year' }}</label>
                <input v-model="profile.establishedYear" type="number" placeholder="e.g. 1998" />
              </div>

              <div class="form-field">
                <label>{{ isBn ? 'নিবন্ধন / MPO কোড' : 'Registration / MPO Code' }}</label>
                <input v-model="profile.registrationCode" type="text" placeholder="optional" />
              </div>
            </div>

            <div class="ipf-divider" />

            <div class="ipf-grid">
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠানের ধরন' : 'Institution Type' }}</label>
                <select v-model="profile.institutionType">
                  <option v-for="opt in INSTITUTION_TYPES" :key="opt.value" :value="opt.value">
                    {{ isBn ? opt.label_bn : opt.label }}
                  </option>
                </select>
              </div>

              <div class="form-field">
                <label>{{ isBn ? 'শিক্ষা বোর্ড' : 'Education Board' }}</label>
                <select v-model="profile.educationBoard">
                  <option v-for="opt in EDUCATION_BOARDS" :key="opt.value" :value="opt.value">
                    {{ isBn ? opt.label_bn : opt.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact & Address -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-location-dot" />
              <div>
                <h2>{{ isBn ? 'যোগাযোগ ও ঠিকানা' : 'Contact & Address' }}</h2>
                <span>{{
                  isBn
                    ? 'প্রিন্ট ডকুমেন্ট ও ওয়েবসাইটে ব্যবহৃত ঠিকানা ও যোগাযোগের তথ্য'
                    : 'Address and contact details used on printed documents and the public website'
                }}</span>
              </div>
            </div>
          </div>

          <div class="ipf-section__body">
            <div class="form-field">
              <label>{{ isBn ? 'ঠিকানা (ইংরেজি)' : 'Address (English)' }}</label>
              <textarea v-model="profile.addressEn" rows="2" placeholder="Street, Upazila, District" />
            </div>

            <div class="form-field">
              <label>{{ isBn ? 'ঠিকানা (বাংলা)' : 'Address (Bangla)' }}</label>
              <textarea v-model="profile.addressBn" rows="2" placeholder="রাস্তা, উপজেলা, জেলা" />
            </div>

            <div class="ipf-divider" />

            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>{{ isBn ? 'ফোন' : 'Phone' }}</label>
                <input v-model="profile.phone" type="tel" placeholder="+880 1XXX-XXXXXX" />
              </div>

              <div class="form-field">
                <label>{{ isBn ? 'ইমেইল' : 'Email' }}</label>
                <input v-model="profile.email" type="email" placeholder="info@institution.edu.bd" />
              </div>

              <div class="form-field">
                <label>{{ isBn ? 'ওয়েবসাইট' : 'Website' }}</label>
                <input v-model="profile.website" type="url" placeholder="https://institution.edu.bd" />
              </div>
            </div>
          </div>
        </div>

        <!-- Head of Institution -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-user-tie" />
              <div>
                <h2>{{ isBn ? 'প্রতিষ্ঠান প্রধান' : 'Head of Institution' }}</h2>
                <span>{{
                  isBn
                    ? 'সনদ ও অফিসিয়াল চিঠিতে স্বাক্ষরকারী কর্তৃপক্ষ'
                    : 'The signing authority shown on certificates and official letters'
                }}</span>
              </div>
            </div>
          </div>

          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>{{ isBn ? 'নাম' : 'Name' }}</label>
                <input v-model="profile.headName" type="text" placeholder="e.g. Md. Kamal Hossain" />
              </div>

              <div class="form-field">
                <label>{{ isBn ? 'পদবি' : 'Designation' }}</label>
                <input v-model="profile.headDesignation" type="text" placeholder="e.g. Headmaster / Principal" />
              </div>

              <div class="form-field">
                <label>{{ isBn ? 'ফোন' : 'Phone' }}</label>
                <input v-model="profile.headPhone" type="tel" placeholder="+880 1XXX-XXXXXX" />
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
                <h2>{{ isBn ? 'লোগো ও লেটারহেড' : 'Logo & Letterhead' }}</h2>
                <span>{{
                  isBn ? 'আইডি কার্ড, সনদ ও প্রিন্ট ডকুমেন্টে ব্যবহৃত হবে' : 'Used on ID cards, certificates, and printed documents'
                }}</span>
              </div>
            </div>
          </div>

          <div class="ipf-section__body">
            <div class="ipf-upload">
              <div class="ipf-upload__preview ipf-upload__preview--logo">
                <img v-if="profile.logoDataUrl" :src="profile.logoDataUrl" alt="Institution logo" />
                <i v-else class="fa-duotone fa-school" />
              </div>
              <div class="ipf-upload__controls">
                <label class="ipf-upload__label">
                  {{ isBn ? 'লোগো' : 'Logo' }}
                  <span>{{ isBn ? 'বর্গাকার, PNG পছন্দনীয়' : 'Square image, PNG preferred' }}</span>
                </label>
                <div class="ipf-upload__actions">
                  <label class="btn btn--secondary ipf-upload__button">
                    {{ isBn ? 'আপলোড' : 'Upload' }}
                    <input type="file" accept="image/*" class="ipf-upload__input" @change="onLogoChange" />
                  </label>
                  <BaseButton v-if="profile.logoDataUrl" variant="ghost" @click="clearLogo">
                    {{ isBn ? 'মুছুন' : 'Remove' }}
                  </BaseButton>
                </div>
              </div>
            </div>

            <div class="ipf-divider" />

            <div class="ipf-upload">
              <div class="ipf-upload__preview ipf-upload__preview--letterhead">
                <img v-if="profile.letterheadDataUrl" :src="profile.letterheadDataUrl" alt="Institution letterhead" />
                <i v-else class="fa-duotone fa-file-image" />
              </div>
              <div class="ipf-upload__controls">
                <label class="ipf-upload__label">
                  {{ isBn ? 'লেটারহেড' : 'Letterhead' }}
                  <span>{{ isBn ? 'চওড়া ব্যানার, চিঠিপত্রের জন্য' : 'Wide banner, used on letters' }}</span>
                </label>
                <div class="ipf-upload__actions">
                  <label class="btn btn--secondary ipf-upload__button">
                    {{ isBn ? 'আপলোড' : 'Upload' }}
                    <input type="file" accept="image/*" class="ipf-upload__input" @change="onLetterheadChange" />
                  </label>
                  <BaseButton v-if="profile.letterheadDataUrl" variant="ghost" @click="clearLetterhead">
                    {{ isBn ? 'মুছুন' : 'Remove' }}
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Live preview -->
        <div class="ipf-preview">
          <div class="ipf-preview__band">
            <img v-if="profile.logoDataUrl" :src="profile.logoDataUrl" alt="" class="ipf-preview__logo" />
            <i v-else class="fa-duotone fa-school ipf-preview__logo-fallback" />
          </div>
          <div class="ipf-preview__body">
            <strong>{{ (isBn ? profile.nameBn : profile.nameEn) || (isBn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name') }}</strong>
            <span class="ipf-preview__eiin">
              {{ isBn ? 'EIIN' : 'EIIN' }}: {{ profile.eiin || '------' }}
            </span>
            <div class="ipf-preview__badges">
              <span class="badge badge--info">{{ isBn ? (selectedType && selectedType.label_bn) || '' : (selectedType && selectedType.label) || '' }}</span>
              <span class="badge badge--success">{{ isBn ? (selectedBoard && selectedBoard.label_bn) || '' : (selectedBoard && selectedBoard.label) || '' }}</span>
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
              ? 'সংরক্ষণ করা হয়েছে'
              : 'Saved'
            : isBn
              ? 'পরিবর্তনগুলো স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়'
              : 'Changes are saved automatically as you go'
        }}</span>
      </div>
      <div class="ipf-savebar__actions">
        <BaseButton variant="primary" @click="handleSave">
          {{ isBn ? 'সংরক্ষণ করুন' : 'Save changes' }}
        </BaseButton>
      </div>
    </div>
    </template>
  </section>
</template>
