<!-- Institute Setup > Institute Profile -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAppPreferences } from '@/composables/useAppPreferences'
import suhscJson from '@/assets/school/suhsc_generated.json'

defineOptions({ name: 'InstituteProfile' })

const { preferences } = useAppPreferences()
const isBn = computed(() => preferences.uiLanguage === 'bn')

// --- Load from suhsc_generated.json (old flat format without general_info) -----
const raw = (suhscJson as { school_data: Record<string, unknown>[] }).school_data[0]!
const profile = reactive({
  institute_name_bn: raw.institute_name_bn as string | null,
  institute_name_en: raw.institute_name_en as string | null,
  founder_name: raw.founder_name as string | null,
  head_of_institute_name: raw.head_of_institute_name as string | null,
  parliamentary_constituency: raw.parliamentary_constituency as string | null,
  establishment_date: raw.establishment_date as string | null,
  address: { ...(raw.address as Record<string, unknown>) } as Record<string, unknown>,
  contact: { ...(raw.contact as Record<string, unknown>) } as Record<string, unknown>,
  classification: { ...(raw.classification as Record<string, unknown>) } as Record<string, unknown>,
  identifiers: { ...(raw.identifiers as Record<string, unknown>) } as Record<string, unknown>,
  mpo_status: { ...(raw.mpo_status as Record<string, unknown>) } as Record<string, unknown>,
  location_details: { ...(raw.location_details as Record<string, unknown>) } as Record<string, unknown>,
  income_total: raw.income_total as number | null,
  expense_total: raw.expense_total as number | null,
  student_fee_amount: raw.student_fee_amount as number | null,
})

const isSaving = ref(false)

function handleSave() {
  isSaving.value = true
  // TODO: API call — for now just toggles back
  setTimeout(() => (isSaving.value = false), 500)
}
</script>

