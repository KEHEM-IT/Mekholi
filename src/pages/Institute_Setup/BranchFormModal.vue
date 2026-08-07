<script setup lang="ts">
// Add / edit branch form modal — follows the Institute Profile page's form
// design language (sections, comboboxes, date picker, toggle, geo cascade).
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useTranslator } from '@/Translator'
import { uploadToImgbb, validateLogoFile } from '@/composables/useImgbbUpload'
import { useToast } from '@/composables/useToast'
import { loadProfile } from '@/composables/Institute_Setup/useInstituteProfile'
import {
  BD_GEO_DIVISIONS,
  districtsByDivisionId,
  upazilasByDistrictId,
  unionsByUpazilaId,
} from '@/utils/bdGeo'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import type { Branch } from '@/composables/Institute_Setup/useBranches'

const props = defineProps<{
  branch: Branch | null
  /** True when a main branch already exists — the "Is Main" toggle is then
   *  hidden on the add form (a second main branch is not allowed). */
  mainExists?: boolean
}>()

const emit = defineEmits<{
  save: [branch: Branch]
  close: []
}>()

const toast = useToast()
const { t } = useTranslator()

const form = reactive<Branch>({ ...(props.branch ? JSON.parse(JSON.stringify(props.branch)) : empty()) })

function empty(): Branch {
  return {
    branch_name: '', branch_name_bn: '', branch_code: '', campus_type: 'Annex - অ্যানেক্স',
    is_main: false, logo: '', division_id: '', district_id: '', upazila_id: '', union_id: '',
    village_road_holding_no: '', post_office: '', post_code: null, phone: '', email: '',
    website: '', head_name: '', head_designation: '', head_phone: '', head_email: '',
    eiin: '', board: '', institute_type: '', shift: '', established_date: '',
    is_active: true, admission_open: true,
  }
}

// ── Address auto-fill from the Institute Profile ───────────────────────
// When ADDING a branch (not editing), the address block is prefilled from
// the saved profile so the user only tweaks what differs.

let isPrefilling = false

onMounted(async () => {
  if (props.branch) return // never overwrite when editing
  const data = await loadProfile()
  if (!data) return
  isPrefilling = true
  const addressKeys = [
    'division_id', 'district_id', 'upazila_id', 'union_id',
    'village_road_holding_no', 'post_office', 'post_code',
  ]
  for (const key of addressKeys) {
    const v = data[key]
    if (v != null && v !== '') (form as unknown as Record<string, unknown>)[key] = v
  }
  await nextTick()
  isPrefilling = false
})


// ── Option lists (English - বাংলা) ─────────────────────────────────────

const CAMPUS_TYPES = [
  'Annex - অ্যানেক্স',
  'Sub-Campus - সাব-ক্যাম্পাস',
  'Temporary - অস্থায়ী',
]
const BOARDS = [
  'Dhaka - ঢাকা', 'Rajshahi - রাজশাহী', 'Cumilla - কুমিল্লা', 'Chattogram - চট্টগ্রাম',
  'Sylhet - সিলেট', 'Barishal - বরিশাল', 'Jashore - যশোর', 'Rangpur - রংপুর',
  'Dinajpur - দিনাজপুর', 'Mymensingh - ময়মনসিংহ',
  'Madrasah Education Board - মাদ্রাসা শিক্ষা বোর্ড',
  'Technical Education Board (BTEB) - কারিগরি শিক্ষা বোর্ড',
  'National University - জাতীয় বিশ্ববিদ্যালয়',
  'Other - অন্যান্য',
]
const DESIGNATIONS = [
  'Principal - প্রধান শিক্ষক',
  'Vice Principal - সহকারী প্রধান শিক্ষক',
  'Headmaster - প্রধান শিক্ষক',
  'Headmistress - প্রধান শিক্ষিকা',
  'Director - পরিচালক',
  'Campus Coordinator - ক্যাম্পাস সমন্বয়কারী',
  'Administrator - প্রশাসক',
  'Other - অন্যান্য',
]

