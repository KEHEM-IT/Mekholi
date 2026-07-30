export interface SchoolAddress {
  village_road_holding_no: string | null;
  union: string | null;
  mouza_name: string | null;
  plot_dag_number: number | null;
  post_office: string | null;
  post_code: number | null;
  upazila_thana: string | null;
  district: string | null;
  division_region: string | null;
}

export interface SchoolContact {
  institute_phone: number | null;
  head_of_institute_mobile: number | null;
  fax: string | null;
  institute_email: string | null;
  website: string | null;
}

export interface SchoolClassification {
  institute_type: string | null;
  attached_technical_branch_type: string | null;
  group: string | null;
  student_type: string | null;
  shift_count: string | null;
  has_english_version: string | null;
  management: string | null;
  recognition_status: string | null;
  recognized_level: string | null;
}

export interface RecognitionHistory {
  level: string | null;
  first_recognition_date: string | null;
  latest_recognition_expiry_date: string | null;
}

export interface MpoInfo {
  level: string | null;
  mpo_date: string | null;
  mpo_code: number | null;
}

export interface BankAccount {
  serial_no: number | null;
  bank_name: string | null;
  branch: string | null;
  account_type: string | null;
  account_holder_name: string | null;
  account_number: number | null;
  account_purpose: string | null;
}

export interface CommitteeMember {
  serial_no: number | null;
  member_name: string | null;
  joining_date: string | null;
  leaving_date: string | null;
  phone: number | null;
  trainings_received_count: number | null;
  gender: string | null;
  committee_position: string | null;
  education_qualification: string | null;
  occupation: string | null;
  left_committee: string | null;
  reason_for_leaving: string | null;
}

export interface StaffPosition {
  serial_no: number | null;
  designation: string | null;
  currently_working_total: number | null;
  currently_working_male: number | null;
  currently_working_female: number | null;
  mpo_total: number | null;
  mpo_male: number | null;
  mpo_female: number | null;
  vacant_post: number | null;
  branch_post: number | null;
}

export interface FormerCommitteeMember {
  serial_no: number | null;
  member_name: string | null;
  gender: string | null;
  phone: number | null;
  reason_for_leaving: string | null;
}

export interface DevelopmentProject {
  serial_no: number | null;
  work_type: string | null;
  description: string | null;
  progress: string | null;
  start_date: string | null;
  duration_months: number | null;
  end_date: string | null;
  total_allocated_cost_taka: number | null;
  funding_source: string | null;
  project_name: string | null;
}

/** Structured general information grouping every root-level scalar and
 *  nested object (address, contact, classification, etc.) into a single
 *  typed record the General Info tab can render with section-grouped rows. */
export interface GeneralInfo {
  institute_name_bn: string | null;
  institute_name_en: string | null;
  founder_name: string | null;
  head_of_institute_name: string | null;
  parliamentary_constituency: string | null;
  establishment_date: string | null;
  income_total: number | null;
  expense_total: number | null;
  student_fee_amount: number | null;
  address: SchoolAddress;
  contact: SchoolContact;
  classification: SchoolClassification;
  identifiers: SchoolIdentifiers;
  mpo_status: MpoStatus;
  location_details: LocationDetails;
}

export interface SchoolDetails {
  general_info: GeneralInfo;
  recognition_history: RecognitionHistory[];
  mpo_info: MpoInfo[];
  bank_accounts: BankAccount[];
  committee_members: CommitteeMember[];
  staff_positions: StaffPosition[];
  former_committee_members: FormerCommitteeMember[];
  development_projects: DevelopmentProject[];
  committee_formation_history: CommitteeFormationRecord[];
  committee_meetings: CommitteeMeeting[];
  facilities: Facility[];
  disasters: DisasterRecord[];
  trainings: TrainingRecord[];
  academic_result_tables: AcademicResultTable[];
  other_tables: RawDataTable[];
}

// --- Newly captured sections (previously silently dropped) ------------------

