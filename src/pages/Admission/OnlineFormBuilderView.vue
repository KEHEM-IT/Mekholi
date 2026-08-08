<!-- Admission > Online Form Builder View -->
<script setup lang="ts">
// Online Form Builder: lets the school admin configure the fields, fees,
// gateways, and dates for public online student registration.
// Features a dynamic, live-updating mock preview of the public form on the right!
import { computed, onMounted, reactive, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import {
  fetchFormConfig,
  saveFormConfig,
  emptyFormConfig,
  type AdmissionFormConfig,
  type CustomField,
} from '@/composables/Admission/useAdmissionFormBuilder'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'

defineOptions({ name: 'OnlineFormBuilderView' })

const { t, lang } = useTranslator()
const toast = useToast()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const form = reactive<AdmissionFormConfig>(emptyFormConfig())

// Local state for creating a new custom field
const newCustomLabel = ref('')
const newCustomType = ref<'text' | 'number' | 'dropdown' | 'file'>('text')
const newCustomRequired = ref(false)
const newCustomOptions = ref('')

const isSaving = ref(false)

// ── Standard Fields Specification ──────────────────────────────────────
const STANDARD_FIELDS = [
  { key: 'candidate_name', label: 'Candidate Name (English)', labelBn: 'শিক্ষার্থীর নাম (ইংরেজী)' },
  { key: 'candidate_name_bn', label: 'Candidate Name (Bangla)', labelBn: 'শিক্ষার্থীর নাম (বাংলা)' },
  { key: 'guardian_name', label: 'Guardian Name', labelBn: 'অভিভাবকের নাম' },
  { key: 'phone', label: 'Contact Phone', labelBn: 'যোগাযোগের মোবাইল' },
  { key: 'email', label: 'Email Address', labelBn: 'ইমেইল ঠিকানা' },
  { key: 'desired_class', label: 'Desired Class', labelBn: 'কাঙ্ক্ষিত শ্রেণি' },
  { key: 'version', label: 'Desired Version / Curriculum', labelBn: 'ভার্সন ও কারিকুলাম' },
  { key: 'shift', label: 'Preferred Shift', labelBn: 'পছন্দসই শিফট' },
  { key: 'previous_school', label: 'Previous School Info', labelBn: 'পূর্ববর্তী শিক্ষাপ্রতিষ্ঠানের তথ্য' },
  { key: 'country', label: 'Country of Residence', labelBn: 'বসবাসের দেশ' },
  { key: 'nationality', label: 'Nationality', labelBn: 'জাতীয়তা' },
  { key: 'photo', label: 'Applicant Passport Photo (File)', labelBn: 'প্রার্থীর পাসপোর্ট সাইজ ছবি (ফাইল)' },
  { key: 'birth_certificate', label: 'Birth Certificate (PDF/Image)', labelBn: 'জন্ম নিবন্ধন সনদ (পিডিএফ/ছবি)' },
]

const customTypeOptions = [
  { Id: 'text', LookupText: 'Single-line Text', DisplayText: 'Single-line Text' },
  { Id: 'number', LookupText: 'Number', DisplayText: 'Number' },
  { Id: 'dropdown', LookupText: 'Dropdown / Select', DisplayText: 'Dropdown / Select' },
  { Id: 'file', LookupText: 'File Upload (PDF/Image)', DisplayText: 'File Upload (PDF/Image)' },
]

const statusOptions = [
  { Id: 'Draft', LookupText: 'Draft — Internal testing only', DisplayText: 'Draft — Testing' },
  { Id: 'Active', LookupText: 'Active — Published to portal', DisplayText: 'Active — Published' },
  { Id: 'Closed', LookupText: 'Closed — Submissions disabled', DisplayText: 'Closed — Disabled' },
]

const yearOptions = computed(() =>
  years.value.map((y) => ({
    Id: Number(y.id),
    LookupText: String(y.year_name),
    DisplayText: String(y.year_name),
  })),
)

async function loadAll() {
  const [config, y] = await Promise.all([fetchFormConfig(), fetchAcademicYears()])
  years.value = y
  if (config) {
    Object.assign(form, config)
    // Backfill standard fields config if empty
    if (!form.fields_config || Object.keys(form.fields_config).length === 0) {
      form.fields_config = {}
      for (const f of STANDARD_FIELDS) {
        form.fields_config[f.key] = { visible: true, required: f.key !== 'email' && f.key !== 'candidate_name_bn' }
      }
    }
  }
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

// ── Actions ────────────────────────────────────────────────────────────

function addCustomField() {
  if (!newCustomLabel.value.trim()) {
    toast.error(t('Field label is required'))
    return
  }
  const field: CustomField = {
    label: newCustomLabel.value.trim(),
    type: newCustomType.value,
    required: newCustomRequired.value,
  }
  if (newCustomType.value === 'dropdown' && newCustomOptions.value.trim()) {
    field.options = newCustomOptions.value.trim()
  }
  form.custom_fields.push(field)
  // Reset form inputs
  newCustomLabel.value = ''
  newCustomType.value = 'text'
  newCustomRequired.value = false
  newCustomOptions.value = ''
  toast.success(t('Custom field added to form pipeline'))
}

function removeCustomField(idx: number) {
  form.custom_fields.splice(idx, 1)
  toast.success(t('Custom field removed'))
}

async function handleSave() {
  isSaving.value = true
  try {
    const success = await saveFormConfig(form)
    if (success) {
      toast.success(t('Form builder configuration published successfully!'))
    } else {
      toast.error(t('Save failed — is server.py running?'))
    }
  } catch (err) {
    toast.error(t('Save failed: {error}', { error: err instanceof Error ? err.message : 'server error' }))
  } finally {
    isSaving.value = false
  }
}

function getSelectedYearName(): string {
  const match = years.value.find((y) => Number(y.id) === Number(form.academic_year_id))
  return match ? match.year_name : ''
}
</script>

<template>
  <!-- Skeleton Loader matching established standards -->
  <section v-if="isPageLoading" class="ipf-skeleton" aria-busy="true">
    <div class="ipf-skeleton__header">
      <div class="ipf-skeleton__titles">
        <span class="skeleton ipf-skeleton__title" />
        <span class="skeleton ipf-skeleton__subtitle" />
      </div>
      <div class="ipf-skeleton__actions">
        <span class="skeleton ipf-skeleton__pill" />
      </div>
    </div>
    <div class="skeleton skeleton--card ipf-sk-section">
      <span class="skeleton ipf-sk-section-title" />
      <div class="ipf-sk-grid ipf-sk-grid--three">
        <span v-for="m in 6" :key="m" class="skeleton ipf-sk-field" />
      </div>
    </div>
  </section>

  <section v-else class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Online Form Builder') }}</h1>
        <p>{{ t('Customize standard and custom fields, fees, and instructions for your public student admission applications portal.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" :disabled="isSaving" @click="handleSave">
          <i class="fa-duotone" :class="isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" />
          {{ t('Publish Form Config') }}
        </button>
      </div>
    </header>

    <!-- Two-Column Form Builder Workspace -->
    <div class="fb-layout">
      <!-- Left Column: Form Settings & Fields Configuration -->
      <div class="fb-column fb-column--config">
        <!-- Section 1: Form General Meta -->
        <div class="ipf-section">
          <h4 class="ipf-section__title">
            <i class="fa-duotone fa-sliders" />
            {{ t('General Settings') }}
          </h4>
          <div class="ipf-grid">
            <div class="form-field ipf-field--span2">
              <label>{{ t('Form Title (English)') }} *</label>
              <input v-model="form.form_title" type="text" :placeholder="t('e.g. Online Student Admission')" />
            </div>
            <div class="form-field ipf-field--span2">
              <label>{{ t('Form Title (Bangla)') }}</label>
              <input v-model="form.form_title_bn" type="text" :placeholder="t('বাংলা টাইটেল লিখুন')" />
            </div>
            <div class="form-field">
              <label>{{ t('Application Intake Session') }} *</label>
              <BaseCombobox
                v-model="form.academic_year_id"
                :options="yearOptions"
                option-value="Id"
                option-label="DisplayText"
                :placeholder="t('Select session')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Application Fee (BDT)') }} *</label>
              <input v-model.number="form.application_fee" type="number" min="0" :placeholder="t('e.g. 200')" />
            </div>
            <div class="form-field">
              <label>{{ t('Applications Open Date') }}</label>
              <BaseDatePicker v-model="form.open_date" :placeholder="t('DD/MM/YYYY')" />
            </div>
            <div class="form-field">
              <label>{{ t('Applications Close Date') }}</label>
              <BaseDatePicker v-model="form.close_date" :placeholder="t('DD/MM/YYYY')" />
            </div>
            <div class="form-field">
              <label>{{ t('Form Publish Status') }}</label>
              <BaseCombobox
                v-model="form.status"
                :options="statusOptions"
                option-value="Id"
                option-label="DisplayText"
                :placeholder="t('Select status')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Form Active') }}</label>
              <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
            </div>
            <div class="form-field ipf-field--full">
              <label>{{ t('Instructions for Parents (English)') }}</label>
              <textarea v-model="form.instructions" rows="2" :placeholder="t('Add instructions to show on portal...')" />
            </div>
            <div class="form-field ipf-field--full">
              <label>{{ t('Instructions for Parents (Bangla)') }}</label>
              <textarea v-model="form.instructions_bn" rows="2" :placeholder="t('নির্দেশনাবলী বাংলায় লিখুন...')" />
            </div>
          </div>
        </div>

        <!-- Section 2: Standard Fields Manager -->
        <div class="ipf-section">
          <h4 class="ipf-section__title">
            <i class="fa-duotone fa-table-list" />
            {{ t('Standard Profile Fields') }}
          </h4>
          <p class="fb-section-subtitle">
            {{ t('Manage standard biographical, residency, and document checklist options on the intake form.') }}
          </p>

          <div class="fb-fields-table">
            <div class="fb-fields-row fb-fields-row--header">
              <span>{{ t('Field Profile Name') }}</span>
              <span class="align-center">{{ t('Show Field') }}</span>
              <span class="align-center">{{ t('Required') }}</span>
            </div>
            <div v-for="f in STANDARD_FIELDS" :key="f.key" class="fb-fields-row">
              <span class="field-label-text">
                {{ lang === 'bn' && f.labelBn ? f.labelBn : f.label }}
              </span>
              <span class="align-center">
                <BaseToggle
                  v-if="form.fields_config && form.fields_config[f.key]"
                  v-model="form.fields_config[f.key].visible"
                />
              </span>
              <span class="align-center">
                <BaseToggle
                  v-if="form.fields_config && form.fields_config[f.key]"
                  v-model="form.fields_config[f.key].required"
                  :disabled="!form.fields_config[f.key]?.visible"
                />
              </span>
            </div>
          </div>
        </div>

        <!-- Section 3: Custom Fields Manager -->
        <div class="ipf-section">
          <h4 class="ipf-section__title">
            <i class="fa-duotone fa-folder-plus" />
            {{ t('Custom Admission Fields') }}
          </h4>
          <p class="fb-section-subtitle">
            {{ t('Add custom tailored fields such as special needs, medical allergies, sports history, etc.') }}
          </p>

          <!-- List of Added Custom Fields -->
          <div v-if="form.custom_fields.length" class="fb-custom-list">
            <div v-for="(cf, idx) in form.custom_fields" :key="idx" class="fb-custom-item">
              <div class="cf-info">
                <strong>{{ cf.label }}</strong>
                <span class="cf-type-badge">{{ cf.type }}</span>
                <span v-if="cf.required" class="cf-req-badge">{{ t('Required') }}</span>
              </div>
              <button type="button" class="fb-cf-remove" @click="removeCustomField(idx)">
                <i class="fa-duotone fa-trash" />
              </button>
            </div>
          </div>
          <div v-else class="fb-custom-empty">
            <i class="fa-duotone fa-clipboard-check" />
            <p>{{ t('No custom fields added yet. Customize your intake form below!') }}</p>
          </div>

          <!-- Add Custom Field Controls -->
          <div class="fb-cf-form">
            <h5>{{ t('Create New Custom Field') }}</h5>
            <div class="ipf-grid">
              <div class="form-field ipf-field--span2">
                <label>{{ t('Custom Field Label') }}</label>
                <input v-model="newCustomLabel" type="text" :placeholder="t('e.g. Sports achievements')" />
              </div>
              <div class="form-field">
                <label>{{ t('Input Component Type') }}</label>
                <BaseCombobox
                  v-model="newCustomType"
                  :options="customTypeOptions"
                  option-value="Id"
                  option-label="DisplayText"
                  :placeholder="t('Select type')"
                />
              </div>
              <div class="form-field">
                <label>{{ t('Input Required') }}</label>
                <BaseToggle v-model="newCustomRequired" :yes-label="t('Yes')" :no-label="t('No')" />
              </div>
              <div v-if="newCustomType === 'dropdown'" class="form-field ipf-field--full">
                <label>{{ t('Dropdown Menu Options') }}</label>
                <input v-model="newCustomOptions" type="text" :placeholder="t('e.g. Cricket, Football, Swimming (Comma list)')" />
              </div>
            </div>
            <button type="button" class="btn btn--ghost mt-3" @click="addCustomField">
              <i class="fa-duotone fa-plus" /> {{ t('Add Custom Field') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Right Column: Real-time Live Public Mockup Preview -->
      <div class="fb-column fb-column--preview">
        <div class="mockup-sticky">
          <div class="mockup-browser">
            <div class="browser-head">
              <div class="dots"><span /><span /><span /></div>
              <div class="url-bar">shikkha-erp.com/apply/sofir-uddin-school</div>
            </div>

            <!-- Public Portal Form Mockup Body -->
            <div class="browser-body">
              <header class="form-head-preview">
                <div class="logo-circle"><i class="fa-duotone fa-graduation-cap" /></div>
                <h2>{{ lang === 'bn' && form.form_title_bn ? form.form_title_bn : form.form_title || 'Online Admission Form' }}</h2>
                <p class="intake-year">
                  {{ t('Admission Session / Intake Intake:') }} <strong>{{ getSelectedYearName() || '2026' }}</strong>
                </p>
                <div class="fee-badge" v-if="form.application_fee > 0">
                  {{ t('Application Processing Fee:') }} <strong>{{ form.application_fee }} BDT</strong>
                </div>
              </header>

              <div class="instructions-card" v-if="form.instructions || form.instructions_bn">
                <i class="fa-duotone fa-circle-info" />
                <p>{{ lang === 'bn' && form.instructions_bn ? form.instructions_bn : form.instructions }}</p>
              </div>

              <!-- Dynamically Rendered Visible Standard Fields -->
              <form class="mock-form" @submit.prevent>
                <div class="mock-grid">
                  <div
                    v-for="sf in STANDARD_FIELDS"
                    :key="sf.key"
                    v-show="form.fields_config[sf.key]?.visible"
                    class="mock-field"
                    :class="{ 'mock-field--full': sf.key === 'previous_school' }"
                  >
                    <label>
                      {{ lang === 'bn' && sf.labelBn ? sf.labelBn : sf.label }}
                      <span v-if="form.fields_config[sf.key]?.required" class="required-star">*</span>
                    </label>
                    <div class="mock-input">
                      <span v-if="sf.key === 'photo' || sf.key === 'birth_certificate'" class="upload-mock">
                        <i class="fa-duotone fa-cloud-arrow-up" /> {{ t('Click to upload document') }}
                      </span>
                      <span v-else class="placeholder-mock">{{ t('Enter value...') }}</span>
                    </div>
                  </div>

                  <!-- Dynamically Rendered Custom Fields -->
                  <div
                    v-for="(cf, idx) in form.custom_fields"
                    :key="idx"
                    class="mock-field mock-field--full"
                  >
                    <label>
                      {{ cf.label }}
                      <span v-if="cf.required" class="required-star">*</span>
                    </label>
                    <div class="mock-input">
                      <span v-if="cf.type === 'file'" class="upload-mock">
                        <i class="fa-duotone fa-cloud-arrow-up" /> {{ t('Click to upload document') }}
                      </span>
                      <span v-else-if="cf.type === 'dropdown'" class="placeholder-mock select-mock">
                        {{ cf.options ? cf.options.split(',')[0] : t('Select option...') }}
                      </span>
                      <span v-else class="placeholder-mock">{{ t('Enter value...') }}</span>
                    </div>
                  </div>
                </div>

                <button type="button" class="mock-submit" disabled>
                  <i class="fa-duotone fa-paper-plane" /> {{ t('Submit Application & Pay Fee') }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>


