<script setup lang="ts">
import { ref } from 'vue'
import { nidScannerService, type NIDScanResult } from './nidScannerService'

// Props & Emits
defineProps<{
  title?: string
  description?: string
  buttonText?: string
  scanButtonText?: string
}>()

const emit = defineEmits<{
  (e: 'scan-success', data: NIDScanResult): void
  (e: 'reset'): void
}>()

// State
const frontFile = ref<File | null>(null)
const backFile = ref<File | null>(null)
const frontPreview = ref<string>('')
const backPreview = ref<string>('')

const isScanning = ref(false)
const scanStep = ref(0)
const errorMessage = ref('')

const scanResult = ref<NIDScanResult | null>(null)

// Step text for cinematic transition
const steps = [
  'Decoding image formats...',
  'Running image scale & binarization...',
  'Extracting characters using Tesseract (ben+eng)...',
  'Executing multi-chunk regex field scorers...',
  'Cropping and extracting signature contours...',
  'Finalizing parsed structures...',
]

// Drag and drop states
const isDraggingFront = ref(false)
const isDraggingBack = ref(false)

// Handle file selection
const onFrontFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    setFrontFile(input.files[0])
  }
}

const onBackFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    setBackFile(input.files[0])
  }
}

const setFrontFile = (file: File) => {
  frontFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    frontPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
  errorMessage.value = ''
}

const setBackFile = (file: File) => {
  backFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    backPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
  errorMessage.value = ''
}

// Drag & drop handlers
const onDragOverFront = (e: DragEvent) => {
  e.preventDefault()
  isDraggingFront.value = true
}
const onDragLeaveFront = () => {
  isDraggingFront.value = false
}
const onDropFront = (e: DragEvent) => {
  e.preventDefault()
  isDraggingFront.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    setFrontFile(e.dataTransfer.files[0])
  }
}

const onDragOverBack = (e: DragEvent) => {
  e.preventDefault()
  isDraggingBack.value = true
}
const onDragLeaveBack = () => {
  isDraggingBack.value = false
}
const onDropBack = (e: DragEvent) => {
  e.preventDefault()
  isDraggingBack.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    setBackFile(e.dataTransfer.files[0])
  }
}

// Remove files
const removeFrontFile = () => {
  frontFile.value = null
  frontPreview.value = ''
  errorMessage.value = ''
}

const removeBackFile = () => {
  backFile.value = null
  backPreview.value = ''
  errorMessage.value = ''
}

// Trigger scan process
const startScan = async () => {
  if (!frontPreview.value) {
    errorMessage.value = 'Front NID image is mandatory'
    return
  }

  isScanning.value = true
  scanStep.value = 0
  errorMessage.value = ''
  scanResult.value = null

  // Cinematic progress stepper
  const stepInterval = setInterval(() => {
    if (scanStep.value < steps.length - 2) {
      scanStep.value++
    }
  }, 1200)

  try {
    const result = await nidScannerService.scanNID(frontPreview.value, backPreview.value || undefined)
    
    // Smooth step transition to completion
    clearInterval(stepInterval)
    scanStep.value = steps.length - 1
    
    setTimeout(() => {
      isScanning.value = false
      scanResult.value = result
      emit('scan-success', result)
    }, 600)

  } catch (err: unknown) {
    clearInterval(stepInterval)
    isScanning.value = false
    const errMsg = err instanceof Error ? err.message : String(err)
    errorMessage.value = errMsg || 'Scanning failed. Please try a clearer image.'
  }
}

// Reset the entire scanner state
const resetAll = () => {
  frontFile.value = null
  backFile.value = null
  frontPreview.value = ''
  backPreview.value = ''
  isScanning.value = false
  scanStep.value = 0
  errorMessage.value = ''
  scanResult.value = null
  emit('reset')
}

// Editable state for validation table
const updateField = (key: keyof NIDScanResult, val: string) => {
  if (scanResult.value) {
    scanResult.value[key] = val
    emit('scan-success', scanResult.value)
  }
}
</script>

