// Excel export/import for Students.
// Sheet "Students": one row per student record.

import * as XLSX from 'xlsx'
import { emptyStudent, type Student } from '@/composables/Students/useStudents'

const normText = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const parseBool = (v: unknown) => ['yes', 'true', 'y', '1', 'হ্যাঁ', 'হ'].includes(String(v ?? '').trim().toLowerCase())
const boolText = (v: unknown) => (v ? 'Yes' : 'No')
const numOrNull = (v: unknown) => {
  const n = Number(v)
  return Number.isNaN(n) || String(v ?? '').trim() === '' ? null : n
}

function toIsoDate(v: unknown): string {
  if (v == null || v === '') return ''
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`
  }
  const s = String(v).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  return ''
}

interface ColDef {
  header: string
  key: string
  fmt?: (v: unknown) => string | number
  parse?: (v: unknown) => unknown
}

const COLS: ColDef[] = [
  { header: 'Student ID', key: 'student_id', parse: normText },
  { header: 'Candidate Name', key: 'candidate_name', parse: normText },
  { header: 'Candidate Name (Bangla)', key: 'candidate_name_bn', parse: normText },
  { header: 'Guardian Name', key: 'guardian_name', parse: normText },
  { header: 'Contact Phone', key: 'phone', parse: normText },
  { header: 'Email Address', key: 'email', parse: normText },
  { header: 'Academic Year ID', key: 'academic_year_id', parse: numOrNull },
  { header: 'Class Name', key: 'class_name', parse: normText },
  { header: 'Section Name', key: 'section_name', parse: normText },
  { header: 'Roll No', key: 'roll_no', parse: numOrNull },
  { header: 'Gender', key: 'gender', parse: normText },
  { header: 'Date of Birth', key: 'date_of_birth', fmt: toIsoDate, parse: toIsoDate },
  { header: 'Blood Group', key: 'blood_group', parse: normText },
  { header: 'Religion', key: 'religion', parse: normText },
  { header: 'Stipend Eligible (Yes/No)', key: 'stipend_eligible', fmt: boolText, parse: parseBool },
  { header: 'Stipend MFS Provider', key: 'stipend_mfs_provider', parse: normText },
  { header: 'Stipend MFS Number', key: 'stipend_mfs_number', parse: normText },
  { header: 'Government UID', key: 'government_uid', parse: normText },
  { header: 'Behavior Points', key: 'behavior_points', parse: numOrNull },
  { header: 'Is Active (Yes/No)', key: 'is_active', fmt: boolText, parse: parseBool },
]

export function exportStudentsToExcel(students: Student[]): void {
  const rows: (string | number)[][] = [COLS.map((c) => c.header)]
  for (const s of students) {
    rows.push(
      COLS.map((c) => {
        const raw = (s as unknown as Record<string, unknown>)[c.key]
        const v = raw == null ? '' : raw
        return c.fmt ? c.fmt(v) : (v as string | number)
      }),
    )
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = COLS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, ws, 'Students')
  XLSX.writeFile(book, 'StudentsRegister.xlsx')
}

export async function importStudentsFromExcel(file: File): Promise<{ students: Student[]; skipped: string[] }> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { cellDates: true })
  const sheet = book.Sheets['Students'] ?? book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in the Excel file')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const students: Student[] = []
  const skipped: string[] = []
  const empty: Student = emptyStudent()

  for (const row of rows) {
    const name = String(row['Candidate Name'] ?? '').trim()
    const studentId = String(row['Student ID'] ?? '').trim()
    if (!name || !studentId) continue
    const s: Student = { ...empty }
    for (const col of COLS) {
      const raw = row[col.header]
      if (raw == null || raw === '') continue
      const parsed = col.parse ? col.parse(raw) : raw
      ;(s as unknown as Record<string, unknown>)[col.key] = parsed
    }
    s.candidate_name = name
    s.student_id = studentId
    students.push(s)
  }
  return { students, skipped }
}
