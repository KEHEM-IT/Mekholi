<!-- Institute Setup > Institute Profile -->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppPreferences } from '@/composables/useAppPreferences'
import { instituteProfile, addProfileRecord, removeProfileRecord, saveProfile, loadProfileFromApi, isSaving } from '@/composables/useInstituteProfile'

defineOptions({ name: 'InstituteProfile' })

const { preferences } = useAppPreferences()
const isBn = computed(() => preferences.uiLanguage === 'bn')
const profile = instituteProfile

// Hydrate from API on mount (noop if API unavailable, falls back to static JSON)
onMounted(() => { loadProfileFromApi() })

function handleSave() { saveProfile() }
</script>

<template>
  <section class="ipf">
    <header class="ipf-header">
      <h1>{{ isBn ? 'ইনস্টিটিউট প্রোফাইল' : 'Institute Profile' }}</h1>
      <p>{{ isBn ? 'আপনার প্রতিষ্ঠানের সকল তথ্য দেখুন ও সম্পাদনা করুন।' : 'View and edit all your institute data.' }}</p>
    </header>

    <div class="ipf-layout">
      <div class="ipf-main">

        <!-- ========================= IDENTITY ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-id-card" /><div><h2>{{ isBn ? 'পরিচয়' : 'Identity' }}</h2><span>{{ isBn ? 'প্রতিষ্ঠানের নাম ও মৌলিক তথ্য' : 'Institute name and basic info' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid">
              <div class="form-field"><label>{{ isBn ? 'প্রতিষ্ঠানের নাম (বাংলায়)' : 'Institute Name (Bangla)' }}</label><input v-model="profile.institute_name_bn" name="institute_name_bn" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institute Name (English)' }}</label><input v-model="profile.institute_name_en" name="institute_name_en" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'প্রতিষ্ঠাতা' : 'Founder' }}</label><input v-model="profile.founder_name" name="founder_name" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'প্রতিষ্ঠান প্রধানের নাম' : 'Head of Institute' }}</label><input v-model="profile.head_of_institute_name" name="head_of_institute_name" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'প্রতিষ্ঠার তারিখ' : 'Establishment Date' }}</label><input v-model="profile.establishment_date" name="establishment_date" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'সংসদীয় আসন' : 'Parliamentary Constituency' }}</label><input v-model="profile.parliamentary_constituency" name="parliamentary_constituency" type="text" /></div>
            </div>
          </div>
        </div>

        <!-- ========================= ADDRESS ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-location-dot" /><div><h2>{{ isBn ? 'ঠিকানা' : 'Address' }}</h2><span>{{ isBn ? 'প্রতিষ্ঠানের ঠিকানা' : 'Institute address' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field"><label>{{ isBn ? 'গ্রাম/হোল্ডিং/রোড' : 'Village / Holding / Road' }}</label><input v-model="profile.address.village_road_holding_no" name="village_road_holding_no" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'মৌজা' : 'Mouza' }}</label><input v-model="profile.address.mouza_name" name="mouza_name" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'দাগ নম্বর' : 'Plot / Dag No.' }}</label><input v-model.number="profile.address.plot_dag_number" name="plot_dag_number" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'ডাকঘর' : 'Post Office' }}</label><input v-model="profile.address.post_office" name="post_office" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'পোস্ট কোড' : 'Post Code' }}</label><input v-model.number="profile.address.post_code" name="post_code" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'ইউনিয়ন' : 'Union' }}</label><input v-model="profile.address.union" name="union" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'উপজেলা/থানা' : 'Upazila / Thana' }}</label><input v-model="profile.address.upazila_thana" name="upazila_thana" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'জেলা' : 'District' }}</label><input v-model="profile.address.district" name="district" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'বিভাগ / অঞ্চল' : 'Division / Region' }}</label><input v-model="profile.address.division_region" name="division_region" type="text" /></div>
            </div>
          </div>
        </div>

        <!-- ========================= CONTACT ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-phone" /><div><h2>{{ isBn ? 'যোগাযোগ' : 'Contact' }}</h2><span>{{ isBn ? 'ফোন, ইমেইল ও ওয়েবসাইট' : 'Phone, email & website' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid">
              <div class="form-field"><label>{{ isBn ? 'প্রতিষ্ঠানের ফোন' : 'Institute Phone' }}</label><input v-model.number="profile.contact.institute_phone" name="institute_phone" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'প্রধান মোবাইল' : 'Head Mobile' }}</label><input v-model.number="profile.contact.head_of_institute_mobile" name="head_of_institute_mobile" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'ফ্যাক্স' : 'Fax' }}</label><input v-model="profile.contact.fax" name="fax" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'ইমেইল' : 'Email' }}</label><input v-model="profile.contact.institute_email" name="institute_email" type="email" /></div>
              <div class="form-field"><label>{{ isBn ? 'ওয়েবসাইট' : 'Website' }}</label><input v-model="profile.contact.website" name="website" type="text" /></div>
            </div>
          </div>
        </div>

        <!-- ========================= CLASSIFICATION ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-tag" /><div><h2>{{ isBn ? 'শ্রেণিবিন্যাস' : 'Classification' }}</h2><span>{{ isBn ? 'প্রতিষ্ঠানের ধরণ ও স্বীকৃতি' : 'Institute type & recognition' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field"><label>{{ isBn ? 'প্রতিষ্ঠানের প্রকার' : 'Institute Type' }}</label><input v-model="profile.classification.institute_type" name="institute_type" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'সংযুক্ত কারিগরি শাখা' : 'Attached Tech. Branch' }}</label><input v-model="profile.classification.attached_technical_branch_type" name="attached_technical_branch_type" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'গ্রুপ' : 'Group' }}</label><input v-model="profile.classification.group" name="group" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'কাদের জন্য' : 'Student Type' }}</label><input v-model="profile.classification.student_type" name="student_type" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'শিফট সংখ্যা' : 'Shift Count' }}</label><input v-model="profile.classification.shift_count" name="shift_count" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'ইংরেজি ভার্সন' : 'English Version' }}</label><input v-model="profile.classification.has_english_version" name="has_english_version" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'ব্যবস্থাপনা' : 'Management' }}</label><input v-model="profile.classification.management" name="management" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'স্বীকৃতির অবস্থা' : 'Recognition Status' }}</label><input v-model="profile.classification.recognition_status" name="recognition_status" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'স্বীকৃতির স্তর' : 'Recognized Level' }}</label><input v-model="profile.classification.recognized_level" name="recognized_level" type="text" /></div>
            </div>
          </div>
        </div>

        <!-- ========================= IDENTIFIERS ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-hashtag" /><div><h2>{{ isBn ? 'কোডসমূহ' : 'Identifiers' }}</h2><span>{{ isBn ? 'ইআইআইএন, এমপিও কোড ও অন্যান্য কোড' : 'EIIN, MPO code & other identifiers' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field"><label>EIIN</label><input v-model="profile.identifiers.eiin" name="eiin" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'জিইও কোড' : 'Geo Code' }}</label><input v-model="profile.identifiers.geo_code" name="geo_code" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'বোর্ড কোড' : 'Board Code' }}</label><input v-model="profile.identifiers.board_institute_code" name="board_institute_code" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'কারিগরি বোর্ড কোড' : 'Technical Board Code' }}</label><input v-model="profile.identifiers.technical_board_code" name="technical_board_code" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'এমপিও কোড' : 'MPO Code' }}</label><input v-model="profile.identifiers.mpo_code" name="mpo_code" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'কারিগরি এমপিও কোড' : 'Tech. Branch MPO Code' }}</label><input v-model="profile.identifiers.technical_branch_mpo_code" name="technical_branch_mpo_code" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'উপবৃত্তি কোড' : 'Stipend Code' }}</label><input v-model="profile.identifiers.stipend_code" name="stipend_code" type="text" /></div>
            </div>
          </div>
        </div>

        <!-- ========================= MPO STATUS ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-check-circle" /><div><h2>{{ isBn ? 'এমপিও অবস্থা' : 'MPO Status' }}</h2><span>{{ isBn ? 'এমপিও ভুক্তি ও কারিগরি শাখার অবস্থা' : 'MPO enrollment & technical branch status' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid">
              <div class="form-field"><label>{{ isBn ? 'এমপিওভুক্ত?' : 'MPO Enrolled?' }}</label><input v-model="profile.mpo_status.is_mpo_enrolled" name="is_mpo_enrolled" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'কারিগরি শাখা এমপিওভুক্ত?' : 'Technical Branch MPO?' }}</label><input v-model="profile.mpo_status.technical_branch_mpo_status" name="technical_branch_mpo_status" type="text" /></div>
            </div>
          </div>
        </div>

        <!-- ========================= LOCATION DETAILS ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-map-pin" /><div><h2>{{ isBn ? 'অবস্থানের বিবরণ' : 'Location Details' }}</h2><span>{{ isBn ? 'ভৌগোলিক অবস্থান ও প্রশাসনিক সান্নিধ্য' : 'Geographic location & admin proximity' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field"><label>{{ isBn ? 'সরকারিকরণের তারিখ' : 'Nationalization Date' }}</label><input v-model="profile.location_details.nationalization_date" name="nationalization_date" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'নিকটবর্তী প্রশাসনিক ইউনিট' : 'Nearest Admin Unit' }}</label><input v-model="profile.location_details.nearest_admin_unit" name="nearest_admin_unit" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'দূরত্ব (কিমি)' : 'Distance (km)' }}</label><input v-model.number="profile.location_details.nearest_admin_unit_distance_km" name="nearest_admin_unit_distance_km" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'এলাকার ধরণ' : 'Area Type' }}</label><input v-model="profile.location_details.area_type" name="area_type" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'ভৌগোলিক অবস্থান' : 'Geographic Location' }}</label><input v-model="profile.location_details.geographic_location" name="geographic_location" type="text" /></div>
              <div class="form-field"><label>{{ isBn ? 'ছিটমহল?' : 'Enclave?' }}</label><input v-model="profile.location_details.is_enclave" name="is_enclave" type="text" /></div>
            </div>
          </div>
        </div>

        <!-- ========================= FINANCIAL ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-coins" /><div><h2>{{ isBn ? 'আর্থিক সারসংক্ষেপ' : 'Financial Summary' }}</h2><span>{{ isBn ? 'আয়, ব্যয় ও সেশন চার্জ' : 'Income, expense & session charge' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field"><label>{{ isBn ? 'মোট আয়' : 'Total Income' }}</label><input v-model.number="profile.income_total" name="income_total" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'মোট ব্যয়' : 'Total Expense' }}</label><input v-model.number="profile.expense_total" name="expense_total" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'ছাত্র বেতন ও সেশনচার্জ' : 'Student Fee Amount' }}</label><input v-model.number="profile.student_fee_amount" name="student_fee_amount" type="number" /></div>
            </div>
          </div>
        </div>

        <!-- ========================= STAFF POSITIONS TOTAL ========================= -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-people-group" /><div><h2>{{ isBn ? 'মোট জনবল' : 'Staff Positions Total' }}</h2><span>{{ isBn ? 'সর্বমোট জনবল পরিসংখ্যান' : 'Aggregate staff position statistics' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div class="ipf-grid ipf-grid--three">
              <div class="form-field"><label>{{ isBn ? 'বর্তমানে কর্মরত (মোট)' : 'Currently Working (Total)' }}</label><input v-model.number="profile.staff_positions_total.currently_working_total" name="currently_working_total" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'বর্তমানে কর্মরত (পুরুষ)' : 'Currently Working (Male)' }}</label><input v-model.number="profile.staff_positions_total.currently_working_male" name="currently_working_male" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'বর্তমানে কর্মরত (মহিলা)' : 'Currently Working (Female)' }}</label><input v-model.number="profile.staff_positions_total.currently_working_female" name="currently_working_female" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'এমপিও (মোট)' : 'MPO (Total)' }}</label><input v-model.number="profile.staff_positions_total.mpo_total" name="mpo_total" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'এমপিও (পুরুষ)' : 'MPO (Male)' }}</label><input v-model.number="profile.staff_positions_total.mpo_male" name="mpo_male" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'এমপিও (মহিলা)' : 'MPO (Female)' }}</label><input v-model.number="profile.staff_positions_total.mpo_female" name="mpo_female" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'শূন্যপদ' : 'Vacant Posts' }}</label><input v-model.number="profile.staff_positions_total.vacant_post" name="vacant_post" type="number" /></div>
              <div class="form-field"><label>{{ isBn ? 'শাখার পদ' : 'Branch Posts' }}</label><input v-model.number="profile.staff_positions_total.branch_post" name="branch_post" type="number" /></div>
            </div>
          </div>
        </div>

        <!-- =================== ARRAY-DATA SECTIONS =================== -->
        <!-- Each section renders numbered cards with :name="section.index.field" -->

        <!-- Recognition History -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-clock-rotate-left" /><div><h2>{{ isBn ? 'স্বীকৃতির ইতিহাস' : 'Recognition History' }}</h2><span>{{ profile.recognition_history.length }} {{ isBn ? 'রেকর্ড' : 'records' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('recognition_history')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.recognition_history" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('recognition_history', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'স্তর' : 'Level' }}</label><input v-model="profile.recognition_history[i].level" :name="`recognition_history.${i}.level`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'প্রথম স্বীকৃতির তারিখ' : 'First Recognition Date' }}</label><input v-model="profile.recognition_history[i].first_recognition_date" :name="`recognition_history.${i}.first_recognition_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'সর্বশেষ মেয়াদ শেষের তারিখ' : 'Latest Expiry Date' }}</label><input v-model="profile.recognition_history[i].latest_recognition_expiry_date" :name="`recognition_history.${i}.latest_recognition_expiry_date`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- MPO Info -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-building-columns" /><div><h2>{{ isBn ? 'এমপিও তথ্য' : 'MPO Info' }}</h2><span>{{ profile.mpo_info.length }} {{ isBn ? 'রেকর্ড' : 'records' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('mpo_info')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.mpo_info" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('mpo_info', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'স্তর' : 'Level' }}</label><input v-model="profile.mpo_info[i].level" :name="`mpo_info.${i}.level`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'এমপিওভুক্তির তারিখ' : 'MPO Date' }}</label><input v-model="profile.mpo_info[i].mpo_date" :name="`mpo_info.${i}.mpo_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'এমপিও কোড' : 'MPO Code' }}</label><input v-model.number="profile.mpo_info[i].mpo_code" :name="`mpo_info.${i}.mpo_code`" type="number" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bank Accounts -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-piggy-bank" /><div><h2>{{ isBn ? 'ব্যাংক হিসাব' : 'Bank Accounts' }}</h2><span>{{ profile.bank_accounts.length }} {{ isBn ? 'একাউন্ট' : 'accounts' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('bank_accounts')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.bank_accounts" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('bank_accounts', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.bank_accounts[i].serial_no" :name="`bank_accounts.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'ব্যাংকের নাম' : 'Bank Name' }}</label><input v-model="profile.bank_accounts[i].bank_name" :name="`bank_accounts.${i}.bank_name`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'শাখা' : 'Branch' }}</label><input v-model="profile.bank_accounts[i].branch" :name="`bank_accounts.${i}.branch`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'হিসাবের ধরন' : 'Account Type' }}</label><input v-model="profile.bank_accounts[i].account_type" :name="`bank_accounts.${i}.account_type`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'একাউন্ট হোল্ডার' : 'Account Holder' }}</label><input v-model="profile.bank_accounts[i].account_holder_name" :name="`bank_accounts.${i}.account_holder_name`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'হিসাব নম্বর' : 'Account Number' }}</label><input v-model.number="profile.bank_accounts[i].account_number" :name="`bank_accounts.${i}.account_number`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'হিসাবের উদ্দেশ্য' : 'Account Purpose' }}</label><input v-model="profile.bank_accounts[i].account_purpose" :name="`bank_accounts.${i}.account_purpose`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Committee Members -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-users" /><div><h2>{{ isBn ? 'কমিটির সদস্য' : 'Committee Members' }}</h2><span>{{ profile.committee_members.length }} {{ isBn ? 'সদস্য' : 'members' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('committee_members')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.committee_members" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('committee_members', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.committee_members[i].serial_no" :name="`committee_members.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'সদস্যের নাম' : 'Member Name' }}</label><input v-model="profile.committee_members[i].member_name" :name="`committee_members.${i}.member_name`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'যোগদানের তারিখ' : 'Joining Date' }}</label><input v-model="profile.committee_members[i].joining_date" :name="`committee_members.${i}.joining_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'প্রস্থানের তারিখ' : 'Leaving Date' }}</label><input v-model="profile.committee_members[i].leaving_date" :name="`committee_members.${i}.leaving_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'ফোন' : 'Phone' }}</label><input v-model.number="profile.committee_members[i].phone" :name="`committee_members.${i}.phone`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'প্রাপ্ত প্রশিক্ষণ' : 'Trainings Received' }}</label><input v-model.number="profile.committee_members[i].trainings_received_count" :name="`committee_members.${i}.trainings_received_count`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'লিঙ্গ' : 'Gender' }}</label><input v-model="profile.committee_members[i].gender" :name="`committee_members.${i}.gender`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'কমিটিতে অবস্থান' : 'Committee Position' }}</label><input v-model="profile.committee_members[i].committee_position" :name="`committee_members.${i}.committee_position`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'শিক্ষাগত যোগ্যতা' : 'Education' }}</label><input v-model="profile.committee_members[i].education_qualification" :name="`committee_members.${i}.education_qualification`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'পেশা' : 'Occupation' }}</label><input v-model="profile.committee_members[i].occupation" :name="`committee_members.${i}.occupation`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'কমিটি ত্যাগ' : 'Left Committee' }}</label><input v-model="profile.committee_members[i].left_committee" :name="`committee_members.${i}.left_committee`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'ত্যাগের কারণ' : 'Reason for Leaving' }}</label><input v-model="profile.committee_members[i].reason_for_leaving" :name="`committee_members.${i}.reason_for_leaving`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Staff Positions -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-user-tie" /><div><h2>{{ isBn ? 'জনবল কাঠামো' : 'Staff Positions' }}</h2><span>{{ profile.staff_positions.length }} {{ isBn ? 'পদ' : 'positions' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('staff_positions')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.staff_positions" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('staff_positions', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.staff_positions[i].serial_no" :name="`staff_positions.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'পদবি' : 'Designation' }}</label><input v-model="profile.staff_positions[i].designation" :name="`staff_positions.${i}.designation`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'বর্তমানে কর্মরত (মোট)' : 'Currently Working (Total)' }}</label><input v-model.number="profile.staff_positions[i].currently_working_total" :name="`staff_positions.${i}.currently_working_total`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'বর্তমানে কর্মরত (পুরুষ)' : 'Currently Working (Male)' }}</label><input v-model.number="profile.staff_positions[i].currently_working_male" :name="`staff_positions.${i}.currently_working_male`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'বর্তমানে কর্মরত (মহিলা)' : 'Currently Working (Female)' }}</label><input v-model.number="profile.staff_positions[i].currently_working_female" :name="`staff_positions.${i}.currently_working_female`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'এমপিও (মোট)' : 'MPO (Total)' }}</label><input v-model.number="profile.staff_positions[i].mpo_total" :name="`staff_positions.${i}.mpo_total`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'এমপিও (পুরুষ)' : 'MPO (Male)' }}</label><input v-model.number="profile.staff_positions[i].mpo_male" :name="`staff_positions.${i}.mpo_male`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'এমপিও (মহিলা)' : 'MPO (Female)' }}</label><input v-model.number="profile.staff_positions[i].mpo_female" :name="`staff_positions.${i}.mpo_female`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'শূন্যপদ' : 'Vacant Posts' }}</label><input v-model.number="profile.staff_positions[i].vacant_post" :name="`staff_positions.${i}.vacant_post`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'শাখার পদ' : 'Branch Posts' }}</label><input v-model.number="profile.staff_positions[i].branch_post" :name="`staff_positions.${i}.branch_post`" type="number" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Former Committee Members -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-user-xmark" /><div><h2>{{ isBn ? 'সাবেক কমিটির সদস্য' : 'Former Committee Members' }}</h2><span>{{ profile.former_committee_members.length }} {{ isBn ? 'সদস্য' : 'members' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('former_committee_members')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.former_committee_members" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('former_committee_members', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.former_committee_members[i].serial_no" :name="`former_committee_members.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'সদস্যের নাম' : 'Member Name' }}</label><input v-model="profile.former_committee_members[i].member_name" :name="`former_committee_members.${i}.member_name`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'লিঙ্গ' : 'Gender' }}</label><input v-model="profile.former_committee_members[i].gender" :name="`former_committee_members.${i}.gender`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'ফোন' : 'Phone' }}</label><input v-model.number="profile.former_committee_members[i].phone" :name="`former_committee_members.${i}.phone`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'ত্যাগের কারণ' : 'Reason for Leaving' }}</label><input v-model="profile.former_committee_members[i].reason_for_leaving" :name="`former_committee_members.${i}.reason_for_leaving`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Development Projects -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-hard-hat" /><div><h2>{{ isBn ? 'উন্নয়ন প্রকল্প' : 'Development Projects' }}</h2><span>{{ profile.development_projects.length }} {{ isBn ? 'প্রকল্প' : 'projects' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('development_projects')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.development_projects" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('development_projects', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.development_projects[i].serial_no" :name="`development_projects.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'কাজের ধরন' : 'Work Type' }}</label><input v-model="profile.development_projects[i].work_type" :name="`development_projects.${i}.work_type`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'বিবরণ' : 'Description' }}</label><input v-model="profile.development_projects[i].description" :name="`development_projects.${i}.description`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'অগ্রগতি' : 'Progress' }}</label><input v-model="profile.development_projects[i].progress" :name="`development_projects.${i}.progress`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'শুরুর তারিখ' : 'Start Date' }}</label><input v-model="profile.development_projects[i].start_date" :name="`development_projects.${i}.start_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'মেয়াদ (মাস)' : 'Duration (Months)' }}</label><input v-model.number="profile.development_projects[i].duration_months" :name="`development_projects.${i}.duration_months`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'শেষের তারিখ' : 'End Date' }}</label><input v-model="profile.development_projects[i].end_date" :name="`development_projects.${i}.end_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'বরাদ্দকৃত ব্যয় (টাকা)' : 'Allocated Cost (Taka)' }}</label><input v-model.number="profile.development_projects[i].total_allocated_cost_taka" :name="`development_projects.${i}.total_allocated_cost_taka`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'অর্থায়নের উৎস' : 'Funding Source' }}</label><input v-model="profile.development_projects[i].funding_source" :name="`development_projects.${i}.funding_source`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'প্রকল্পের নাম' : 'Project Name' }}</label><input v-model="profile.development_projects[i].project_name" :name="`development_projects.${i}.project_name`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Committee Formation History -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-calendar-days" /><div><h2>{{ isBn ? 'কমিটি গঠন' : 'Committee Formation' }}</h2><span>{{ profile.committee_formation_history.length }} {{ isBn ? 'রেকর্ড' : 'records' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('committee_formation_history')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.committee_formation_history" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('committee_formation_history', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.committee_formation_history[i].serial_no" :name="`committee_formation_history.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'কমিটি আছে কি না' : 'Has Committee' }}</label><input v-model="profile.committee_formation_history[i].has_committee" :name="`committee_formation_history.${i}.has_committee`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'কমিটির প্রকার' : 'Committee Type' }}</label><input v-model="profile.committee_formation_history[i].committee_type" :name="`committee_formation_history.${i}.committee_type`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'অনুমোদনের তারিখ' : 'Approval Date' }}</label><input v-model="profile.committee_formation_history[i].approval_date" :name="`committee_formation_history.${i}.approval_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'মেয়াদ শেষের তারিখ' : 'Expiry Date' }}</label><input v-model="profile.committee_formation_history[i].expiry_date" :name="`committee_formation_history.${i}.expiry_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'নির্বাচনের তারিখ' : 'Election Date' }}</label><input v-model="profile.committee_formation_history[i].election_date" :name="`committee_formation_history.${i}.election_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'মন্তব্য' : 'Remarks' }}</label><input v-model="profile.committee_formation_history[i].remarks" :name="`committee_formation_history.${i}.remarks`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Committee Meetings -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-file-lines" /><div><h2>{{ isBn ? 'সভার বিবরণ' : 'Meeting Minutes' }}</h2><span>{{ profile.committee_meetings.length }} {{ isBn ? 'সভা' : 'meetings' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('committee_meetings')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.committee_meetings" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('committee_meetings', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.committee_meetings[i].serial_no" :name="`committee_meetings.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'সভার তারিখ' : 'Meeting Date' }}</label><input v-model="profile.committee_meetings[i].meeting_date" :name="`committee_meetings.${i}.meeting_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'উপস্থিতি' : 'Attendees' }}</label><input v-model.number="profile.committee_meetings[i].attendees_count" :name="`committee_meetings.${i}.attendees_count`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'আলোচ্যসূচি' : 'Agenda' }}</label><input v-model="profile.committee_meetings[i].agenda" :name="`committee_meetings.${i}.agenda`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'সিদ্ধান্ত' : 'Decision' }}</label><input v-model="profile.committee_meetings[i].decision" :name="`committee_meetings.${i}.decision`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Facilities -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-grid-2" /><div><h2>{{ isBn ? 'সুবিধাদি' : 'Facilities' }}</h2><span>{{ profile.facilities.length }} {{ isBn ? 'সুবিধা' : 'facilities' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('facilities')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.facilities" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('facilities', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.facilities[i].serial_no" :name="`facilities.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'নাম' : 'Name' }}</label><input v-model="profile.facilities[i].name" :name="`facilities.${i}.name`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'অবস্থা' : 'Status' }}</label><input v-model="profile.facilities[i].status" :name="`facilities.${i}.status`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inspection Visits -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-magnifying-glass" /><div><h2>{{ isBn ? 'পরিদর্শন' : 'Inspection Visits' }}</h2><span>{{ profile.inspection_visits.length }} {{ isBn ? 'পরিদর্শন' : 'visits' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('inspection_visits')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.inspection_visits" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('inspection_visits', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.inspection_visits[i].serial_no" :name="`inspection_visits.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'পরিদর্শকের নাম' : 'Inspector Name' }}</label><input v-model="profile.inspection_visits[i].inspector_name" :name="`inspection_visits.${i}.inspector_name`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'পরিদর্শকের পদবি' : 'Inspector Designation' }}</label><input v-model="profile.inspection_visits[i].inspector_designation" :name="`inspection_visits.${i}.inspector_designation`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'পরিদর্শন (গত ৫ বছর)' : 'Visits (Last 5 Yrs)' }}</label><input v-model.number="profile.inspection_visits[i].visits_last_5_years" :name="`inspection_visits.${i}.visits_last_5_years`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'সর্বশেষ পরিদর্শনের তারিখ' : 'Last Visit Date' }}</label><input v-model="profile.inspection_visits[i].last_visit_date" :name="`inspection_visits.${i}.last_visit_date`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Income Sources -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-money-bill-trend-up" /><div><h2>{{ isBn ? 'আয়ের উৎস' : 'Income Sources' }}</h2><span>{{ profile.income_sources.length }} {{ isBn ? 'উৎস' : 'sources' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('income_sources')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.income_sources" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('income_sources', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.income_sources[i].serial_no" :name="`income_sources.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'উৎস' : 'Source' }}</label><input v-model="profile.income_sources[i].source" :name="`income_sources.${i}.source`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'পরিমাণ' : 'Amount' }}</label><input v-model.number="profile.income_sources[i].amount" :name="`income_sources.${i}.amount`" type="number" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Expense Sources -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-money-bill-transfer" /><div><h2>{{ isBn ? 'ব্যয়ের উৎস' : 'Expense Sources' }}</h2><span>{{ profile.expense_sources.length }} {{ isBn ? 'উৎস' : 'sources' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('expense_sources')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.expense_sources" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('expense_sources', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.expense_sources[i].serial_no" :name="`expense_sources.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'উৎস' : 'Source' }}</label><input v-model="profile.expense_sources[i].source" :name="`expense_sources.${i}.source`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'পরিমাণ' : 'Amount' }}</label><input v-model.number="profile.expense_sources[i].amount" :name="`expense_sources.${i}.amount`" type="number" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Disasters -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-cloud-bolt" /><div><h2>{{ isBn ? 'দুর্যোগ' : 'Disasters' }}</h2><span>{{ profile.disasters.length }} {{ isBn ? 'রেকর্ড' : 'records' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('disasters')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.disasters" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('disasters', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid ipf-grid--three">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.disasters[i].serial_no" :name="`disasters.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'দুর্যোগের নাম' : 'Disaster Name' }}</label><input v-model="profile.disasters[i].disaster_name" :name="`disasters.${i}.disaster_name`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'শুরুর তারিখ' : 'Start Date' }}</label><input v-model="profile.disasters[i].start_date" :name="`disasters.${i}.start_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'শেষের তারিখ' : 'End Date' }}</label><input v-model="profile.disasters[i].end_date" :name="`disasters.${i}.end_date`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'বন্ধ ছিল (দিন)' : 'Days Closed' }}</label><input v-model.number="profile.disasters[i].closed_days" :name="`disasters.${i}.closed_days`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'ক্ষতির বিবরণ' : 'Damage Details' }}</label><input v-model="profile.disasters[i].damage_details" :name="`disasters.${i}.damage_details`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'কারণ' : 'Cause' }}</label><input v-model="profile.disasters[i].cause" :name="`disasters.${i}.cause`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'মন্তব্য' : 'Remarks' }}</label><input v-model="profile.disasters[i].remarks" :name="`disasters.${i}.remarks`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Trainings -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-chalkboard-user" /><div><h2>{{ isBn ? 'প্রশিক্ষণ' : 'Trainings' }}</h2><span>{{ profile.trainings.length }} {{ isBn ? 'রেকর্ড' : 'records' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('trainings')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.trainings" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('trainings', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.trainings[i].serial_no" :name="`trainings.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'প্রশিক্ষণের বিষয়' : 'Training Subject' }}</label><input v-model="profile.trainings[i].training_subject" :name="`trainings.${i}.training_subject`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Academic Result Tables -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-square-poll-vertical" /><div><h2>{{ isBn ? 'পরীক্ষার ফলাফল' : 'Academic Results' }}</h2><span>{{ profile.academic_result_tables.length }} {{ isBn ? 'সারণি' : 'tables' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(table, ti) in profile.academic_result_tables" :key="ti" class="ipf-array-card">
              <div class="ipf-array-card__head">Table #{{ ti + 1 }} — {{ table.table_type }}</div>
              <div class="ipf-grid">
                <div class="form-field"><label>{{ isBn ? 'সারণির ধরন' : 'Table Type' }}</label><input v-model="profile.academic_result_tables[ti].table_type" :name="`academic_result_tables.${ti}.table_type`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Other Tables -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-table" /><div><h2>{{ isBn ? 'অন্যান্য তথ্য' : 'Other Data' }}</h2><span>{{ profile.other_tables.length }} {{ isBn ? 'সারণি' : 'tables' }}</span></div></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(table, ti) in profile.other_tables" :key="ti" class="ipf-array-card">
              <div class="ipf-array-card__head">Table #{{ ti + 1 }}</div>
            </div>
          </div>
        </div>

        <!-- Institute Photos -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-images" /><div><h2>{{ isBn ? 'ছবি' : 'Institute Photos' }}</h2><span>{{ profile.institute_photos.length }} {{ isBn ? 'ছবি' : 'photos' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('institute_photos')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.institute_photos" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('institute_photos', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.institute_photos[i].serial_no" :name="`institute_photos.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'ছবির নাম' : 'Photo Name' }}</label><input v-model="profile.institute_photos[i].photo_name" :name="`institute_photos.${i}.photo_name`" type="text" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Institute Contacts -->
        <div class="ipf-section">
          <div class="ipf-section__head">
            <div class="ipf-section__title"><i class="fa-duotone fa-address-book" /><div><h2>{{ isBn ? 'যোগাযোগ ব্যক্তি' : 'Institute Contacts' }}</h2><span>{{ profile.institute_contacts.length }} {{ isBn ? 'ব্যক্তি' : 'contacts' }}</span></div><button type="button" class="btn btn--sm ipf-add-btn" @click="addProfileRecord('institute_contacts')">+ Add</button></div>
          </div>
          <div class="ipf-section__body">
            <div v-for="(item, i) in profile.institute_contacts" :key="i" class="ipf-array-card">
              <div class="ipf-array-card__head">#{{ i + 1 }} <button type="button" class="ipf-array-card__remove" @click="removeProfileRecord('institute_contacts', i)" title="Remove">&times;</button></div>
              <div class="ipf-grid">
                <div class="form-field"><label>{{ isBn ? 'ক্রমিক নং' : 'Serial No.' }}</label><input v-model.number="profile.institute_contacts[i].serial_no" :name="`institute_contacts.${i}.serial_no`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'নাম' : 'Name' }}</label><input v-model="profile.institute_contacts[i].name" :name="`institute_contacts.${i}.name`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'পদবি' : 'Designation' }}</label><input v-model="profile.institute_contacts[i].designation" :name="`institute_contacts.${i}.designation`" type="text" /></div>
                <div class="form-field"><label>{{ isBn ? 'মোবাইল' : 'Mobile' }}</label><input v-model.number="profile.institute_contacts[i].mobile" :name="`institute_contacts.${i}.mobile`" type="number" /></div>
                <div class="form-field"><label>{{ isBn ? 'ইমেইল' : 'Email' }}</label><input v-model="profile.institute_contacts[i].email" :name="`institute_contacts.${i}.email`" type="email" /></div>
              </div>
            </div>
          </div>
        </div>

      </div><!-- /ipf-main -->

      <!-- === RIGHT COLUMN: live preview === -->
      <div class="ipf-side">
        <div class="ipf-preview">
          <div class="ipf-preview__band" />
          <div class="ipf-preview__logo-fallback"><i class="fa-duotone fa-school" /></div>
          <div class="ipf-preview__body">
            <strong>{{ profile.institute_name_en || profile.institute_name_bn || '—' }}</strong>
            <span class="ipf-preview__eiin">EIIN: {{ profile.identifiers.eiin || '—' }}</span>
            <div class="ipf-preview__badges">
              <span class="badge badge--info">{{ profile.classification.institute_type || '—' }}</span>
              <span class="badge" :class="profile.classification.management === 'Govt.' ? 'badge--success' : 'badge--neutral'">{{ profile.classification.management || '—' }}</span>
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