<template>
  <section class="ipf">
    <header class="ipf-header">
      <h1>{{ isBn ? 'ইনস্টিটিউট প্রোফাইল' : 'Institute Profile' }}</h1>
      <p>
        {{
          isBn
            ? 'আপনার প্রতিষ্ঠানের সাধারণ তথ্য, ঠিকানা, যোগাযোগ এবং শ্রেণিবিন্যাস দেখুন ও সম্পাদনা করুন।'
            : 'View and edit your institute general info, address, contact and classification details.'
        }}
      </p>
    </header>

    <div class="ipf-layout">
      <!-- === LEFT COLUMN === -->
      <div class="ipf-main">
        <!-- Identity -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-id-card" />
              <div>
                <h2>{{ isBn ? 'পরিচয়' : 'Identity' }}</h2>
                <span>{{ isBn ? 'প্রতিষ্ঠানের নাম ও মৌলিক তথ্য' : 'Institute name and basic info' }}</span>
              </div>
            </div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid">
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠানের নাম (বাংলায়)' : 'Institute Name (Bangla)' }}</label>
                <input v-model="profile.institute_name_bn" name="institute_name_bn" type="text" :placeholder="isBn ? 'নাম লিখুন' : 'Enter name'" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institute Name (English)' }}</label>
                <input v-model="profile.institute_name_en" name="institute_name_en" type="text" :placeholder="isBn ? 'নাম লিখুন' : 'Enter name'" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠাতা' : 'Founder' }}</label>
                <input v-model="profile.founder_name" name="founder_name" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠান প্রধানের নাম' : 'Head of Institute' }}</label>
                <input v-model="profile.head_of_institute_name" name="head_of_institute_name" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠার তারিখ' : 'Establishment Date' }}</label>
                <input v-model="profile.establishment_date" name="establishment_date" type="text" placeholder="DD/MM/YYYY" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'সংসদীয় আসন' : 'Parliamentary Constituency' }}</label>
                <input v-model="profile.parliamentary_constituency" name="parliamentary_constituency" type="text" />
              </div>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-location-dot" />
              <div>
                <h2>{{ isBn ? 'ঠিকানা' : 'Address' }}</h2>
                <span>{{ isBn ? 'প্রতিষ্ঠানের ঠিকানা' : 'Institute address' }}</span>
              </div>
            </div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>{{ isBn ? 'গ্রাম/হোল্ডিং/রোড' : 'Village / Holding / Road' }}</label>
                <input v-model="profile.address.village_road_holding_no" name="village_road_holding_no" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'মৌজা' : 'Mouza' }}</label>
                <input v-model="profile.address.mouza_name" name="mouza_name" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'দাগ নম্বর' : 'Plot / Dag No.' }}</label>
                <input v-model.number="profile.address.plot_dag_number" name="plot_dag_number" type="number" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ডাকঘর' : 'Post Office' }}</label>
                <input v-model="profile.address.post_office" name="post_office" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'পোস্ট কোড' : 'Post Code' }}</label>
                <input v-model.number="profile.address.post_code" name="post_code" type="number" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ইউনিয়ন' : 'Union' }}</label>
                <input v-model="profile.address.union" name="union" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'উপজেলা/থানা' : 'Upazila / Thana' }}</label>
                <input v-model="profile.address.upazila_thana" name="upazila_thana" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'জেলা' : 'District' }}</label>
                <input v-model="profile.address.district" name="district" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'বিভাগ / অঞ্চল' : 'Division / Region' }}</label>
                <input v-model="profile.address.division_region" name="division_region" type="text" />
              </div>
            </div>
          </div>
        </div>

        <!-- Contact -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-phone" />
              <div>
                <h2>{{ isBn ? 'যোগাযোগ' : 'Contact' }}</h2>
                <span>{{ isBn ? 'ফোন, ইমেইল ও ওয়েবসাইট' : 'Phone, email & website' }}</span>
              </div>
            </div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid">
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠানের ফোন' : 'Institute Phone' }}</label>
                <input v-model.number="profile.contact.institute_phone" name="institute_phone" type="number" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'প্রধান মোবাইল' : 'Head Mobile' }}</label>
                <input v-model.number="profile.contact.head_of_institute_mobile" name="head_of_institute_mobile" type="number" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ফ্যাক্স' : 'Fax' }}</label>
                <input v-model="profile.contact.fax" name="fax" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ইমেইল' : 'Email' }}</label>
                <input v-model="profile.contact.institute_email" name="institute_email" type="email" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ওয়েবসাইট' : 'Website' }}</label>
                <input v-model="profile.contact.website" name="website" type="text" />
              </div>
            </div>
          </div>
        </div>

        <!-- Classification -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-tag" />
              <div>
                <h2>{{ isBn ? 'শ্রেণিবিন্যাস' : 'Classification' }}</h2>
                <span>{{ isBn ? 'প্রতিষ্ঠানের ধরণ ও স্বীকৃতি' : 'Institute type & recognition' }}</span>
              </div>
            </div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>{{ isBn ? 'প্রতিষ্ঠানের প্রকার' : 'Institute Type' }}</label>
                <input v-model="profile.classification.institute_type" name="institute_type" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'সংযুক্ত কারিগরি শাখা' : 'Attached Tech. Branch' }}</label>
                <input v-model="profile.classification.attached_technical_branch_type" name="attached_technical_branch_type" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'গ্রুপ' : 'Group' }}</label>
                <input v-model="profile.classification.group" name="group" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'কাদের জন্য' : 'Student Type' }}</label>
                <input v-model="profile.classification.student_type" name="student_type" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'শিফট সংখ্যা' : 'Shift Count' }}</label>
                <input v-model="profile.classification.shift_count" name="shift_count" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ইংরেজি ভার্সন' : 'English Version' }}</label>
                <input v-model="profile.classification.has_english_version" name="has_english_version" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ব্যবস্থাপনা' : 'Management' }}</label>
                <input v-model="profile.classification.management" name="management" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'স্বীকৃতির অবস্থা' : 'Recognition Status' }}</label>
                <input v-model="profile.classification.recognition_status" name="recognition_status" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'স্বীকৃতির স্তর' : 'Recognized Level' }}</label>
                <input v-model="profile.classification.recognized_level" name="recognized_level" type="text" />
              </div>
            </div>
          </div>
        </div>

        <!-- Identifiers -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-hashtag" />
              <div>
                <h2>{{ isBn ? 'কোডসমূহ' : 'Identifiers' }}</h2>
                <span>{{ isBn ? 'ইআইআইএন, এমপিও কোড ও অন্যান্য কোড' : 'EIIN, MPO code & other identifiers' }}</span>
              </div>
            </div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>EIIN</label>
                <input v-model="profile.identifiers.eiin" name="eiin" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'জিইও কোড' : 'Geo Code' }}</label>
                <input v-model="profile.identifiers.geo_code" name="geo_code" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'বোর্ড কোড' : 'Board Code' }}</label>
                <input v-model="profile.identifiers.board_institute_code" name="board_institute_code" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'কারিগরি বোর্ড কোড' : 'Technical Board Code' }}</label>
                <input v-model="profile.identifiers.technical_board_code" name="technical_board_code" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'এমপিও কোড' : 'MPO Code' }}</label>
                <input v-model="profile.identifiers.mpo_code" name="mpo_code" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'কারিগরি এমপিও কোড' : 'Tech. Branch MPO Code' }}</label>
                <input v-model="profile.identifiers.technical_branch_mpo_code" name="technical_branch_mpo_code" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'উপবৃত্তি কোড' : 'Stipend Code' }}</label>
                <input v-model="profile.identifiers.stipend_code" name="stipend_code" type="text" />
              </div>
            </div>
          </div>
        </div>

        <!-- MPO Status -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-check-circle" />
              <div>
                <h2>{{ isBn ? 'এমপিও অবস্থা' : 'MPO Status' }}</h2>
                <span>{{ isBn ? 'এমপিও ভুক্তি ও কারিগরি শাখার অবস্থা' : 'MPO enrollment & technical branch status' }}</span>
              </div>
            </div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid">
              <div class="form-field">
                <label>{{ isBn ? 'এমপিওভুক্ত?' : 'MPO Enrolled?' }}</label>
                <input v-model="profile.mpo_status.is_mpo_enrolled" name="is_mpo_enrolled" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'কারিগরি শাখা এমপিওভুক্ত?' : 'Technical Branch MPO?' }}</label>
                <input v-model="profile.mpo_status.technical_branch_mpo_status" name="technical_branch_mpo_status" type="text" />
              </div>
            </div>
          </div>
        </div>

        <!-- Location Details -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-map-pin" />
              <div>
                <h2>{{ isBn ? 'অবস্থানের বিবরণ' : 'Location Details' }}</h2>
                <span>{{ isBn ? 'ভৌগোলিক অবস্থান ও প্রশাসনিক সান্নিধ্য' : 'Geographic location & admin proximity' }}</span>
              </div>
            </div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>{{ isBn ? 'সরকারিকরণের তারিখ' : 'Nationalization Date' }}</label>
                <input v-model="profile.location_details.nationalization_date" name="nationalization_date" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'নিকটবর্তী প্রশাসনিক ইউনিট' : 'Nearest Admin Unit' }}</label>
                <input v-model="profile.location_details.nearest_admin_unit" name="nearest_admin_unit" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'দূরত্ব (কিমি)' : 'Distance (km)' }}</label>
                <input v-model.number="profile.location_details.nearest_admin_unit_distance_km" name="nearest_admin_unit_distance_km" type="number" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'এলাকার ধরণ' : 'Area Type' }}</label>
                <input v-model="profile.location_details.area_type" name="area_type" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ভৌগোলিক অবস্থান' : 'Geographic Location' }}</label>
                <input v-model="profile.location_details.geographic_location" name="geographic_location" type="text" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ছিটমহল?' : 'Enclave?' }}</label>
                <input v-model="profile.location_details.is_enclave" name="is_enclave" type="text" />
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Totals -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title">
              <i class="fa-duotone fa-coins" />
              <div>
                <h2>{{ isBn ? 'আর্থিক সারসংক্ষেপ' : 'Financial Summary' }}</h2>
                <span>{{ isBn ? 'আয়, ব্যয় ও সেশন চার্জ' : 'Income, expense & session charge' }}</span>
              </div>
            </div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field">
                <label>{{ isBn ? 'মোট আয়' : 'Total Income' }}</label>
                <input v-model.number="profile.income_total" name="income_total" type="number" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'মোট ব্যয়' : 'Total Expense' }}</label>
                <input v-model.number="profile.expense_total" name="expense_total" type="number" />
              </div>
              <div class="form-field">
                <label>{{ isBn ? 'ছাত্র বেতন ও সেশনচার্জ' : 'Student Fee Amount' }}</label>
                <input v-model.number="profile.student_fee_amount" name="student_fee_amount" type="number" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- === RIGHT COLUMN: live preview card (reads from reactive form) === -->
      <div class="ipf-side">
        <div class="ipf-preview">
          <div class="ipf-preview__band" />
          <div class="ipf-preview__logo-fallback">
            <i class="fa-duotone fa-school" />
          </div>
          <div class="ipf-preview__body">
            <strong>{{ profile.institute_name_en || (isBn ? profile.institute_name_bn : '—') }}</strong>
            <span class="ipf-preview__eiin">EIIN: {{ profile.identifiers.eiin || '—' }}</span>
            <div class="ipf-preview__badges">
              <span class="badge badge--info">{{ profile.classification.institute_type || '—' }}</span>
              <span class="badge" :class="profile.classification.management === 'Govt.' ? 'badge--success' : 'badge--neutral'">
                {{ profile.classification.management || '—' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sticky save bar -->
    <div class="ipf-savebar">
      <div class="ipf-savebar__status">
        <i class="fa-duotone fa-circle-check" />
        <span>{{ isBn ? 'পরিবর্তনগুলি সংরক্ষণ করা হয়নি' : 'Changes not saved' }}</span>
      </div>
      <div class="ipf-savebar__actions">
        <button type="button" class="btn btn--primary" :disabled="isSaving" @click="handleSave">
          <i class="fa-duotone fa-floppy-disk" />
          {{ isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'সংরক্ষণ করুন' : 'Save Profile') }}
        </button>
      </div>
    </div>
  </section>
</template>