export interface SchoolIdentifiers {
  geo_code: string | null;
  board_institute_code: string | null;
  technical_board_code: string | null;
  eiin: string | null;
  mpo_code: string | null;
  technical_branch_mpo_code: string | null;
  stipend_code: string | null;
}

export interface MpoStatus {
  is_mpo_enrolled: string | null;
  technical_branch_mpo_status: string | null;
}

export interface LocationDetails {
  nationalization_date: string | null;
  nearest_admin_unit: string | null;
  nearest_admin_unit_distance_km: number | null;
  area_type: string | null;
  geographic_location: string | null;
  is_enclave: string | null;
}

export interface CommitteeFormationRecord {
  serial_no: number | null;
  has_committee: string | null;
  committee_type: string | null;
  approval_date: string | null;
  expiry_date: string | null;
  election_date: string | null;
  remarks: string | null;
}

export interface CommitteeMeeting {
  serial_no: number | null;
  meeting_date: string | null;
  attendees_count: number | null;
  agenda: string | null;
  decision: string | null;
}

export interface Facility {
  serial_no: number | null;
  name: string | null;
  status: string | null;
}

export interface DisasterRecord {
  serial_no: number | null;
  disaster_name: string | null;
  start_date: string | null;
  end_date: string | null;
  closed_days: number | null;
  damage_details: string | null;
  cause: string | null;
  remarks: string | null;
}

// Note: the source header only labels 6 columns here (serial, subject, then
// 4 role columns) while a populated row would carry a trained/untrained
// split per role — i.e. the header itself is a collapsed multi-row header,
// same as the academic tables above. Rather than guess which of the 4
// labeled slots pairs with which count, the remaining columns are kept
// under their own header text in `values`.
export interface TrainingRecord {
  serial_no: number | null;
  training_subject: string | null;
  values: Record<string, string | number | null>;
}

// The BANBEIS enrollment / exam-result tables (student counts by year+branch,
// pass results, subject-wise results, GPA-grade breakdowns). Their column
// COUNT and labels genuinely differ between institute levels (e.g. 8 cols in
// one export, 17 in another), and when a section has no real data yet, the
// export repeats header-like text as a fake "data" row instead of leaving it
// blank. So rather than hardcoding fixed field names (which would be wrong
// for some files) we key `values` by each table's own header text — every
// column is still captured, under its real label, however many there are.
// Placeholder/echo rows (no parseable year or subject code) are filtered out.
export interface AcademicResultRow {
  year: number | null; // set for every table except the subject-wise one
  subject_code: number | null; // set only for the subject-wise results table
  branch: string | null;
  values: Record<string, string | number | null>;
}

export interface AcademicResultTable {
  table_type:
    | "enrollment_summary"
    | "exam_pass_summary"
    | "subject_wise_pass_results"
    | "grade_distribution_ssc_level"
    | "grade_distribution_hsc_level"
    | "other";
  headers: string[];
  rows: AcademicResultRow[];
}

// Final safety net: any table this converter doesn't otherwise recognize
// (a genuinely new section in a future export) lands here instead of being
// silently dropped.
export interface RawDataTable {
  headers: string[];
  rows: string[][];
}

export interface SchoolDataWrapper {
  school_data: SchoolDetails[];
}

// Helper to parse strings, returning null if empty
function parseString(val: string | undefined | null): string | null {
  if (val === undefined || val === null) return null;
  const s = val.trim();
  return s === '' ? null : s;
}

// Helper to parse integers, returning null if empty or NaN
function parseIntVal(val: string | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const s = val.trim();
  if (s === '') return null;
  const parsed = parseInt(s.replace(/,/g, ''), 10);
  return isNaN(parsed) ? null : parsed;
}

