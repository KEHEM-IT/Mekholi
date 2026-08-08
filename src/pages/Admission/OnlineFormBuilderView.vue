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

<style lang="scss" scoped>
@use '@/styles/abstracts' as *;

.fb-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: $space-6;
  align-items: start;

  @include respond-to(xl) {
    grid-template-columns: minmax(0, 1fr) 480px;
  }
}

.fb-column {
  @include flex(column, stretch, flex-start, $space-6);
  min-width: 0;
}

.fb-section-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-top: -10px;
  margin-bottom: $space-3;
}

// ── Standard Fields Config Table ───────────────────────────────────────
.fb-fields-table {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: $radius-md;
  background: var(--color-surface);
  overflow: hidden;
}

.fb-fields-row {
  display: grid;
  grid-template-columns: 1fr 6rem 6rem;
  padding: $space-3 $space-4;
  border-bottom: 1px solid var(--color-border);
  align-items: center;

  &:last-child {
    border-bottom: none;
  }

  &--header {
    background: var(--color-surface-alt);
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
  }

  .field-label-text {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .align-center {
    display: flex;
    justify-content: center;
  }
}

// ── Custom Fields List ─────────────────────────────────────────────────
.fb-custom-list {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: $radius-md;
  overflow: hidden;
  background: var(--color-surface);
}

.fb-custom-item {
  @include flex(row, center, space-between, $space-3);
  padding: $space-3 $space-4;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }

  .cf-info {
    @include flex(row, center, flex-start, $space-2);
    flex-wrap: wrap;
    font-size: 0.88rem;

    strong {
      font-weight: 700;
      color: var(--color-text);
    }
  }

  .cf-type-badge,
  .cf-req-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 1px 8px;
    border-radius: 999px;
    text-transform: uppercase;
  }

  .cf-type-badge {
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border-strong);
    color: var(--color-text-secondary);
  }

  .cf-req-badge {
    background: var(--color-danger-muted);
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
  }
}

.fb-cf-remove {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 4px;
  border-radius: $radius-sm;

  &:hover {
    color: var(--color-danger);
    background: var(--color-danger-muted);
  }
}

.fb-custom-empty {
  @include flex(column, center, center, $space-2);
  width: 100%;
  padding: $space-8;
  border: 1px dashed var(--color-border-strong);
  border-radius: $radius-md;
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  text-align: center;

  i {
    font-size: 1.8rem;
    opacity: 0.5;
  }

  p {
    font-size: 0.85rem;
    font-weight: 600;
  }
}

.fb-cf-form {
  width: 100%;
  border-top: 1px solid var(--color-border-strong);
  margin-top: $space-4;
  padding-top: $space-4;

  h5 {
    font-size: 0.88rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-secondary);
    margin-bottom: $space-3;
  }
}

// ── Mockup Preview Panel ───────────────────────────────────────────────
.mockup-sticky {
  position: sticky;
  top: 6rem;
  z-index: 10;
}

.mockup-browser {
  width: 100%;
  border-radius: $radius-lg;
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  max-height: calc(100vh - 10rem);
  @include flex(column, stretch, flex-start);
}

.browser-head {
  @include flex(row, center, flex-start, $space-3);
  padding: $space-2 $space-4;
  background: var(--color-surface-alt);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;

  .dots {
    @include flex(row, center, flex-start, 4px);
    span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-border-strong);
    }
  }

  .url-bar {
    flex: 1;
    text-align: center;
    font-size: 0.72rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: $radius-sm;
    color: var(--color-text-muted);
    padding: 2px 0;
    @include truncate;
  }
}

.browser-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: $space-6;
  background: var(--color-bg);
}

.form-head-preview {
  text-align: center;
  @include flex(column, center, flex-start, $space-1);
  margin-bottom: $space-4;

  .logo-circle {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: var(--color-primary-muted);
    color: var(--color-primary);
    font-size: 1.3rem;
    border: 1px solid var(--color-border-strong);
    margin-bottom: $space-2;
  }

  h2 {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }

  .intake-year {
    font-size: 0.78rem;
    color: var(--color-text-secondary);
  }

  .fee-badge {
    margin-top: $space-2;
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--color-success-muted);
    border: 1px solid var(--color-success);
    color: var(--color-success);
    font-size: 0.75rem;
    font-weight: 700;
  }
}

.instructions-card {
  @include flex(row, flex-start, flex-start, $space-2);
  padding: $space-3;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: $radius-md;
  margin-bottom: $space-4;

  i {
    color: var(--color-info);
    font-size: 0.85rem;
    margin-top: 2px;
  }

  p {
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.mock-form {
  @include flex(column, stretch, flex-start, $space-4);
}

.mock-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: $space-3;
}

.mock-field {
  @include flex(column, flex-start, flex-start, 4px);

  label {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-text-muted);
  }

  .required-star {
    color: var(--color-danger);
    margin-left: 2px;
  }

  &--full {
    grid-column: 1 / -1;
  }
}

.mock-input {
  width: 100%;
  min-height: 2.2rem;
  border-radius: $radius-sm;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  @include flex(row, center, flex-start);
  padding: 0 $space-3;

  .placeholder-mock {
    font-size: 0.8rem;
    color: var(--color-text-disabled);
  }

  .upload-mock {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-primary);
    @include flex(row, center, flex-start, $space-2);
  }
}

.mock-submit {
  width: 100%;
  padding: $space-2 0;
  border-radius: $radius-md;
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-active));
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  @include flex(row, center, center, $space-2);
  opacity: 0.5;
  cursor: not-allowed;
  margin-top: $space-2;
}
</style>
