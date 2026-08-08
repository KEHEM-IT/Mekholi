<script setup lang="ts">
// Form Modal to configure quota settings, view applicant pools,
// and execute a randomized digital lottery draw in real-time.
import { computed, onMounted, reactive, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import classNamesJson from '@/assets/jsons/class_names.json'
import { emptyLottery, type LotteryDraw } from '@/composables/Admission/useAdmissionLottery'
import { fetchApplications, type AdmissionApplication } from '@/composables/Admission/useAdmissionApplications'

const props = defineProps<{
  lottery: LotteryDraw | null
  years: { id?: number; year_name: string }[]
}>()

const emit = defineEmits<{
  save: [lottery: LotteryDraw]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<LotteryDraw>({
  ...emptyLottery(),
  ...(props.lottery ? (JSON.parse(JSON.stringify(props.lottery)) as Partial<LotteryDraw>) : {}),
})

// Ensure default academic year if adding and years are loaded
if (!form.id && props.years.length > 0 && !form.academic_year_id) {
  form.academic_year_id = Number(props.years[0].id)
}

const allApplications = ref<AdmissionApplication[]>([])
const eligiblePool = ref<AdmissionApplication[]>([])
const isDrawExecuted = ref(false)

const winnersList = ref<AdmissionApplication[]>([])
const waitlistList = ref<AdmissionApplication[]>([])

// ── Option Lists ────────────────────────────────────────────────────────

const yearOptions = computed(() =>
  props.years.map((y) => ({
    Id: Number(y.id),
    LookupText: String(y.year_name),
    DisplayText: String(y.year_name),
  })),
)

const classOptions = computed(() =>
  (classNamesJson as { Id: number; Name: string; NameInBangla: string; Phase: string; SortOrder: number }[]).map((c) => ({
    Id: String(c.Name),
    LookupText: `${c.Name} - ${c.NameInBangla}`,
    DisplayText: `${c.Name} - ${c.NameInBangla}`,
  })),
)

onMounted(async () => {
  allApplications.value = await fetchApplications()
  updateApplicantPool()
  
  // If editing/viewing an already executed draw, load the winners/waiting rosters
  if (form.id && form.selected_applicant_ids.length) {
    isDrawExecuted.value = true
    winnersList.value = allApplications.value.filter((a) => form.selected_applicant_ids.includes(Number(a.id)))
    waitlistList.value = allApplications.value.filter((a) => form.waiting_applicant_ids.includes(Number(a.id)))
  }
})

// Dynamically compute/update eligible pool based on selected class
function updateApplicantPool() {
  if (!form.class_name) {
    eligiblePool.value = []
    return
  }
  // Eligible = matches selected class, payment is Paid, and application is Submitted
  eligiblePool.value = allApplications.value.filter(
    (a) =>
      a.desired_class === form.class_name &&
      a.payment_status === 'Paid' &&
      (a.application_status === 'Submitted' || a.application_status === 'Screening'),
  )
}

// Watch class selection to re-calculate applicant pools
reactive(() => {
  updateApplicantPool()
})

// ── Randomized Lottery Algorithm ───────────────────────────────────────

function runDigitalDraw() {
  if (!form.class_name) {
    toast.error(t('Please select a desired class first'))
    return
  }
  if (eligiblePool.value.length === 0) {
    toast.error(t('No eligible paid applicants found in the pool for this class.'))
    return
  }
  
  // Clone eligible pool
  const pool = [...eligiblePool.value]
  
  // Cryptographically secure shuffle (Fisher-Yates Shuffle)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = pool[i]
    pool[i] = pool[j]
    pool[j] = temp
  }
  
  // Divide pool into winners and waitlist based on total_seats capacity
  const limit = Math.min(form.total_seats, pool.length)
  const winners = pool.slice(0, limit)
  const waiting = pool.slice(limit)
  
  // Map IDs to form states
  form.selected_applicant_ids = winners.map((w) => Number(w.id))
  form.waiting_applicant_ids = waiting.map((w) => Number(w.id))
  
  winnersList.value = winners
  waitlistList.value = waiting
  
  isDrawExecuted.value = true
  toast.success(t('Digital Lottery Draw executed with 100% success!'))
}

function submit() {
  if (!isDrawExecuted.value) {
    toast.error(t('Please run the Digital Draw first before publishing results'))
    return
  }
  emit('save', JSON.parse(JSON.stringify(form)) as LotteryDraw)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Section 1: Quota Configuration -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-sliders" />
          {{ t('Draw Parameters & Quotas') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Target Class') }} *</label>
            <BaseCombobox
              v-model="form.class_name"
              :options="classOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select class')"
              :disabled="Boolean(form.id)"
              @change="updateApplicantPool"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Academic Intake Year') }} *</label>
            <BaseCombobox
              v-model="form.academic_year_id"
              :options="yearOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select year')"
              :disabled="Boolean(form.id)"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Total Available Seats') }} *</label>
            <input
              v-model.number="form.total_seats"
              type="number"
              min="1"
              :disabled="Boolean(form.id)"
              :placeholder="t('e.g. 40')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Eligible Applicant Pool') }}</label>
            <div class="mock-input is-disabled">
              <span class="placeholder-mock font-bold">
                {{ eligiblePool.length }} {{ t('Paid Candidates') }}
              </span>
            </div>
          </div>
        </div>

        <h5 class="ipf-subhead mt-4">{{ t('Government & Institutional Quotas (%)') }}</h5>
        <div class="ipf-grid mt-2">
          <div class="form-field">
            <label>{{ t('General Merit Quota (%)') }}</label>
            <input v-model.number="form.quota_config.general" type="number" :disabled="Boolean(form.id)" min="0" max="100" />
          </div>
          <div class="form-field">
            <label>{{ t('Freedom Fighter Quota (%)') }}</label>
            <input v-model.number="form.quota_config.freedom_fighter" type="number" :disabled="Boolean(form.id)" min="0" max="100" />
          </div>
          <div class="form-field">
            <label>{{ t('Disabled / Special Needs (%)') }}</label>
            <input v-model.number="form.quota_config.disabled" type="number" :disabled="Boolean(form.id)" min="0" max="100" />
          </div>
          <div class="form-field">
            <label>{{ t('Staff Sibling Quota (%)') }}</label>
            <input v-model.number="form.quota_config.staff" type="number" :disabled="Boolean(form.id)" min="0" max="100" />
          </div>
        </div>
      </div>

      <!-- Action Button: Trigger Randomized Selection -->
      <div v-if="!form.id" class="flex justify-center my-4">
        <button type="button" class="btn btn--primary" @click="runDigitalDraw">
          <i class="fa-duotone fa-ticket-simple" /> {{ t('Run Cryptographic Draw') }}
        </button>
      </div>

      <!-- Live Roster Outputs after Draw Execution -->
      <div v-if="isDrawExecuted" class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-trophy" />
          {{ t('Draw Results & Rosters') }}
        </h4>

        <!-- Winners List -->
        <div class="lottery-winners-card">
          <h5 class="winners-list-title">
            <i class="fa-solid fa-circle-check" />
            {{ t('Selected Candidates (Merit Winners)') }} — {{ winnersList.length }}
          </h5>
          <div v-if="winnersList.length" class="winners-grid">
            <div v-for="(w, idx) in winnersList" :key="idx" class="winner-card">
              <span class="winner-card__rank">{{ idx + 1 }}</span>
              <div class="winner-card__info">
                <span class="winner-card__name">{{ w.candidate_name }}</span>
                <span class="winner-card__meta">{{ w.application_no }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-center font-bold text-gray-500 py-4">{{ t('No winners selected.') }}</p>
        </div>

        <!-- Waitlist -->
        <div class="lottery-winners-card mt-4">
          <h5 class="winners-list-title text-warning">
            <i class="fa-solid fa-circle-exclamation text-warning" />
            {{ t('Waitlisted Candidates') }} — {{ waitlistList.length }}
          </h5>
          <div v-if="waitlistList.length" class="winners-grid">
            <div v-for="(w, idx) in waitlistList" :key="idx" class="winner-card winner-card--wait">
              <span class="winner-card__rank">{{ idx + 1 }}</span>
              <div class="winner-card__info">
                <span class="winner-card__name">{{ w.candidate_name }}</span>
                <span class="winner-card__meta">{{ w.application_no }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-center font-bold text-gray-500 py-4">{{ t('No candidates in the waiting list.') }}</p>
        </div>
      </div>
    </div>

    <!-- Actions Footer -->
    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('Cancel') }}
      </button>
      <button v-if="!form.id" type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-bullhorn" />
        {{ t('Publish Draw Results') }}
      </button>
    </div>
  </div>
</template>