// Robust date formatting matching historical behavior
export function formatTemplateDate(dateStr: string | undefined | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  dateStr = dateStr.trim();
  if (dateStr === '') return null;

  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If it matches DD/MM/YYYY or D/M/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const p1 = parseInt(parts[0] ?? '', 10);
    const p2 = parseInt(parts[1] ?? '', 10);
    const p3 = parseInt(parts[2] ?? '', 10);

    // Check if it's YYYY/MM/DD (e.g. 2019/01/11)
    if (p1 > 1000) {
      const y = p1;
      const m = String(p2).padStart(2, '0');
      const d = String(p3).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Check if p1 (month candidate) is <= 12
    if (p1 >= 1 && p1 <= 12) {
      const y = p3;
      const m = String(p1).padStart(2, '0');
      const d = String(p2).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return dateStr;
}

// Figures out which of the known BANBEIS enrollment/exam-result table shapes
// a given header belongs to, purely from the header text + column count
// (the same signal a human would use to tell them apart at a glance).
function classifyAcademicTable(header: string[]): AcademicResultTable['table_type'] {
  const h = header.join(' ').normalize('NFC');
  if (header[0] === 'Subject Code') return 'subject_wise_pass_results';
  if (h.includes('শ্রেণি') && h.includes('শাখা কি অনুমোদিত')) return 'enrollment_summary';
  if (h.includes('রেজিস্ট্রেশন ছাত্র-ছাত্রী')) {
    return header.length > 14 ? 'grade_distribution_hsc_level' : 'grade_distribution_ssc_level';
  }
  if (h.includes('বহিস্কৃত পরীক্ষাথীর সংখ্যা')) return 'exam_pass_summary';
  if (h.includes('রেজিঃ শিক্ষার্থী সংখ্যা')) return 'enrollment_summary';
  return 'other';
}

// Zips a table's own header row onto a data row so every column keeps its
// real label, deduplicating repeated headers (e.g. two columns both named
// "মোট") instead of the second silently overwriting the first.
function buildAcademicRowValues(
  headers: string[],
  row: string[],
  startAt: number,
): Record<string, string | number | null> {
  const values: Record<string, string | number | null> = {};
  const seen: Map<string, number> = new Map();
  for (let i = startAt; i < headers.length; i++) {
    let key = (headers[i] ?? `Column_${i + 1}`).trim() || `Column_${i + 1}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) key = `${key} (${count})`;
    const raw = row[i];
    const num = parseIntVal(raw);
    values[key] = num !== null ? num : parseString(raw);
  }
  return values;
}

interface ParsedTable {
  header: string[];
  rows: string[][];
  hasSeparator: boolean;
}

export function convertMarkdownToSchoolJson(mdContent: string): SchoolDataWrapper {
  // Parse all markdown tables
  const lines = mdContent.split(/\r?\n/);
  const tables: ParsedTable[] = [];
  let currentTable: ParsedTable | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim();
    if (line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();

      const isSeparator = cells.every(c => c.startsWith('-') || /^[:\-\s]+$/.test(c));

      if (isSeparator) {
        if (currentTable) {
          currentTable.hasSeparator = true;
        }
        continue;
      }

      if (!currentTable) {
        currentTable = {
          header: cells,
          rows: [],
          hasSeparator: false
        };
      } else {
        currentTable.rows.push(cells);
      }
    } else {
      if (currentTable) {
        tables.push(currentTable);
        currentTable = null;
      }
    }
  }
  if (currentTable) {
    tables.push(currentTable);
  }

  // Compile global key-value map from all Column_X style tables
  const kvMap: { [key: string]: string } = {};
  for (const table of tables) {
    if (table.header[0] && table.header[0].startsWith('Column_')) {
      for (const row of table.rows) {
        if (row.length >= 2) {
          const k1 = (row[0] ?? '').trim().normalize('NFC');
          const v1 = (row[1] ?? '').trim().normalize('NFC');
          // Some exports repeat the same Column_ label twice (e.g.
          // "কারিগরি শিক্ষা বোর্ড কর্তৃক কোড" appears twice, usually both
          // blank). Don't let a later blank duplicate erase a real value.
          if (k1 && !k1.startsWith('http') && (v1 !== '' || !(k1 in kvMap))) {
            kvMap[k1] = v1;
          }
        }
        if (row.length >= 4) {
          const k2 = (row[2] ?? '').trim().normalize('NFC');
          const v2 = (row[3] ?? '').trim().normalize('NFC');
          if (k2 && !k2.startsWith('http') && (v2 !== '' || !(k2 in kvMap))) {
            kvMap[k2] = v2;
          }
        }
      }
    }
  }

  // Extracted structures
  const recognition_history: RecognitionHistory[] = [];
  const mpo_info: MpoInfo[] = [];
  const bank_accounts: BankAccount[] = [];
  const committee_members: CommitteeMember[] = [];
  const former_committee_members: FormerCommitteeMember[] = [];
  const staff_positions: StaffPosition[] = [];
  const development_projects: DevelopmentProject[] = [];
  const committee_formation_history: CommitteeFormationRecord[] = [];
  const committee_meetings: CommitteeMeeting[] = [];
  const facilities: Facility[] = [];
  const disasters: DisasterRecord[] = [];
  const trainings: TrainingRecord[] = [];
  const academic_result_tables: AcademicResultTable[] = [];
  const other_tables: RawDataTable[] = [];
  let income_total: number | null = null;
  let expense_total: number | null = null;
  let student_fee_amount: number | null = null;

  for (const table of tables) {
    const headerStr = table.header.join(' ').normalize('NFC');

    // 1. Recognition History
    if (headerStr.includes('প্রথম স্বীকৃতির তারিখ') || headerStr.includes('স্বীকৃতিপ্রাপ্ত স্তর')) {
      if (!table.header[0]?.startsWith('Column_')) {
        for (const row of table.rows) {
          if (row.length >= 2) {
            recognition_history.push({
              level: parseString(row[0]),
              first_recognition_date: formatTemplateDate(row[1]),
              latest_recognition_expiry_date: row[2] ? formatTemplateDate(row[2]) : null
            });
          }
        }
      }
    }
    // 2. MPO Info
    else if (headerStr.includes('এমপিওভুক্তির তারিখ') || headerStr.includes('এমপিও কোড')) {
      if (!table.header[0]?.startsWith('Column_')) {
        for (const row of table.rows) {
          if (row.length >= 2) {
            mpo_info.push({
              level: parseString(row[0]),
              mpo_date: formatTemplateDate(row[1]),
              mpo_code: parseIntVal(row[2])
            });
          }
        }
      }
    }
    // 3. Bank Accounts
    else if (headerStr.includes('ব্যাংক') && headerStr.includes('হিসাব নম্বর') && headerStr.includes('হিসাবের উদ্দেশ্য')) {
      for (const row of table.rows) {
        if (row.length >= 7) {
          bank_accounts.push({
            serial_no: parseIntVal(row[0]),
            bank_name: parseString(row[1]),
            branch: parseString(row[2]),
            account_type: parseString(row[3]),
            account_holder_name: parseString(row[4]),
            account_number: parseIntVal(row[5]),
            account_purpose: parseString(row[6])
          });
        }
      }
    }
    // 4. Committee Members
    else if (headerStr.includes('সদস্যের নাম') && headerStr.includes('যোগদানের তারিখ') && headerStr.includes('কমিটিতে অবস্থান')) {
      for (const row of table.rows) {
        if (row.length >= 12) {
          committee_members.push({
            serial_no: parseIntVal(row[0]),
            member_name: parseString(row[1]),
            joining_date: row[2] ? formatTemplateDate(row[2]) : null,
            leaving_date: row[3] ? formatTemplateDate(row[3]) : null,
            phone: parseIntVal(row[4]),
            trainings_received_count: parseIntVal(row[5]),
            gender: parseString(row[6]),
            committee_position: parseString(row[7]),
            education_qualification: parseString(row[8]),
            occupation: parseString(row[9]),
            left_committee: parseString(row[10]),
            reason_for_leaving: parseString(row[11])
          });
        }
      }
    }
    // 5. Former Committee Members
    else if (headerStr.includes('সদস্যের নাম') && headerStr.includes('ত্যাগের কারণ') && table.header.length <= 6) {
      for (const row of table.rows) {
        if (row.length >= 5) {
          former_committee_members.push({
            serial_no: parseIntVal(row[0]),
            member_name: parseString(row[1]),
            gender: parseString(row[2]),
            phone: parseIntVal(row[3]),
            reason_for_leaving: parseString(row[4])
          });
        }
      }
    }
    // 6. Staff Positions
    else if (headerStr.includes('পদবি') && headerStr.includes('বর্তমানে কাজ করতেছে') && headerStr.includes('শূন্যপদ')) {
      for (const row of table.rows) {
        if (row.length >= 9) {
          const isTotal = row[0]?.includes('মোট') || row[0]?.includes('Total');
          if (isTotal) continue; // total row captured in general_info via other_tables
          staff_positions.push({
            serial_no: parseIntVal(row[0]),
            designation: parseString(row[1]),
            currently_working_total: parseIntVal(row[2]),
            currently_working_male: parseIntVal(row[3]),
            currently_working_female: parseIntVal(row[4]),
            mpo_total: parseIntVal(row[5]),
            mpo_male: parseIntVal(row[6]),
            mpo_female: parseIntVal(row[7]),
            vacant_post: parseIntVal(row[8]),
            branch_post: parseIntVal(row[9])
          });
        }
      }
    }
    // 7. Development Projects
    else if (headerStr.includes('কাজের ধরন') && headerStr.includes('প্রকল্পের নাম')) {
      for (const row of table.rows) {
        if (row.length >= 10) {
          development_projects.push({
            serial_no: parseIntVal(row[0]),
            work_type: parseString(row[1]),
            description: parseString(row[2]),
            progress: parseString(row[3]),
            start_date: formatTemplateDate(row[4]),
            duration_months: parseIntVal(row[5]),
            end_date: formatTemplateDate(row[6]),
            total_allocated_cost_taka: parseIntVal(row[7]),
            funding_source: parseString(row[8]),
            project_name: parseString(row[9])
          });
        }
      }
    }
    // 8. Committee formation history (separate from the member roster)
    else if (headerStr.includes('কমিটি আছে কি না')) {
      for (const row of table.rows) {
        if (row.length >= 2) {
          committee_formation_history.push({
            serial_no: parseIntVal(row[0]),
            has_committee: parseString(row[1]),
            committee_type: parseString(row[2]),
            approval_date: formatTemplateDate(row[3]),
            expiry_date: formatTemplateDate(row[4]),
            election_date: formatTemplateDate(row[5]),
            remarks: parseString(row[6])
          });
        }
      }
    }
    // 9. Committee meeting minutes
    else if (headerStr.includes('সভার তারিখ') && headerStr.includes('আলোচ্যসূচি')) {
      for (const row of table.rows) {
        if (row.length >= 2) {
          committee_meetings.push({
            serial_no: parseIntVal(row[0]),
            meeting_date: formatTemplateDate(row[1]),
            attendees_count: parseIntVal(row[2]),
            agenda: parseString(row[3]),
            decision: parseString(row[4])
          });
        }
      }
    }
    // 10. Facilities checklist (Play Ground, Electricity, ...)
    else if (table.header.length === 3 && table.header[1] === 'নাম' && table.header[2] === 'অবস্থা') {
      for (const row of table.rows) {
        facilities.push({
          serial_no: parseIntVal(row[0]),
          name: parseString(row[1]),
          status: parseString(row[2])
        });
      }
    }
    // 11. Student fee/session charge (single value, header IS the label)
    else if (table.header[0]?.includes('বেতন ও সেশনচার্জ')) {
      if (table.rows[0]) {
        student_fee_amount = parseIntVal(table.rows[0][1] ?? table.rows[0][0]);
      }
    }
    // 12. Income sources (+ totals, detail rows fall to other_tables)
    else if (headerStr.includes('আয়ের উৎস')) {
      for (const row of table.rows) {
        if (row[0]?.includes('মোট')) income_total = parseIntVal(row[1]);
      }
    }
    // 13. Expense sources (+ totals, detail rows fall to other_tables)
    else if (headerStr.includes('ব্যয়ের উৎস')) {
      for (const row of table.rows) {
        if (row[0]?.includes('মোট')) expense_total = parseIntVal(row[1]);
      }
    }
    // 14. Disasters/calamities. When a school has none on record, the export
    // repeats its own header text as a fake row instead of leaving it blank
    // (no serial number), so we skip anything that doesn't start with one.
    else if (headerStr.includes('দুর্যোগ শুরুর তারিখ')) {
      for (const row of table.rows) {
        const serial_no = parseIntVal(row[0]);
        if (serial_no === null) continue;
        disasters.push({
          serial_no,
          disaster_name: parseString(row[1]),
          start_date: formatTemplateDate(row[2]),
          end_date: formatTemplateDate(row[3]),
          closed_days: parseIntVal(row[4]),
          damage_details: parseString(row[5]),
          cause: parseString(row[6]),
          remarks: parseString(row[7])
        });
      }
    }
    // 15. Staff trainings. Same empty-template-echo quirk as disasters above.
    // The header has only 6 visible columns (serial, subject, then 4 role
    // columns), but the real data may carry trained/untrained pairs per role.
    // Rather than hardcode column indices that may shift, we zip the remaining
    // columns into `values` keyed by their own header text.
    else if (headerStr.includes('প্রশিক্ষণের বিষয়')) {
      for (const row of table.rows) {
        const serial_no = parseIntVal(row[0]);
        if (serial_no === null) continue;
        trainings.push({
          serial_no,
          training_subject: parseString(row[1]),
          values: buildAcademicRowValues(table.header, row, 2)
        });
      }
    }
    // 16. BANBEIS enrollment / exam-result tables (see AcademicResultTable
    // comment above for why these are keyed dynamically rather than fixed).
    else if (table.header[0] === 'বছর' || table.header[0] === 'Subject Code'
             || headerStr.includes('শ্রেণি') && headerStr.includes('শাখা কি অনুমোদিত')) {
      const table_type = classifyAcademicTable(table.header);
      const isSubjectWise = table_type === 'subject_wise_pass_results';
      const rows: AcademicResultRow[] = [];
      for (const row of table.rows) {
        const lead = parseIntVal(row[0]);
        if (lead === null) continue; // placeholder/echo row, not real data
        rows.push({
          year: isSubjectWise ? null : lead,
          subject_code: isSubjectWise ? lead : null,
          branch: parseString(row[1]),
          values: buildAcademicRowValues(table.header, row, 2)
        });
      }
      if (rows.length) {
        academic_result_tables.push({ table_type, headers: table.header, rows });
      }
    }
    // 17. Safety net - capture anything else so nothing is silently dropped.
    else if (!table.header[0]?.startsWith('Column_')) {
      other_tables.push({ headers: table.header, rows: table.rows });
    }
  }

  // Build the flattened general_info record BEFORE constructing the school
  // object so we can reuse the same parsed values.
  const addressObj: SchoolAddress = {
    village_road_holding_no: parseString(kvMap['গ্রাম/হোল্ডি নম্বর/রোড']),
    union: parseString(kvMap['ইউনিয়ন']),
    mouza_name: parseString(kvMap['মূলভবনের মৌজার নাম']),
    plot_dag_number: parseIntVal(kvMap['মূল ভবনের দাগ নম্বর']),
    post_office: parseString(kvMap['ডাকঘর']),
    post_code: parseIntVal(kvMap['পোস্ট কোড']),
    upazila_thana: parseString(kvMap['উপজেলা/থানা']),
    district: parseString(kvMap['জেলা']),
    division_region: parseString(kvMap['অঞ্চল']),
  };
  const contactObj: SchoolContact = {
    institute_phone: parseIntVal(kvMap['প্রতিষ্ঠানের ফোন']),
    head_of_institute_mobile: parseIntVal(kvMap['মোবাইল (প্রতিষ্ঠান প্রধান)']),
    fax: parseString(kvMap['ফ্যাক্স']),
    institute_email: parseString(kvMap['প্রতিষ্ঠানের ই-মেইল']),
    website: parseString(kvMap['ওয়েব এড্রেস']),
  };
  const classificationObj: SchoolClassification = {
    institute_type: parseString(kvMap['প্রতিষ্ঠানের প্রকার']),
    attached_technical_branch_type: parseString(kvMap['সংযুক্ত কারিগরি শাখার ধরন']),
    group: parseString(kvMap['গ্রুপ']),
    student_type: parseString(kvMap['কাদের জন্য']),
    shift_count: parseString(kvMap['শিফট সংখ্যা']),
    has_english_version: parseString(kvMap['ইংরেজি ভার্সন আছে কিনা ?']),
    management: parseString(kvMap['ব্যবস্থাপনা']),
    recognition_status: parseString(kvMap['স্বীকৃতি/অনুমোদিত']),
    recognized_level: parseString(kvMap['স্বীকৃতিপ্রাপ্ত স্তর']),
  };
  const identifiersObj: SchoolIdentifiers = {
    geo_code: parseString(kvMap['জিইও কোড (বিবিএস)']),
    board_institute_code: parseString(kvMap['শিক্ষা বোর্ড কর্তৃক প্রতিষ্ঠানের কোড']),
    technical_board_code: parseString(kvMap['কারিগরি শিক্ষা বোর্ড কর্তৃক কোড']),
    eiin: parseString(kvMap['ইআইআইএন']),
    mpo_code: parseString(kvMap['এমপিও কোড']),
    technical_branch_mpo_code: parseString(kvMap['কারিগরি শাখার এমপিও কোড']),
    stipend_code: parseString(kvMap['উপবৃত্তি কোড']),
  };
  const mpoStatusObj: MpoStatus = {
    is_mpo_enrolled: parseString(kvMap['প্রতিষ্ঠানটি কি এমপিওভুক্ত']),
    technical_branch_mpo_status: parseString(kvMap['কারিগরি শাখা এমপিওভুক্ত?']),
  };
  const locationObj: LocationDetails = {
    nationalization_date: parseString(kvMap['প্রতিষ্ঠানটি সরকারিকরণের তারিখ (প্রযোজ্য ক্ষেত্রে)']),
    nearest_admin_unit: parseString(kvMap['নিকটবর্তী প্রশাসনিক ইউনিট']),
    nearest_admin_unit_distance_km: parseIntVal(kvMap['নিকটবর্তী প্রশাসনিক ইউনিটের দূরত্ব(কিঃমিঃ)']),
    area_type: parseString(kvMap['প্রতিষ্ঠানটি কোন এলাকায়']),
    geographic_location: parseString(kvMap['প্রতিষ্ঠানটির ভৌগোলিক অবস্থান']),
    is_enclave: parseString(kvMap['প্রতিষ্ঠান ছিটমহলের অন্তর্ভুক্ত কিনা?']),
  };

  const general_info: GeneralInfo = {
    institute_name_bn: parseString(kvMap['প্রতিষ্ঠানের নাম (বাংলায়)']),
    institute_name_en: parseString(kvMap['ইংরেজীতে নাম (ব্লক লেটার)']),
    founder_name: parseString(kvMap['প্রতিষ্ঠাতা']),
    head_of_institute_name: parseString(kvMap['প্রতিষ্ঠান প্রধানের নাম']),
    parliamentary_constituency: parseString(kvMap['সংসদীয় আসন (নির্বাচনক্ষেত্র)']),
    establishment_date: parseString(kvMap['প্রতিষ্ঠার তারিখ']),
    income_total,
    expense_total,
    student_fee_amount,
    address: addressObj,
    contact: contactObj,
    classification: classificationObj,
    identifiers: identifiersObj,
    mpo_status: mpoStatusObj,
    location_details: locationObj,
  };

  const school: SchoolDetails = {
    general_info,
    recognition_history,
    mpo_info,
    bank_accounts,
    committee_members,
    staff_positions,
    former_committee_members,
    development_projects,
    committee_formation_history,
    committee_meetings,
    facilities,
    disasters,
    trainings,
    academic_result_tables,
    other_tables,
  };

  return {
    school_data: [school]
  };
}
