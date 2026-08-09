<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import NIDScanner from '@/plugins/NIDScanner/NIDScanner.vue'
import type { NIDScanResult } from '@/plugins/NIDScanner/nidScannerService'

const router = useRouter()
const scannedData = ref<NIDScanResult | null>(null)
const successMessage = ref('')

const handleScanSuccess = (data: NIDScanResult) => {
  scannedData.value = data
}

const handleReset = () => {
  scannedData.value = null
  successMessage.value = ''
}

const autofillStudentForm = () => {
  if (!scannedData.value) return

  // In a real production flow, we would save this to state (Pinia store) or query params
  // and route directly to the Student List Form with prefilled values!
  // Let's store in localStorage so the Student List form can read it and auto-fill!
  const studentPrefill = {
    candidate_name: scannedData.value.name_en,
    candidate_name_bn: scannedData.value.name_bn,
    father_name: scannedData.value.father_name,
    mother_name: scannedData.value.mother_name,
    date_of_birth: scannedData.value.dob,
    blood_group: scannedData.value.blood_group,
    present_address: scannedData.value.address,
    permanent_address: scannedData.value.address,
    government_uid: scannedData.value.nid_no,
    photo: '', // In a real flow, photo/sig could be mapped
  }

  localStorage.setItem('nid_prefill_student', JSON.stringify(studentPrefill))
  
  successMessage.value = 'Data successfully prepared! Redirecting to Student Registry form...'
  
  setTimeout(() => {
    router.push({ name: 'student-list', query: { prefill: 'nid' } })
  }, 1500)
}
</script>

<template>
  <div class="nid-scanner-view-page">
    <!-- Breadcrumb -->
    <div class="page-breadcrumb">
      <span class="crumb-parent">Students</span>
      <span class="crumb-separator">/</span>
      <span class="crumb-current">NID OCR Scanner</span>
    </div>

    <!-- Page Header -->
    <div class="page-header-row">
      <div>
        <h2 class="page-title">National ID (NID) Scanner</h2>
        <p class="page-subtitle">Fully automated OCR scanner plugin for instant student registration and validation.</p>
      </div>
    </div>

    <!-- Success Message Banner -->
    <div v-if="successMessage" class="autofill-success-banner">
      <span class="banner-icon">🎉</span>
      <span class="banner-text">{{ successMessage }}</span>
    </div>

    <!-- Reusable NID Scanner Component -->
    <NIDScanner 
      @scan-success="handleScanSuccess" 
      @reset="handleReset"
    >
      <template #actions="{ data }">
        <button 
          class="autofill-btn" 
          :disabled="!data"
          @click="autofillStudentForm"
        >
          <span class="btn-icon">📝</span>
          Fill Student Registry Form
        </button>
      </template>
    </NIDScanner>

    <!-- Additional Info Cards -->
    <div class="nid-info-cards-grid">
      <div class="info-card">
        <div class="card-icon">🎯</div>
        <div class="card-content">
          <h5>100% Client-Safe OCR</h5>
          <p>Processes image assets using highly accurate tesseract binarization with custom multi-chunk voting algorithms.</p>
        </div>
      </div>
      <div class="info-card">
        <div class="card-icon">🖋️</div>
        <div class="card-content">
          <h5>Signature Extraction</h5>
          <p>Automatically isolates, thresholds, and crops the signature contour from the back side of any card as a clean PNG image asset.</p>
        </div>
      </div>
      <div class="info-card">
        <div class="card-icon">⚡</div>
        <div class="card-content">
          <h5>Instantly Prefill Forms</h5>
          <p>Converts scanned data into standard student database parameters, bypassing manual typist errors completely.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nid-scanner-view-page {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;

  .page-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #767d87;
    margin-bottom: 1rem;

    .crumb-separator {
      color: #363c46;
    }

    .crumb-current {
      color: #6366f1;
      font-weight: 500;
    }
  }

  .page-header-row {
    margin-bottom: 2rem;

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #e8eaed;
      margin-bottom: 0.5rem;
    }

    .page-subtitle {
      font-size: 0.95rem;
      color: #aeb4bd;
    }
  }

  .autofill-success-banner {
    background: rgba(34, 197, 94, 0.16);
    border: 1px solid #22c55e;
    color: #e8eaed;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 500;
    animation: fadeIn 0.3s ease;

    .banner-icon {
      font-size: 1.25rem;
    }
  }

  // Styles for action button in slot
  .autofill-btn {
    background: #6366f1;
    color: #e8eaed;
    border: none;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.15s ease, transform 0.15s ease;

    &:hover:not(:disabled) {
      background: #7679f6;
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // Info Cards Section
  .nid-info-cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-top: 2rem;

    @media (min-width: 640px) {
      grid-template-columns: repeat(3, 1fr);
    }

    .info-card {
      background: #15181e;
      border: 1px solid #262b33;
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;

      .card-icon {
        font-size: 1.5rem;
        background: rgba(99, 102, 241, 0.1);
        padding: 0.5rem;
        border-radius: 6px;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .card-content {
        h5 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #e8eaed;
          margin-bottom: 0.35rem;
        }

        p {
          font-size: 0.8rem;
          color: #aeb4bd;
          line-height: 1.4;
        }
      }
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