import instituteTypesJson from '@/assets/jsons/institute_types.json'
import shiftCountsJson from '@/assets/jsons/shift_counts.json'
const INSTITUTE_TYPE_OPTIONS = instituteTypesJson
const SHIFT_OPTIONS = shiftCountsJson

const comboOptions = (items: string[]) => items.map((v) => ({ Id: v, LookupText: v }))

// ── Input helpers (same behaviour as the profile page) ─────────────────

function onDigitsOnly(event: Event) {
  const el = event.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '')
  if (el.value !== digits) el.value = digits
}
function onNormalizeInput(event: Event) {
  const el = event.target as HTMLInputElement
  const cleaned = el.value.replace(/[ \t]+/g, ' ')
  if (el.value !== cleaned) el.value = cleaned
}
function onNormalizeBlur(event: Event) {
  const el = event.target as HTMLInputElement
  const cleaned = el.value.replace(/\s+/g, ' ').trim()
  if (el.value !== cleaned) {
    el.value = cleaned
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

// ── Geo cascade ─────────────────────────────────────────────────────────

const geoDivisionOptions = BD_GEO_DIVISIONS as unknown as { id: string; LookupText: string }[]
const geoDistrictOptions = computed(() =>
  form.division_id ? (districtsByDivisionId(form.division_id) as unknown as { id: string; LookupText: string }[]) : [],
)
const geoUpazilaOptions = computed(() =>
  form.district_id ? (upazilasByDistrictId(form.district_id) as unknown as { id: string; LookupText: string }[]) : [],
)
const geoUnionOptions = computed(() =>
  form.upazila_id ? (unionsByUpazilaId(form.upazila_id) as unknown as { id: string; LookupText: string }[]) : [],
)
watch(
  () => form.division_id,
  () => { if (isPrefilling) return; form.district_id = ''; form.upazila_id = ''; form.union_id = '' },
)
watch(
  () => form.district_id,
  () => { if (isPrefilling) return; form.upazila_id = ''; form.union_id = '' },
)
watch(
  () => form.upazila_id,
  () => { if (isPrefilling) return; form.union_id = '' },
)

// ── Logo upload (ImgBB, click + drag & drop) ───────────────────────────

const isUploadingLogo = ref(false)
const isDraggingLogo = ref(false)
const logoInput = ref<HTMLInputElement | null>(null)

function triggerLogoPick() {
  if (!isUploadingLogo.value) logoInput.value?.click()
}
async function uploadLogo(file: File) {
  const err = validateLogoFile(file)
  if (err) { toast.error(err); return }
  isUploadingLogo.value = true
  try {
    form.logo = await uploadToImgbb(file)
    toast.success(t('common.logoUploaded'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Logo upload failed')
  } finally {
    isUploadingLogo.value = false
  }
}
async function onLogoPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadLogo(file)
}
function onLogoDragOver(event: DragEvent) {
  if (isUploadingLogo.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  isDraggingLogo.value = true
}
function onLogoDragLeave(event: DragEvent) {
  if (!event.currentTarget || event.relatedTarget === event.currentTarget) return
  isDraggingLogo.value = false
}
function onLogoDrop(event: DragEvent) {
  event.preventDefault()
  isDraggingLogo.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void uploadLogo(file)
}
function removeLogo() {
  form.logo = ''
}

// ── Submit ─────────────────────────────────────────────────────────────

function submit() {
  if (!form.branch_name.trim()) {
    toast.error(t('branches.nameRequired'))
    return
  }
  emit('save', { ...form, branch_name: form.branch_name.trim(), branch_name_bn: form.branch_name_bn.trim() })
}
</script>

<template>
  <div class="ipfp">
    <!-- Hero band -->
    <div class="ipfp-hero">
      <div class="ipfp-hero__logo">
        <img v-if="form.logo" :src="form.logo" alt="branch logo" />
        <span v-else>{{ (form.branch_name || 'BR').trim().charAt(0).toUpperCase() }}</span>
      </div>
      <div class="ipfp-hero__titles">
        <h2 class="ipfp-hero__name-en">{{ form.branch_name || t('branches.addBranch') }}</h2>
        <p class="ipfp-hero__name-bn">{{ form.branch_name_bn }}</p>
        <div class="ipfp-hero__chips">
          <span v-if="form.branch_code" class="ipfp-chip ipfp-chip--eiin">
            <i class="fa-duotone fa-hashtag" /> {{ form.branch_code }}
          </span>
          <span class="ipfp-chip">
            <i class="fa-duotone fa-building-columns" /> {{ form.campus_type }}
          </span>
          <span v-if="form.is_main" class="ipfp-chip">
            <i class="fa-duotone fa-star" /> {{ t('branches.isMain') }}
          </span>
        </div>
      </div>
    </div>

    <div class="ipfp-body">
      <!-- Identity -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-id-card" /> {{ t('branches.identity') }}</h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('branches.name') }} *</label>
            <input v-model="form.branch_name" type="text" @input="onNormalizeInput" @blur="onNormalizeBlur" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.nameBn') }}</label>
            <input v-model="form.branch_name_bn" type="text" @input="onNormalizeInput" @blur="onNormalizeBlur" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.code') }}</label>
            <input v-model="form.branch_code" type="text" inputmode="numeric" @input="onDigitsOnly" placeholder="01, 02…" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.campusType') }}</label>
            <BaseCombobox v-model="form.campus_type" :options="comboOptions(CAMPUS_TYPES)" option-value="LookupText" option-label="LookupText" :placeholder="t('common.select')" />
          </div>
          <!-- Is Main toggle: hidden when adding a new branch while a main
               branch already exists (only one main branch is allowed). -->
          <div v-if="props.branch || !mainExists" class="form-field">
            <label>{{ t('branches.isMain') }}</label>
            <BaseToggle v-model="form.is_main" :yes-label="t('common.yes')" :no-label="t('common.no')" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.estDate') }}</label>
            <BaseDatePicker v-model="form.established_date" :placeholder="t('branches.estDate')" />
          </div>
        </div>
      </div>

      <!-- Address -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-location-dot" /> {{ t('branches.address') }}</h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('branches.division') }}</label>
            <BaseCombobox v-model="form.division_id" :options="geoDivisionOptions" option-value="id" option-label="LookupText" :placeholder="t('common.select')" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.district') }}</label>
            <BaseCombobox v-model="form.district_id" :options="geoDistrictOptions" option-value="id" option-label="LookupText" :placeholder="t('common.select')" :disabled="!form.division_id" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.upazila') }}</label>
            <BaseCombobox v-model="form.upazila_id" :options="geoUpazilaOptions" option-value="id" option-label="LookupText" :placeholder="t('common.select')" :disabled="!form.district_id" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.union') }}</label>
            <BaseCombobox v-model="form.union_id" :options="geoUnionOptions" option-value="id" option-label="LookupText" :placeholder="t('common.select')" :disabled="!form.upazila_id" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.village') }}</label>
            <input v-model="form.village_road_holding_no" type="text" @input="onNormalizeInput" @blur="onNormalizeBlur" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.postOffice') }}</label>
            <input v-model="form.post_office" type="text" @input="onNormalizeInput" @blur="onNormalizeBlur" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.postCode') }}</label>
            <input v-model.number="form.post_code" type="number" />
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-phone" /> {{ t('branches.contact') }}</h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('branches.phone') }}</label>
            <input v-model="form.phone" type="text" inputmode="numeric" @input="onDigitsOnly" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.email') }}</label>
            <input v-model="form.email" type="email" @input="onNormalizeInput" @blur="onNormalizeBlur" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.website') }}</label>
            <input v-model="form.website" type="text" @input="onNormalizeInput" @blur="onNormalizeBlur" />
          </div>
        </div>
      </div>

      <!-- Head of campus -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-user-tie" /> {{ t('branches.headOf') }}</h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('branches.headName') }}</label>
            <input v-model="form.head_name" type="text" @input="onNormalizeInput" @blur="onNormalizeBlur" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.headDesignation') }}</label>
            <BaseCombobox v-model="form.head_designation" :options="comboOptions(DESIGNATIONS)" option-value="LookupText" option-label="LookupText" :placeholder="t('common.select')" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.headPhone') }}</label>
            <input v-model="form.head_phone" type="text" inputmode="numeric" @input="onDigitsOnly" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.headEmail') }}</label>
            <input v-model="form.head_email" type="email" @input="onNormalizeInput" @blur="onNormalizeBlur" />
          </div>
        </div>
      </div>

      <!-- Regulatory & academic -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-landmark" /> {{ t('branches.regulatory') }}</h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('branches.eiin') }}</label>
            <input v-model="form.eiin" type="text" inputmode="numeric" @input="onDigitsOnly" placeholder="130430" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.board') }}</label>
            <BaseCombobox v-model="form.board" :options="comboOptions(BOARDS)" option-value="LookupText" option-label="LookupText" :placeholder="t('common.select')" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.instituteType') }}</label>
            <BaseCombobox v-model="form.institute_type" :options="INSTITUTE_TYPE_OPTIONS" option-value="LookupText" option-label="LookupText" :placeholder="t('common.select')" />
          </div>
          <div class="form-field">
            <label>{{ t('branches.shift') }}</label>
            <BaseCombobox v-model="form.shift" :options="SHIFT_OPTIONS" option-value="LookupText" option-label="LookupText" :placeholder="t('common.select')" />
          </div>
        </div>
      </div>

      <!-- Status -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title"><i class="fa-duotone fa-toggle-on" /> {{ t('common.status') }}</h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('common.active') }}</label>
            <BaseToggle v-model="form.is_active" :yes-label="t('common.yes')" :no-label="t('common.no')" />
          </div>
          <div class="form-field">
            <label>{{ t('common.admissionOpen') }}</label>
            <BaseToggle v-model="form.admission_open" :yes-label="t('common.yes')" :no-label="t('common.no')" />
          </div>
          <!-- Branch Logo — full grid row (never squeezed into one column) -->
          <div class="form-field ipf-field--full">
            <label>{{ t('branches.logo') }}</label>
            <div
              class="ipf-logo"
              :class="{
                'is-uploading': isUploadingLogo,
                'is-dragging': isDraggingLogo && !isUploadingLogo,
              }"
              @click="triggerLogoPick"
              @keydown.enter="triggerLogoPick"
              @dragover.prevent="onLogoDragOver"
              @dragenter.prevent="isDraggingLogo = true"
              @dragleave="onLogoDragLeave"
              @drop.prevent="onLogoDrop"
              role="button"
              tabindex="0"
            >
              <img v-if="form.logo && !isUploadingLogo && !isDraggingLogo" :src="form.logo" class="ipf-logo__preview" alt="logo" />
              <i v-else-if="isUploadingLogo" class="fa-duotone fa-spinner fa-spin ipf-logo__icon" />
              <i v-else-if="isDraggingLogo" class="fa-duotone fa-down-to-bracket ipf-logo__icon" />
              <i v-else class="fa-duotone fa-cloud-arrow-up ipf-logo__icon" />
              <div class="ipf-logo__text">
                <template v-if="isUploadingLogo">{{ t('common.uploading') }}</template>
                <template v-else-if="isDraggingLogo">{{ t('common.dropHere') }}</template>
                <template v-else>{{ t('common.clickOrDragLogo') }}</template>
              </div>
              <span v-if="form.logo && !isUploadingLogo && !isDraggingLogo" class="ipf-logo__remove" role="button" tabindex="-1" @click.stop="removeLogo">&#10005;</span>
            </div>
            <input ref="logoInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="ipf-logo__input" @change="onLogoPicked" />
          </div>
        </div>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('common.cancel') }}
      </button>
      <button type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-floppy-disk" />
        {{ props.branch ? t('branches.updateBranch') : t('branches.saveBranch') }}
      </button>
    </div>
  </div>
</template>
