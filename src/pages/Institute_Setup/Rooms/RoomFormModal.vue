<script setup lang="ts">
// Add / edit modal for a Building or a Room — one generic form that renders
// the fields of the active entity (comboboxes for lookups + facility
// toggles for rooms).
import { computed, reactive } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import BaseCombobox from '@/components/ui/BaseCombobox.vue'
import BaseToggle from '@/components/ui/BaseToggle.vue'
import roomTypesJson from '@/assets/jsons/room_types.json'
import {
  emptyItem,
  type Building,
  type Room,
  type RoomEntity,
  type RoomItem,
} from '@/composables/Institute_Setup/useRoomsBuildings'

const props = defineProps<{
  entity: RoomEntity
  item: RoomItem | null
  /** Building lookups for the Room form's Building combobox. */
  buildings: { id?: number; building_name: string; building_name_bn?: string }[]
}>()

const emit = defineEmits<{
  save: [item: RoomItem]
  close: []
}>()

const { t } = useTranslator()
const toast = useToast()

// Concrete union so v-model bindings are typed (all fields of both entities).
const form = reactive<Partial<Building & Room>>({
  ...emptyItem(props.entity),
  ...(props.item ? (JSON.parse(JSON.stringify(props.item)) as Partial<Building & Room>) : {}),
})

// ── Options ────────────────────────────────────────────────────────────

const typeOptions = computed(() =>
  (roomTypesJson as { Id: string; LookupText: string }[]).map((x) => ({
    Id: x.Id,
    LookupText: x.LookupText,
    DisplayText: x.LookupText,
  })),
)

const buildingOptions = computed(() =>
  props.buildings.map((b) => ({
    Id: Number(b.id),
    LookupText: `${b.building_name}${b.building_name_bn ? ` - ${b.building_name_bn}` : ''}`,
    DisplayText: `${b.building_name}${b.building_name_bn ? ` - ${b.building_name_bn}` : ''}`,
  })),
)

// Room facilities — toggle list (stored as JSON array of keys).
const FACILITIES = [
  { key: 'projector', en: 'Projector', bn: 'প্রজেক্টর' },
  { key: 'ac', en: 'Air Conditioner', bn: 'এয়ার কন্ডিশনার' },
  { key: 'whiteboard', en: 'Whiteboard', bn: 'হোয়াইটবোর্ড' },
  { key: 'smartboard', en: 'Smart Board', bn: 'স্মার্ট বোর্ড' },
  { key: 'fan', en: 'Fan', bn: 'ফ্যান' },
  { key: 'computer', en: 'Computer', bn: 'কম্পিউটার' },
  { key: 'multimedia', en: 'Multimedia', bn: 'মাল্টিমিডিয়া' },
  { key: 'cctv', en: 'CCTV', bn: 'সিসিটিভি' },
]

const facilityList = computed(() =>
  FACILITIES.map((f) => ({
    key: f.key,
    label: `${f.en} - ${f.bn}`,
    on: Array.isArray(form.facilities) ? (form.facilities as string[]).includes(f.key) : false,
  })),
)

function toggleFacility(key: string, on: boolean) {
  const arr = Array.isArray(form.facilities) ? [...(form.facilities as string[])] : []
  if (on && !arr.includes(key)) arr.push(key)
  if (!on) {
    const i = arr.indexOf(key)
    if (i >= 0) arr.splice(i, 1)
  }
  form.facilities = arr
}

const isRooms = computed(() => props.entity === 'rooms')

// ── Validation ─────────────────────────────────────────────────────────

function validate(): boolean {
  if (props.entity === 'buildings') {
    if (!String(form.building_name ?? '').trim()) {
      toast.error(t('Building name is required'))
      return false
    }
    if (!String(form.building_code ?? '').trim()) {
      toast.error(t('Building code is required'))
      return false
    }
  } else {
    if (!String(form.room_no ?? '').trim()) {
      toast.error(t('Room no is required'))
      return false
    }
    if (!form.building_id) {
      toast.error(t('Building is required'))
      return false
    }
    if (form.floor_no == null || Number(form.floor_no) < 0) {
      toast.error(t('Floor no is required'))
      return false
    }
    if (!String(form.room_type ?? '').trim()) {
      toast.error(t('Room type is required'))
      return false
    }
  }
  return true
}

