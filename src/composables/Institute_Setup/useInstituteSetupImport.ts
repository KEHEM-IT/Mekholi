import { ref } from 'vue'
import * as xlsxModule from 'xlsx'

// Institute Setup > Command Center > "Import from Excel". Parses an
// uploaded .xlsx/.xls workbook entirely client-side (SheetJS/xlsx, already
// a project dependency) into plain JSON, then hands that JSON to the
// dev-only Vite middleware (see vite.config.ts) which writes it as a file
// under src/assets/school/. There is no real backend in this app - that
// middleware is the only thing with actual filesystem access, and only
// exists while `pnpm dev` is running (see instituteSetupImportApi).

export interface ParsedSheet {
  name: string
  /** Row objects keyed by the sheet's header row (first non-empty row). */
  rows: Record<string, unknown>[]
}

export interface ParsedWorkbook {
  sourceFileName: string
  importedAt: string
  sheets: ParsedSheet[]
}

export interface RecentImport {
  name: string
  savedAt: string
  size: number
}

const IMPORT_ENDPOINT = '/__institute-setup/import'
const LIST_ENDPOINT = '/__institute-setup/list'

export function useInstituteSetupImport() {
  const isParsing = ref(false)
  const isSaving = ref(false)
  const error = ref('')
  const parsed = ref<ParsedWorkbook | null>(null)
  const recentImports = ref<RecentImport[]>([])

  // Header row = first row in the sheet with at least one non-empty cell;
  // BD govt-style exports often carry a title row or two above the real
  // table, so scanning for it beats assuming row 0 is always the header.
  function sheetToRows(sheet: import('xlsx').WorkSheet): Record<string, unknown>[] {
    const matrix = xlsxModule.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    const headerIndex = matrix.findIndex((row) => row.some((cell) => String(cell).trim() !== ''))
    if (headerIndex === -1) return []

    const headers = matrix[headerIndex].map((cell, i) => {
      const label = String(cell).trim()
      return label || `column_${i + 1}`
    })

    return matrix
      .slice(headerIndex + 1)
      .filter((row) => row.some((cell) => String(cell).trim() !== ''))
      .map((row) => {
        const record: Record<string, unknown> = {}
        headers.forEach((header, i) => {
          record[header] = row[i] ?? ''
        })
        return record
      })
  }

  async function parseFile(file: File) {
    error.value = ''
    parsed.value = null
    isParsing.value = true
    try {
      const buffer = await file.arrayBuffer()
      const workbook = xlsxModule.read(buffer, { type: 'array', cellDates: true })

      const sheets: ParsedSheet[] = workbook.SheetNames.map((name) => ({
        name,
        rows: sheetToRows(workbook.Sheets[name]),
      })).filter((sheet) => sheet.rows.length > 0)

      if (!sheets.length) {
        error.value = 'No readable rows found in that file.'
        return
      }

      parsed.value = {
        sourceFileName: file.name,
        importedAt: new Date().toISOString(),
        sheets,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to read the Excel file.'
    } finally {
      isParsing.value = false
    }
  }

  async function saveAsJson(fileName: string): Promise<boolean> {
    if (!parsed.value) return false
    isSaving.value = true
    error.value = ''
    try {
      const res = await fetch(IMPORT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, data: parsed.value }),
      })
      const body = (await res.json()) as { ok: boolean; message?: string }
      if (!res.ok || !body.ok) {
        error.value = body.message || 'Failed to save the JSON file.'
        return false
      }
      await loadRecentImports()
      return true
    } catch {
      // Most likely running a production build with no dev middleware -
      // fall back to a normal browser download so the feature still works.
      downloadAsJson(fileName)
      error.value =
        'Dev save endpoint unavailable (only works with `pnpm dev`) - downloaded the JSON instead.'
      return false
    } finally {
      isSaving.value = false
    }
  }

  function downloadAsJson(fileName: string) {
    if (!parsed.value) return
    const blob = new Blob([JSON.stringify(parsed.value, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName.replace(/\.json$/i, '')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function loadRecentImports() {
    try {
      const res = await fetch(LIST_ENDPOINT)
      const body = (await res.json()) as { ok: boolean; files?: RecentImport[] }
      recentImports.value = body.ok && body.files ? body.files : []
    } catch {
      recentImports.value = []
    }
  }

  function reset() {
    parsed.value = null
    error.value = ''
  }

  return {
    isParsing,
    isSaving,
    error,
    parsed,
    recentImports,
    parseFile,
    saveAsJson,
    downloadAsJson,
    loadRecentImports,
    reset,
  }
}