<template>
  <div class="nid-scanner-plugin">
    <div class="nid-scanner-header">
      <h3 class="nid-scanner-title">{{ title || 'Smart NID OCR Scanner' }}</h3>
      <p class="nid-scanner-desc">
        {{ description || 'Upload high-resolution NID images to automatically extract English & Bangla details along with signatures. Supports single-file side-by-side or separate front and back uploads.' }}
      </p>
    </div>

    <div v-if="errorMessage" class="nid-scanner-error">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorMessage }}</span>
    </div>

    <!-- Upload Panel -->
    <div v-if="!isScanning && !scanResult" class="nid-scanner-upload-grid">
      <!-- Front Dropzone -->
      <div 
        class="nid-dropzone" 
        :class="{ 'is-dragging': isDraggingFront, 'has-file': frontPreview }"
        @dragover="onDragOverFront"
        @dragleave="onDragLeaveFront"
        @drop="onDropFront"
      >
        <template v-if="!frontPreview">
          <div class="dropzone-empty">
            <span class="dropzone-icon">🪪</span>
            <span class="dropzone-label">NID Front Side <span class="required">*</span></span>
            <p class="dropzone-tip">Drag & drop or click to browse</p>
            <p class="dropzone-subtip">(Supports double side in single image)</p>
            <input type="file" accept="image/*" class="dropzone-input" @change="onFrontFileChange" />
          </div>
        </template>
        <template v-else>
          <div class="dropzone-preview-container">
            <img :src="frontPreview" alt="NID Front Preview" class="dropzone-img" />
            <div class="preview-overlay">
              <span class="preview-filename">{{ frontFile?.name || 'Front NID Image' }}</span>
              <button class="remove-btn" @click="removeFrontFile">Remove ✕</button>
            </div>
          </div>
        </template>
      </div>

      <!-- Back Dropzone -->
      <div 
        class="nid-dropzone" 
        :class="{ 'is-dragging': isDraggingBack, 'has-file': backPreview }"
        @dragover="onDragOverBack"
        @dragleave="onDragLeaveBack"
        @drop="onDropBack"
      >
        <template v-if="!backPreview">
          <div class="dropzone-empty">
            <span class="dropzone-icon">🔄</span>
            <span class="dropzone-label">NID Back Side <span class="optional">(Optional)</span></span>
            <p class="dropzone-tip">Drag & drop or click to browse</p>
            <p class="dropzone-subtip">(Upload for Address, Blood Group & Signature)</p>
            <input type="file" accept="image/*" class="dropzone-input" @change="onBackFileChange" />
          </div>
        </template>
        <template v-else>
          <div class="dropzone-preview-container">
            <img :src="backPreview" alt="NID Back Preview" class="dropzone-img" />
            <div class="preview-overlay">
              <span class="preview-filename">{{ backFile?.name || 'Back NID Image' }}</span>
              <button class="remove-btn" @click="removeBackFile">Remove ✕</button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Action Bar for Upload -->
    <div v-if="!isScanning && !scanResult" class="nid-scanner-actions">
      <button 
        class="scan-btn" 
        :disabled="!frontPreview"
        @click="startScan"
      >
        <span class="btn-icon">⚡</span>
        {{ scanButtonText || 'Process & Extract NID' }}
      </button>
    </div>

    <!-- Cinematic Processing State -->
    <div v-if="isScanning" class="nid-scanner-loading">
      <div class="loading-spinner-container">
        <div class="loading-spinner"></div>
        <div class="loading-scanner-beam"></div>
      </div>
      <div class="loading-step-title">AI OCR Scanning in progress...</div>
      <div class="loading-progress-bar">
        <div class="loading-progress-fill" :style="{ width: ((scanStep + 1) / steps.length) * 100 + '%' }"></div>
      </div>
      <div class="loading-step-text">{{ steps[scanStep] }}</div>
    </div>

    <!-- Scanning Results View -->
    <div v-if="scanResult" class="nid-scanner-results-container animate-fade-in">
      <div class="results-layout-grid">
        <!-- Visual Mockup Column -->
        <div class="visual-mockup-column">
          <h4 class="section-sub-title">Card Visual Mockup</h4>
          
          <div class="nid-mockup-card">
            <!-- Front Mockup -->
            <div class="nid-card-side card-front">
              <div class="card-glow-overlay"></div>
              <div class="card-inner-border">
                <div class="mockup-header">
                  <div class="bd-logo-circle">🇧🇩</div>
                  <div class="header-text-container">
                    <div class="title-bn">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
                    <div class="title-en">Government of the People's Republic of Bangladesh</div>
                    <div class="subtitle-card">National ID Card / জাতীয় পরিচয় পত্র</div>
                  </div>
                </div>
                
                <div class="mockup-body">
                  <div class="holder-photo-container">
                    <div class="holder-photo-placeholder">
                      <span class="photo-icon">👤</span>
                      <span class="photo-label">PHOTO</span>
                    </div>
                  </div>
                  
                  <div class="holder-details">
                    <div class="details-row">
                      <span class="detail-lbl">নাম:</span>
                      <span class="detail-val font-bangla">{{ scanResult.name_bn || 'নাম' }}</span>
                    </div>
                    <div class="details-row">
                      <span class="detail-lbl">Name:</span>
                      <span class="detail-val font-uppercase">{{ scanResult.name_en || 'NAME' }}</span>
                    </div>
                    <div class="details-row">
                      <span class="detail-lbl">পিতা:</span>
                      <span class="detail-val font-bangla">{{ scanResult.father_name || 'পিতার নাম' }}</span>
                    </div>
                    <div class="details-row">
                      <span class="detail-lbl">মাতা:</span>
                      <span class="detail-val font-bangla">{{ scanResult.mother_name || 'মাতার নাম' }}</span>
                    </div>
                    <div class="details-row">
                      <span class="detail-lbl text-red">Date of Birth:</span>
                      <span class="detail-val font-red">{{ scanResult.dob || 'DOB' }}</span>
                    </div>
                    <div class="details-row">
                      <span class="detail-lbl text-red">ID NO:</span>
                      <span class="detail-val font-red-bold">{{ scanResult.nid_no || 'ID NUMBER' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Back Mockup -->
            <div class="nid-card-side card-back">
              <div class="card-inner-border">
                <div class="back-notice">
                  এই কার্ডটি গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের সম্পত্তি। কার্ডটি ব্যবহারকারী ব্যতীত অন্য কোথাও পাওয়া গেলে নিকটস্থ পোস্ট অফিসে জমা দেবার জন্য অনুরোধ করা হলো।
                </div>
                <div class="back-address-block">
                  <span class="lbl">ঠিকানা: </span>
                  <span class="val font-bangla">{{ scanResult.address || 'ঠিকানা সংক্রান্ত তথ্য পাওয়া যায়নি' }}</span>
                </div>
                <div class="back-meta-grid">
                  <div class="meta-item">
                    <span class="lbl">রক্তের গ্রুপ / Blood Group:</span>
                    <span class="val text-danger">{{ scanResult.blood_group || '-' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="lbl">জন্মস্থান:</span>
                    <span class="val font-bangla">{{ scanResult.birth_place || '-' }}</span>
                  </div>
                </div>
                
                <div class="back-signature-block">
                  <div class="signature-display">
                    <img v-if="scanResult.signature" :src="scanResult.signature" alt="Scanned NID Signature" class="cropped-signature" />
                    <div v-else class="sig-placeholder">No Signature Scanned</div>
                  </div>
                  <div class="signature-line">
                    <span class="lbl">প্রদানকারী কর্তৃপক্ষের স্বাক্ষর</span>
                    <span class="val">প্রদানের তারিখ: {{ scanResult.issue_date || '২৮/১১/২০২০' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Editable Form Data Column -->
        <div class="editable-form-column">
          <h4 class="section-sub-title">Verify & Edit Extracted Fields</h4>
          <div class="verification-form">
            <div class="form-group-half">
              <div class="form-control-item">
                <label>Name (Bangla) / নাম</label>
                <input 
                  type="text" 
                  :value="scanResult.name_bn" 
                  @input="updateField('name_bn', ($event.target as HTMLInputElement).value)" 
                  class="verify-input font-bangla"
                />
              </div>
              <div class="form-control-item">
                <label>Name (English)</label>
                <input 
                  type="text" 
                  :value="scanResult.name_en" 
                  @input="updateField('name_en', ($event.target as HTMLInputElement).value)" 
                  class="verify-input font-uppercase"
                />
              </div>
            </div>

            <div class="form-group-half">
              <div class="form-control-item">
                <label>Father's Name / পিতার নাম</label>
                <input 
                  type="text" 
                  :value="scanResult.father_name" 
                  @input="updateField('father_name', ($event.target as HTMLInputElement).value)" 
                  class="verify-input font-bangla"
                />
              </div>
              <div class="form-control-item">
                <label>Mother's Name / মাতার নাম</label>
                <input 
                  type="text" 
                  :value="scanResult.mother_name" 
                  @input="updateField('mother_name', ($event.target as HTMLInputElement).value)" 
                  class="verify-input font-bangla"
                />
              </div>
            </div>

            <div class="form-group-half">
              <div class="form-control-item">
                <label>Date of Birth</label>
                <input 
                  type="text" 
                  :value="scanResult.dob" 
                  @input="updateField('dob', ($event.target as HTMLInputElement).value)" 
                  class="verify-input"
                />
              </div>
              <div class="form-control-item">
                <label>National ID No</label>
                <input 
                  type="text" 
                  :value="scanResult.nid_no" 
                  @input="updateField('nid_no', ($event.target as HTMLInputElement).value)" 
                  class="verify-input"
                />
              </div>
            </div>

            <div class="form-control-item">
              <label>Address / ঠিকানা (Back Side)</label>
              <textarea 
                :value="scanResult.address" 
                @input="updateField('address', ($event.target as HTMLInputElement).value)" 
                class="verify-textarea font-bangla"
                rows="2"
              ></textarea>
            </div>

            <div class="form-group-three">
              <div class="form-control-item">
                <label>Blood Group</label>
                <input 
                  type="text" 
                  :value="scanResult.blood_group" 
                  @input="updateField('blood_group', ($event.target as HTMLInputElement).value)" 
                  class="verify-input"
                  placeholder="e.g. A+"
                />
              </div>
              <div class="form-control-item">
                <label>Place of Birth / জন্মস্থান</label>
                <input 
                  type="text" 
                  :value="scanResult.birth_place" 
                  @input="updateField('birth_place', ($event.target as HTMLInputElement).value)" 
                  class="verify-input font-bangla"
                />
              </div>
              <div class="form-control-item">
                <label>Issue Date / প্রদানের তারিখ</label>
                <input 
                  type="text" 
                  :value="scanResult.issue_date" 
                  @input="updateField('issue_date', ($event.target as HTMLInputElement).value)" 
                  class="verify-input"
                />
              </div>
            </div>
          </div>

          <div class="results-action-bar">
            <button class="reset-btn" @click="resetAll">
              ✕ Reset & Scan New
            </button>
            <slot name="actions" :data="scanResult"></slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