function submit() {
  if (!validate()) return
  const out: Record<string, unknown> = { ...form }
  emit('save', out as unknown as RoomItem)
}
</script>

<template>
  <div class="ipfp">
    <div class="ipfp-body">
      <div class="ipfp-section">
        <h4 class="ipfp-section__title">
          <i class="fa-duotone" :class="isRooms ? 'fa-door-open' : 'fa-building'" />
          {{ isRooms ? t('Room Details') : t('Building Details') }}
        </h4>
        <div class="ipfp-grid">
          <!-- ── Building fields ─────────────────────────────────────── -->
          <template v-if="!isRooms">
            <div class="form-field">
              <label>{{ t('Building Name') }} *</label>
              <input v-model="form.building_name" type="text" :placeholder="t('e.g. Main Building')" />
            </div>
            <div class="form-field">
              <label>{{ t('Building Name (Bangla)') }}</label>
              <input v-model="form.building_name_bn" type="text" :placeholder="t('e.g. মূল ভবন')" />
            </div>
            <div class="form-field">
              <label>{{ t('Building Code') }} *</label>
              <input v-model="form.building_code" type="text" :placeholder="t('e.g. BLK-01')" />
            </div>
            <div class="form-field">
              <label>{{ t('Number of Floors') }}</label>
              <input v-model.number="form.floor_count" type="number" min="0" :placeholder="t('e.g. 3')" />
            </div>
            <div class="form-field">
              <label>{{ t('Active') }}</label>
              <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
            </div>
          </template>

          <!-- ── Room fields ─────────────────────────────────────────── -->
          <template v-else>
            <div class="form-field">
              <label>{{ t('Room No / Name') }} *</label>
              <input v-model="form.room_no" type="text" :placeholder="t('e.g. 201')" />
            </div>
            <div class="form-field">
              <label>{{ t('Room No (Bangla)') }}</label>
              <input v-model="form.room_no_bn" type="text" :placeholder="t('e.g. ল্যাব-১')" />
            </div>
            <div class="form-field">
              <label>{{ t('Building') }} *</label>
              <BaseCombobox
                v-model="form.building_id"
                :options="buildingOptions"
                option-value="Id"
                option-label="DisplayText"
                :placeholder="t('Select building')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Floor No') }} *</label>
              <input v-model.number="form.floor_no" type="number" min="0" :placeholder="t('0 = Ground')" />
            </div>
            <div class="form-field">
              <label>{{ t('Room Type') }} *</label>
              <BaseCombobox
                v-model="form.room_type"
                :options="typeOptions"
                option-value="Id"
                option-label="DisplayText"
                :placeholder="t('Select room type')"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Capacity') }}</label>
              <input v-model.number="form.capacity" type="number" min="0" :placeholder="t('e.g. 50')" />
            </div>

            <!-- Facilities toggle list -->
            <div class="form-field ipf-field--span2">
              <label>{{ t('Facilities') }}</label>
              <div class="rm-facilities">
                <label
                  v-for="f in facilityList"
                  :key="f.key"
                  class="rm-facility"
                  :class="{ 'is-on': f.on }"
                >
                  <BaseToggle :model-value="f.on" :yes-label="t('Yes')" :no-label="t('No')" @update:model-value="toggleFacility(f.key, $event)" />
                  <span>{{ f.label }}</span>
                </label>
              </div>
            </div>

            <div class="form-field">
              <label>{{ t('Status') }}</label>
              <BaseToggle
                :model-value="String(form.status ?? '') !== 'Maintenance'"
                :yes-label="t('Active')"
                :no-label="t('Maintenance')"
                @update:model-value="form.status = $event ? 'Active' : 'Maintenance'"
              />
            </div>
            <div class="form-field">
              <label>{{ t('Active') }}</label>
              <BaseToggle v-model="form.is_active" :yes-label="t('Yes')" :no-label="t('No')" />
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="ipfp-form-actions">
      <button type="button" class="btn" @click="emit('close')">
        <i class="fa-duotone fa-xmark" /> {{ t('Cancel') }}
      </button>
      <button type="button" class="btn btn--primary" @click="submit">
        <i class="fa-duotone fa-floppy-disk" />
        {{ props.item ? t('Update') : t('Save') }}
      </button>
    </div>
  </div>
</template>
