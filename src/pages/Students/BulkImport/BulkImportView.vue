<!-- Students > Bulk Import Page -->
<script setup lang="ts">
// Bulk Import: handles drag-and-drop Excel file uploads to parse and bulk-insert
// student profiles directly into SQLite database, reporting skipped duplicates.
import { ref } from 'vue'
import { useTranslator } from '@/Translator'
import { useToast } from '@/composables/useToast'
import { importStudentsFromExcel } from '@/composables/Students/useStudentsExcel'
import { importStudents } from '@/composables/Students/useStudents'

defineOptions({ name: 'BulkImportView' })

const { t } = useTranslator()
const toast = useToast()

const isImporting = ref(false)
const excelInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const selectedFile = ref<File | null>(null)

function triggerImport() {
  excelInput.value?.click()
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileName.value = file.name
  selectedFile.value = file
}

async function uploadFile() {
  if (!selectedFile.value) {
    toast.error(t('Please select an Excel file first.'))
    return
  }
  isImporting.value = true
  try {
    const { students: imported } = await importStudentsFromExcel(selectedFile.value)
    const result = await importStudents(imported)
    if (!result.ok) throw new Error('server')
    if (result.inserted === 0 && imported.length > 0) {
      toast.success(t('All {count} rows already existed — nothing new added', { count: imported.length }))
    } else {
      toast.success(
        t('{added} added · {skipped} already existed', {
          added: result.inserted,
          skipped: result.skipped.length,
        }),
      )
    }
    // Clear selection
    fileName.value = ''
    selectedFile.value = null
  } catch (err) {
    toast.error(t('Import failed: {error}', { error: err instanceof Error ? err.message : 'invalid file' }))
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <section class="ipf reveal-content">
    <header class="ipf-header">
      <div class="ipf-header__titles">
        <h1>{{ t('Add/Bulk Import Students') }}</h1>
        <p>{{ t('Import thousands of student profiles in seconds using our standard drag-and-drop Excel uploader.') }}</p>
      </div>
    </header>

    <!-- Drag and Drop Box -->
    <div class="ipf-section">
      <h4 class="ipf-section__title">
        <i class="fa-duotone fa-file-import" />
        {{ t('Excel Student Register Import') }}
      </h4>
      <div class="ipf-upload" style="width: 100%;">
        <div class="ipf-logo" style="width: 100%; min-height: 12rem;" @click="triggerImport">
          <i class="fa-duotone fa-file-excel ipf-logo__icon" />
          <div class="ipf-logo__text">
            <span>{{ fileName || t('Click to select or drag and drop your Students Register Excel sheet here') }}</span>
            <small>{{ t('Supported formats: .xlsx, .xls (max 10 MB)') }}</small>
          </div>
          <input ref="excelInput" type="file" accept=".xlsx,.xls" class="ipf-logo__input" @change="onFilePicked" />
        </div>
      </div>

      <div class="flex justify-end mt-4 w-full">
        <button
          type="button"
          class="btn btn--primary"
          :disabled="isImporting || !selectedFile"
          @click="uploadFile"
        >
          <i class="fa-duotone" :class="isImporting ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'" />
          {{ t('Upload & Parse Register') }}
        </button>
      </div>
    </div>
  </section>
</template>
