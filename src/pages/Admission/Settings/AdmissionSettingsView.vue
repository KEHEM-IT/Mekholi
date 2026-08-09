<!-- Admission > Admission Settings Page -->
<script setup lang="ts">
// Admission Settings: manages the global intake timeline dates, default processing
// fees, payment gateway merchant keys, and class-wise age restrictions.
import { computed, onMounted, reactive, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { fetchAcademicYears, type AcademicYear } from '@/composables/Institute_Setup/useAcademicYears'
import {
  fetchAdmissionSettings,
  saveAdmissionSettings,
  emptySettings,
  type AdmissionSettingsConfig,
} from '@/composables/Admission/useAdmissionSettings'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import classNamesJson from '@/assets/jsons/class_names.json'

defineOptions({ name: 'AdmissionSettingsView' })

const { t, lang } = useTranslator()
const toast = useToast()

const isPageLoading = ref(true)
const MIN_SKELETON_MS = 2000

const years = ref<AcademicYear[]>([])
const form = reactive<AdmissionSettingsConfig>(emptySettings())

const activeTab = ref<'dates' | 'age' | 'gateways'>('dates')
const isSaving = ref(false)

const yearOptions = computed(() =>
  years.value.map((y) => ({
    Id: Number(y.id),
    LookupText: String(y.year_name),
    DisplayText: String(y.year_name),
  })),
)

async function loadAll() {
  const [config, y] = await Promise.all([fetchAdmissionSettings(), fetchAcademicYears()])
  years.value = y
  if (config) {
    Object.assign(form, config)
    
    // Ensure age_limits is fully populated for all standard classes
    if (!form.age_limits || Object.keys(form.age_limits).length === 0) {
      form.age_limits = {}
    }
    for (const c of classNamesJson as { Name: string }[]) {
      if (!form.age_limits[c.Name]) {
        form.age_limits[c.Name] = { min: null, max: null }
      }
    }
    
    // Ensure payment_credentials
    if (!form.payment_credentials) {
      form.payment_credentials = {
        bkash_merchant_id: '',
        bkash_app_key: '',
        nagad_merchant_id: '',
        nagad_signature_key: '',
      }
    }
  }
}

onMounted(async () => {
  const minDelay = new Promise((r) => setTimeout(r, MIN_SKELETON_MS))
  await Promise.all([loadAll(), minDelay])
  isPageLoading.value = false
})

async function handleSave() {
  isSaving.value = true
  try {
    const success = await saveAdmissionSettings(form)
    if (success) {
      toast.success(t('Successfully updated global admission settings!'))
    } else {
      toast.error(t('Save failed — is server.py running?'))
    }
  } catch (err) {
    toast.error(t('Save failed: {error}', { error: err instanceof Error ? err.message : 'server error' }))
  } finally {
    isSaving.value = false
  }
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
        <h1>{{ t('Admission Settings') }}</h1>
        <p>{{ t('Configure global intake schedules, payment gateway merchant credentials, and age limits per class level.') }}</p>
      </div>
      <div class="ipf-header__actions">
        <button type="button" class="btn btn--primary" :disabled="isSaving" @click="handleSave">
          <i class="fa-duotone" :class="isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" />
          {{ t('Save Settings') }}
        </button>
      </div>
    </header>

    <!-- Tab Selection Headers -->
    <div class="adm-settings-tabs">
      <button
        type="button"
        class="adm-settings-tab"
        :class="{ 'is-active': activeTab === 'dates' }"
        @click="activeTab = 'dates'"
      >
        <i class="fa-duotone fa-calendar-clock" /> {{ t('Intake Calendar & Fees') }}
      </button>
      <button
        type="button"
        class="adm-settings-tab"
        :class="{ 'is-active': activeTab === 'age' }"
        @click="activeTab = 'age'"
      >
        <i class="fa-duotone fa-sliders" /> {{ t('Class Age Restrictions') }}
      </button>
      <button
        type="button"
        class="adm-settings-tab"
        :class="{ 'is-active': activeTab === 'gateways' }"
        @click="activeTab = 'gateways'"
      >
        <i class="fa-duotone fa-credit-card" /> {{ t('Payment Gateway Setup') }}
      </button>
    </div>

    <!-- Tab 1: Intake Calendar & Fees -->
    <div v-if="activeTab === 'dates'" class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-calendar-star" />
        {{ t('Admission Intake Schedule') }}
      </h4>
      <div class="ipf-grid">
        <div class="form-field">
          <label>{{ t('Active Academic Year') }} *</label>
          <BaseCombobox
            v-model="form.academic_year_id"
            :options="yearOptions"
            option-value="Id"
            option-label="DisplayText"
            :placeholder="t('Select year')"
          />
        </div>
        <div class="form-field">
          <label>{{ t('Default Application Fee (BDT)') }} *</label>
          <input v-model.number="form.application_fee" type="number" min="0" :placeholder="t('e.g. 200')" />
        </div>
        <div class="form-field">
          <label>{{ t('Intake Window Open') }} *</label>
          <BaseDatePicker v-model="form.open_date" :placeholder="t('DD/MM/YYYY')" />
        </div>
        <div class="form-field">
          <label>{{ t('Intake Window Close') }} *</label>
          <BaseDatePicker v-model="form.close_date" :placeholder="t('DD/MM/YYYY')" />
        </div>
        <div class="form-field">
          <label>{{ t('Admission Portal Active') }}</label>
          <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
        </div>
        <div class="form-field ipf-field--full">
          <label>{{ t('Certification Terms & Conditions (English)') }}</label>
          <textarea v-model="form.terms_en" rows="3" :placeholder="t('Add standard terms for parents to read...')" />
        </div>
        <div class="form-field ipf-field--full">
          <label>{{ t('Certification Terms & Conditions (Bangla)') }}</label>
          <textarea v-model="form.terms_bn" rows="3" :placeholder="t('শর্তাবলী বাংলায় লিখুন...')" />
        </div>
      </div>
    </div>

    <!-- Tab 2: Class Age Restrictions -->
    <div v-else-if="activeTab === 'age'" class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-child" />
        {{ t('Age Eligibility Constraints') }}
      </h4>
      <p class="fb-section-subtitle">
        {{ t('Configure age restrictions in years for each class. Ineligible applicants will be blocked from submission.') }}
      </p>

      <div class="age-limits-table">
        <div class="age-limits-row age-limits-row--header">
          <span>{{ t('Class Level') }}</span>
          <span class="align-center">{{ t('Minimum Age') }}</span>
          <span class="align-center">{{ t('Maximum Age') }}</span>
        </div>
        <div v-for="c in classNamesJson" :key="c.Name" class="age-limits-row">
          <span class="class-label-text">
            {{ lang === 'bn' ? c.NameInBangla : c.Name }}
          </span>
          <span class="align-center">
            <div class="limit-input-wrap">
              <input
                v-if="form.age_limits[c.Name]"
                v-model.number="form.age_limits[c.Name].min"
                type="number"
                min="1"
                placeholder="—"
              />
              <span>{{ t('Years') }}</span>
            </div>
          </span>
          <span class="align-center">
            <div class="limit-input-wrap">
              <input
                v-if="form.age_limits[c.Name]"
                v-model.number="form.age_limits[c.Name].max"
                type="number"
                min="1"
                placeholder="—"
              />
              <span>{{ t('Years') }}</span>
            </div>
          </span>
        </div>
      </div>
    </div>

    <!-- Tab 3: Payment Gateway Setup -->
    <div v-else class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-key" />
        {{ t('Merchant API Keys & Credentials') }}
      </h4>
      <p class="fb-section-subtitle">
        {{ t('Configure merchant account keys to receive instant online registration fee payments directly.') }}
      </p>

      <h5 class="ipf-subhead">{{ t('bKash merchant API credentials') }}</h5>
      <div class="ipf-grid mb-4">
        <div class="form-field">
          <label>{{ t('bKash Merchant ID') }}</label>
          <input v-model="form.payment_credentials.bkash_merchant_id" type="password" placeholder="••••••••" />
        </div>
        <div class="form-field">
          <label>{{ t('bKash App Key') }}</label>
          <input v-model="form.payment_credentials.bkash_app_key" type="password" placeholder="••••••••" />
        </div>
      </div>

      <h5 class="ipf-subhead">{{ t('Nagad merchant API credentials') }}</h5>
      <div class="ipf-grid">
        <div class="form-field">
          <label>{{ t('Nagad Merchant ID') }}</label>
          <input v-model="form.payment_credentials.nagad_merchant_id" type="password" placeholder="••••••••" />
        </div>
        <div class="form-field">
          <label>{{ t('Nagad Signature Key') }}</label>
          <input v-model="form.payment_credentials.nagad_signature_key" type="password" placeholder="••••••••" />
        </div>
      </div>
    </div>
  </section>
</template>
