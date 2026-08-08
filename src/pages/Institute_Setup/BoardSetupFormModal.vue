<script setup lang="ts">
// Add / edit modal for a Board — board fields + a collapsed Regulatory
// panel (recognition / registration / MPO / document).
import { computed, reactive, ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import boardTypesJson from '@/assets/jsons/board_types.json'
import instituteTypesJson from '@/assets/jsons/institute_types.json'
import { emptyBoard, type Board } from '@/composables/Institute_Setup/useBoards'

const props = defineProps<{
  board: Board | null
}>()

const emit = defineEmits<{
  save: [board: Board]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

const form = reactive<Board>({
  ...emptyBoard(),
  ...(props.board ? (JSON.parse(JSON.stringify(props.board)) as Partial<Board>) : {}),
  regulatory: {
    ...emptyBoard().regulatory,
    ...(props.board?.regulatory ?? {}),
  },
})

// Regulatory panel starts collapsed (unless editing an existing board).
const regOpen = ref(!props.board)

// ── Option lists ───────────────────────────────────────────────────────

const typeOptions = computed(() =>
  (boardTypesJson as { Id: string; LookupText: string }[]).map((x) => ({
    Id: x.Id,
    LookupText: x.LookupText,
    DisplayText: x.LookupText,
  })),
)

const instituteTypeOptions = computed(() =>
  (instituteTypesJson as { Id: number; Name: string; NameInBangla: string; LookupText: string }[]).map((x) => ({
    Id: Number(x.Id),
    LookupText: x.LookupText,
    DisplayText: `${x.Name}${x.NameInBangla ? ` - ${x.NameInBangla}` : ''}`,
  })),
)

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (!form.board_name.trim()) {
    toast.error(t('Board name is required'))
    return false
  }
  if (!form.board_code.trim()) {
    toast.error(t('Board code is required'))
    return false
  }
  if (!form.board_type) {
    toast.error(t('Board type is required'))
    return false
  }
  if (form.institute_type_ids.length === 0) {
    toast.error(t('Select at least one institute type'))
    return false
  }
  return true
}

function submit() {
  if (!validate()) return
  const out: Board = JSON.parse(JSON.stringify(form))
  // institute_type_ids arrive as strings from the multi-combo — coerce.
  out.institute_type_ids = (out.institute_type_ids as unknown as (string | number)[])
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n))
  emit('save', out)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <!-- Board details -->
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone fa-landmark" />
          {{ t('Board Details') }}
        </h4>
        <div class="ipfp-grid">
          <div class="form-field">
            <label>{{ t('Board Name') }} *</label>
            <input v-model="form.board_name" type="text" :placeholder="t('e.g. Sylhet Board')" />
          </div>
          <div class="form-field">
            <label>{{ t('Board Name (Bangla)') }}</label>
            <input v-model="form.board_name_bn" type="text" :placeholder="t('e.g. সিলেট বোর্ড')" />
          </div>
          <div class="form-field">
            <label>{{ t('Board Code') }} *</label>
            <input v-model="form.board_code" type="text" :placeholder="t('e.g. 108')" />
          </div>
          <div class="form-field">
            <label>{{ t('Board Type') }} *</label>
            <BaseCombobox
              v-model="form.board_type"
              :options="typeOptions"
              option-value="Id"
              option-label="DisplayText"
              :placeholder="t('Select board type')"
            />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Institute Types') }} *</label>
            <BaseCombobox
              v-model="form.institute_type_ids"
              :options="instituteTypeOptions"
              option-value="Id"
              option-label="DisplayText"
              multiple
              :placeholder="t('Select institute types')"
            />
          </div>
          <div class="form-field">
            <label>{{ t('Website') }}</label>
            <input v-model="form.website" type="url" :placeholder="t('e.g. https://sylhetboard.gov.bd')" />
          </div>
          <div class="form-field">
            <label>{{ t('Contact') }}</label>
            <input v-model="form.contact" type="text" :placeholder="t('e.g. +880 82 123456')" />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Address') }}</label>
            <input v-model="form.address" type="text" :placeholder="t('Board office address…')" />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Remarks') }}</label>
            <textarea v-model="form.remarks" rows="2" :placeholder="t('Optional notes…')" />
          </div>
        </div>
      </div>

      <!-- Regulatory block (collapsed) -->
      <div class="ipfp-section">
        <button
          type="button"
          class="gs-reg-head"
          :class="{ 'is-open': regOpen }"
          @click="regOpen = !regOpen"
        >
          <span class="gs-reg-head__title">
            <i class="fa-duotone fa-file-contract" />
            {{ t('Regulatory Info (Recognition / Registration / MPO)') }}
          </span>
          <i class="fa-duotone" :class="regOpen ? 'fa-chevron-up' : 'fa-chevron-down'" />
        </button>

        <div v-if="regOpen" class="ipfp-grid gs-reg-body">
          <div class="form-field">
            <label>{{ t('Recognition No (মঞ্জুরিপত্র)') }}</label>
            <input v-model="form.regulatory.recognition_no" type="text" :placeholder="t('e.g. S-1234/2024')" />
          </div>
          <div class="form-field">
            <label>{{ t('Recognition Date') }}</label>
            <BaseDatePicker v-model="form.regulatory.recognition_date" :placeholder="t('DD/MM/YYYY')" />
          </div>
          <div class="form-field">
            <label>{{ t('Registration No (নিবন্ধন)') }}</label>
            <input v-model="form.regulatory.registration_no" type="text" :placeholder="t('e.g. 4567')" />
          </div>
          <div class="form-field">
            <label>{{ t('MPO Link (MPO No)') }}</label>
            <input v-model="form.regulatory.mpo_no" type="text" :placeholder="t('e.g. MPO-2024-0001')" />
          </div>
          <div class="form-field ipf-field--span2">
            <label>{{ t('Attachment (PDF / URL)') }}</label>
            <input v-model="form.regulatory.document" type="text" :placeholder="t('e.g. https://…/recognition.pdf')" />
          </div>
        </div>
      </div>

      <div class="form-field ipf-field--full">
        <label>{{ t('Active') }}</label>
        <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
      </div>
    </div>

    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('Cancel') }}
      </button>
      <button type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-floppy-disk" />
        {{ props.board ? t('Update') : t('Save') }}
      </button>
    </div>
  </div>
</template>
