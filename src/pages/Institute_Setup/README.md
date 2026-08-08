# Institute Setup — Module Guide & Implementation Map

> **Purpose:** This document is the living reference for the **Institute Setup** module.
> It describes what each subcategory *means* (abstraction), the exact fields on each form,
> and — most importantly — **where everything lives**: the page views, form modals, composables,
> JSON option lists, backend controllers/routes and DB tables behind each page.
>
> Target institutes: **School, Alim/Madrasah, Vocational (SSC/HSC), College, School & College**
> (i.e. any institute type under Bangladesh's General / Madrasah / BTEB / University boards).

---

## Table of Contents

1. [Conventions & Building Blocks](#conventions--building-blocks)
2. [Data Design Principles](#data-design-principles)
3. [Subcategory Specifications](#subcategory-specifications)
   - 1. Institute Dashboard *(implemented)*
   - 2. Institute Profile *(implemented)*
   - 3. Branches / Campus *(implemented)*
   - 4. Academic Year *(implemented)*
   - 5. Class / Section / Group / Shift *(implemented)*
   - 6. Holidays & Working Days *(implemented)*
   - 7. Grading Scheme *(implemented)*
   - 8. Board & Regulatory Setup *(implemented)*
   - 9. Subjects & Curriculum *(implemented)*
   - 10. Exam Terms & Types *(implemented)*
   - 11. Classrooms / Rooms / Buildings *(implemented)*
   - 12. Academic Sessions & Terms *(implemented)*
4. [Implementation Map — Pages & Files](#implementation-map--pages--files)
5. [Route Table](#route-table)
6. [Shared UI Components](#shared-ui-components)
7. [Backend & Database](#backend--database)
8. [Suggested Implementation Order](#suggested-implementation-order)

---

## Conventions & Building Blocks

Every page follows the same proven pattern (start from any existing view to copy it):

| Piece | Where | Notes |
|---|---|---|
| Page views | `src/pages/Institute_Setup/<Name>View.vue` | skeleton (2s min) → header (title/subtitle + Add/Export/Import buttons) → DataTable |
| Form modals | `src/pages/Institute_Setup/<Name>FormModal.vue` | `BaseModal` (wide) + `<Name>FormModal`, `panel-class` for scoped height |
| API helpers | `src/composables/Institute_Setup/use<Name>.ts` | fetch / save / delete + `import<Name>` upsert |
| Excel helpers | `src/composables/Institute_Setup/use<Name>Excel.ts` | `export<Name>ToExcel` / `import<Name>FromExcel` via `xlsx` |
| UI components | `src/components/ui/` | `BaseCombobox`, `BaseDatePicker`, `BaseTimePicker`, `BaseToggle`, `BaseModal`, `DataTable` |
| Bilingual labels | `src/Translator/` | `t('English text')` (EN-keyed dictionary, EN + BN); combobox options show **"EN - বাংলা"** via `bilingualLabel` / DisplayText |
| Static option lists | `src/assets/jsons/*.json` | shape `{ Id, Name, NameInBangla/bn, LookupText }` |
| Backend | `backend/api/v1/routes|controllers/` + `backend/core/db.py` | one route + one controller per resource; tables auto-created in `core/db.py` |
| Toast | `useToast()` | `success` / `error` / `action(message, { label: 'Undo', onClick })` (5s undoable delete) |
| Scoped modal height | `panel-class="<xx>-form-modal"` + `<style>` block in the view | **never** touch global `_modal.scss` (`.modal-panel--tall` was moved into views) |

**Field table legend**

| Column | Meaning |
|---|---|
| **Field** | English label shown to the user |
| **Key** | form/model property name (snake_case) |
| **Input** | `text` · `number` · `date` · `combobox` · `multi-combo` · `toggle` · `textarea` |
| **Options** | where the combo choices come from (JSON list or another entity) |
| **Req** | required (`✓`) / optional (`–`) |
| **Notes** | validation, relations, bilingual hint |

---

## Data Design Principles

1. **Institute-type aware.** One schema must serve School + Madrasah + Vocational + College.
   Everywhere a choice exists (board, class levels, groups, exams), carry an `institute_type`
   or `board_id` link so each type can be configured differently.
2. **Everything references the Academic Year.** Classes, fees, exams, sessions all belong to a
   year (`academic_year_id`) so "promote to next year" is a data operation, not a rewrite.
3. **JSON columns for child rows** (like `classifications` on the profile) when the child list is
   small and only edited with its parent (e.g. grade rows inside a Grading Scheme).
4. **Numeric fields store nothing when empty** (send `null`, DB default `0`, frontend shows
   placeholder) — the established staff-field rule.
5. **Every entity gets:** `id`, `created_at`, `updated_at`, `status` (active/inactive) where it
   makes sense, and a bilingual `name`/`name_bn` pair.

---

## Subcategory Specifications

### 1. Institute Dashboard *(implemented)*
Landing page of the module — progress overview + EMIS import dropzone. No form.

### 2. Institute Profile *(implemented)*
Single-instance form (EIIN `130430`). Already contains: identity, logo (ImgBB), geo cascade,
classification rows (type/groups/MPO toggle→code+date), staff v2, bank, facilities, committee.
**This page is the anchor** — Board & Regulatory Setup (8) will read `institute_type` /
`classifications` from here.

---

### 3. Branches / Campus

**Abstraction:** An institute can run multiple physical campuses (main branch + annexes), each
with its own address, head, and contact. Every downstream entity (class, student, staff,
transport route, hostel) belongs to a branch.

**Form fields**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Branch Name | `branch_name` | text | – | ✓ | also `branch_name_bn` |
| Branch Code | `branch_code` | text (digits, max 6) | – | – | unique; e.g. `01`, `02` |
| Campus Type | `campus_type` | combobox | new `jsons/campus_types.json` (Main, Annex, Sub-Campus, Temporary) | ✓ | |
| Is Main Branch | `is_main` | toggle | – | ✓ | exactly **one** main branch per institute |
| Division | `division_id` | combobox | `bdGeo` | ✓ | geo cascade (same as profile) |
| District | `district_id` | combobox | `bdGeo` | ✓ | |
| Upazila / Thana | `upazila_id` | combobox | `bdGeo` | ✓ | |
| Union | `union_id` | combobox | `bdGeo` | – | |
| Village / Road / Holding | `village_road_holding_no` | text | – | – | |
| Post Office / Post Code | `post_office` / `post_code` | text / number | – | – | |
| Phone / Email | `phone` / `email` | text (digits) / email | – | – | |
| Head / In-Charge | `head_name` | text | – | – | principal/administrator of the campus |
| Established Date | `established_date` | date | – | – | |
| Status | `status` | toggle (Active) | – | ✓ | inactive branches hidden from cascades |

**Relations:** `students.branch_id`, `classes.branch_id`, `staff.branch_id`, `transport_routes.branch_id`.

---

### 4. Academic Year

**Abstraction:** The school calendar spine. One record per year; exactly one `is_current` year
drives all "current year" queries (enrolment, fees, exams).

**Form fields**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Year Name | `year_name` | text | – | ✓ | e.g. `2026`; also `year_name_bn` (`শিক্ষাবর্ষ ২০২৬`) |
| Start Date | `start_date` | date | – | ✓ | e.g. 01-01-2026 |
| End Date | `end_date` | date | – | ✓ | validation: end > start |
| Is Current | `is_current` | toggle | – | ✓ | setting one current clears the others (server rule) |
| Registration Period (from/to) | `reg_from` / `reg_to` | date | – | – | admission window |
| Status | `status` | toggle (Active) | – | ✓ | closed years are read-only |

**Relations:** referenced by classes, sessions (12), fees, exams (10).

---

### 5. Class / Section / Group / Shift

**Abstraction:** Four small entities that together define "where a student sits". For a
multi-type institute the **class level** must align with the institute's phase, e.g.:
`Primary → Secondary → Higher Secondary` (School & College) · `Ibtedayee → Dakhil → Alim`
(Madrasah) · `SSC(Voc) → HSC(Voc)` (BTEB) · `Degree → Honours` (College).

**Form A — Class Level**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Class Name | `class_name` | text | – | ✓ | also `class_name_bn` (`ষষ্ঠ`, `নবম`) |
| Phase / Level | `phase` | combobox | `jsons/class_levels.json` (Primary, Secondary, Higher Secondary, Dakhil, Alim, Fazil, Kamil, Vocational, Degree, Honours) | ✓ | drives grouping + board link |
| Sort Order | `sort_order` | number | – | ✓ | 1..12 ordering |
| Academic Year | `academic_year_id` | combobox | Academic Year entity | ✓ | |
| Branch | `branch_id` | combobox | Branches entity | ✓ | (or institute-wide) |

**Form B — Section**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Section Name | `section_name` | text | – | ✓ | `A`, `B`, `Ka`… also `section_name_bn` |
| Class | `class_id` | combobox | Class Level entity | ✓ | |
| Shift | `shift_id` | combobox | Shift entity | ✓ | |
| Capacity | `capacity` | number | – | – | max students |
| Home Room | `room_id` | combobox | Rooms entity (11) | – | optional |

**Form C — Group**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Group Name | `group_name` | text | – | ✓ | also `group_name_bn`; reuse `groups.json` values as seed |
| Applicable Classes | `class_ids` | multi-combo | Class Level entity | ✓ | one group can serve several classes |
| Version | `version` | combobox | `jsons/versions.json` (Bangla, English) | – | English-version sections |
| Type | `group_type` | combobox | `jsons/group_types.json` (Academic, Vocational Trade, Madrasah) | – | |

**Form D — Shift**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Shift Name | `shift_name` | text | – | ✓ | also `shift_name_bn`; seed = `shift_counts.json` |
| Start Time | `start_time` | time | – | – | `08:00 AM` |
| End Time | `end_time` | time | – | – | validation: end > start |

**Data model:** `classes`, `sections`, `groups`, `shifts` — each with `academic_year_id`.

---

### 6. Holidays & Working Days

**Abstraction:** Two things: (a) the weekly working calendar (which days are school days), and
(b) one-off / recurring closed days. Attendance, timetables, and fee due-dates all consult this.

**Form A — Weekly Working Days**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Day of Week | `day_of_week` | combobox | Sun..Sat | ✓ | |
| Is Working | `is_working` | toggle | – | ✓ | default: Sun–Thu working, Fri–Sat off |
| Start / End Time | `open_time` / `close_time` | time | – | – | optional per-day hours |

**Form B — Holiday**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Holiday Name | `holiday_name` | text | – | ✓ | also `holiday_name_bn` (`ঈদুল ফিতর`) |
| Date From | `date_from` | date | – | ✓ | |
| Date To | `date_to` | date | – | – | default = from |
| Type | `holiday_type` | combobox | `jsons/holiday_types.json` (Govt., Religious, Institute, Sports, Exam) | ✓ | |
| Repeats Every Year | `is_recurring` | toggle | – | – | e.g. 21 Feb, 16 Dec, Eid (lunar — manual yearly update) |
| Applicable Branch | `branch_id` | combobox | Branches entity | – | empty = all |
| Remarks | `remarks` | textarea | – | – | |

**Special working day** (e.g. Friday class) = same Holiday form with `is_working_override` toggle.

---

### 7. Grading Scheme

**Abstraction:** A named set of grade rows + a scale, assigned to class levels. Different
boards use different conventions — General Board (A+…F with GPA 5), Madrasah (with 8+
subjects and marks-based grades), Vocational (pass/fail per trade), College (letter + CGPA).

**Form fields**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Scheme Name | `scheme_name` | text | – | ✓ | also `scheme_name_bn`; e.g. `SSC Grade`, `Dakhil Grade`, `College CGPA` |
| Grading Type | `grading_type` | combobox | `jsons/grading_types.json` (GPA 5.00, Percentage, Pass/Fail, CGPA 4.00) | ✓ | |
| Applicable Levels | `class_level_ids` | multi-combo | Class Level entity | ✓ | |
| Applicable Board | `board_id` | combobox | Board entity (8) | ✓ | |
| Pass Marks | `pass_marks` | number | – | ✓ | |
| Is Default | `is_default` | toggle | – | – | one default scheme |

**Grade rows (repeatable, like committee members — Add button)**

| Field | Key | Input | Req | Notes |
|---|---|---|---|---|
| Grade | `grade_name` | text | ✓ | `A+`, `A`, `A-`… also `grade_name_bn` |
| Point | `grade_point` | number (2dp) | ✓ | 5.00, 4.00… |
| Min % | `min_percent` | number | ✓ | |
| Max % | `max_percent` | number | ✓ | |
| Remarks | `remarks` | text | – | `Excellent`, `Very Good`… also BN |

**Data model:** `grading_schemes` + child rows as JSON column (pattern: `classifications`).

---

### 8. Board & Regulatory Setup *(critical — the multi-type foundation)*

**Abstraction:** The registry of external boards/authorities the institute reports to, and the
mapping of **institute type → board**. This is what makes one ERP serve General, Madrasah,
BTEB and University institutes: class levels, subjects, exam terms and result formats all
filter by board.

**Form fields**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Board Name | `board_name` | text | – | ✓ | e.g. `Sylhet Board`; also `board_name_bn` |
| Board Code | `board_code` | text (digits) | – | ✓ | unique; used in marksheets |
| Board Type | `board_type` | combobox | `jsons/board_types.json` (General Education, Madrasah Education, Technical BTEB, National University, University, Other) | ✓ | |
| Institute Types | `institute_type_ids` | multi-combo | `institute_types.json` | ✓ | which institute types run under this board |
| Website | `website` | text | – | – | |
| Contact / Address | `contact`, `address` | text / textarea | – | – | |
| Remarks | `remarks` | textarea | – | – | |

**Regulatory block (per board, collapsed panel)**

| Field | Key | Input | Req | Notes |
|---|---|---|---|---|
| Recognition No (মঞ্জুরিপত্র) | `recognition_no` | text | – | |
| Recognition Date | `recognition_date` | date | – | |
| Registration No (নিবন্ধন) | `registration_no` | text | – | |
| MPO Link | `mpo_no` | text | – | | 
| Attachment | `document` | file (PDF) | – | local upload or URL |

**Relation:** `class_levels.phase` + `subjects.board_id` + `exam_terms.board_id` all reference this.

---

### 9. Subjects & Curriculum

**Abstraction:** The subject catalogue per **board × class level × group × version**, with marks
distribution. Academic module (routines, syllabus tracking, homework) consumes these.

**Form A — Subject Definition**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Subject Name | `subject_name` | text | – | ✓ | also `subject_name_bn` (`গণিত`, `আরবি`) |
| Subject Code | `subject_code` | text (digits) | – | ✓ | board code, e.g. `107` |
| Subject Type | `subject_type` | combobox | `jsons/subject_types.json` (Compulsory, Optional, Elective, Vocational Trade, Madrasah Subject, Language) | ✓ | |
| Board | `board_id` | combobox | Board entity (8) | ✓ | |
| Group | `group_id` | combobox | Group entity (5) | – | empty = all groups |
| Version | `version` | combobox | versions | – | |

**Form B — Marks Distribution (per class level)**

| Field | Key | Input | Req | Notes |
|---|---|---|---|---|
| Class Level | `class_id` | combobox | Class entity | ✓ | repeatable rows |
| Full Marks (Theory) | `full_marks_theory` | number | ✓ | e.g. 100 / 70 / 90 (madrasah 100) |
| Full Marks (Practical) | `full_marks_practical` | number | – | |
| Continuous Assessment | `full_marks_ca` | number | – | |
| Pass Marks | `pass_marks` | number | ✓ | |
| Periods / Week | `periods_week` | number | – | for timetable |
| Textbooks | `book_names` | text | – | comma list or child rows |

**Data model:** `subjects` + `class_subject` join (class_id, subject_id, group_id, marks…).

---

### 10. Exam Terms & Types

**Abstraction:** The exam calendar configuration — which exams happen when, for which classes,
under which board's rules, with which marks distribution and grading scheme. The Exam & Result
module (schedule, mark entry, tabulation, publication) is generated from here.

**Form fields**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Exam Name | `exam_name` | text | – | ✓ | seed from `exam_types.json` (`Half Yearly`, `Final`, `Model Test`, `Dakhil Examination`…) + `exam_name_bn` |
| Exam Type | `exam_type` | combobox | `jsons/exam_type_categories.json` (Academic, Board Model, Mock, Admission) | ✓ | |
| Board | `board_id` | combobox | Board entity (8) | ✓ | |
| Academic Term | `term_id` | combobox | Session/Term entity (12) | – | |
| Applicable Classes | `class_ids` | multi-combo | Class entity | ✓ | |
| Grading Scheme | `scheme_id` | combobox | Grading Scheme entity (7) | ✓ | |
| Exam Start / End | `exam_start` / `exam_end` | date | – | ✓ | |
| Marks Distribution | (per subject) | child rows | from curriculum (9) | – | override allowed |
| Publish to Parents | `publish_to_portal` | toggle | – | – | student portal access |
| Is Board Exam | `is_board_exam` | toggle | – | – | suppresses internal publish |

---

### 11. Classrooms / Rooms / Buildings

**Abstraction:** Physical infrastructure. Buildings → floors → rooms. Timetable allocates
rooms; sections may claim a home room; transport/hostel don't touch this.

**Form A — Building**

| Field | Key | Input | Req | Notes |
|---|---|---|---|---|
| Building Name | `building_name` | text | ✓ | also `building_name_bn` |
| Building Code | `building_code` | text (digits) | ✓ | unique |
| Number of Floors | `floor_count` | number | – | |

**Form B — Room**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Room No / Name | `room_no` | text | – | ✓ | also `room_no_bn` if named (e.g. `ল্যাব-১`) |
| Building | `building_id` | combobox | Building entity | ✓ | |
| Floor | `floor_no` | number | – | ✓ | 0 = ground |
| Room Type | `room_type` | combobox | `jsons/room_types.json` (Classroom, Lab, Library, Office, Staff Room, Auditorium, Store, Washroom, Others) | ✓ | |
| Capacity | `capacity` | number | – | – | students |
| Facilities | `facilities` | toggle list | reuse `facilityMeta` (projector, AC, whiteboard…) | – | child toggles |
| Status | `status` | toggle (Active / Maintenance) | – | ✓ | |

---

### 12. Academic Sessions & Terms

**Abstraction:** Splits an Academic Year (4) into named terms/sessions used by exams, fees and
promotion. e.g. School: `Term 1 / Term 2 / Term 3`; Madrasah: `First Year / Second Year` by
class; College: `Semester 1..6`.

**Form fields**

| Field | Key | Input | Options | Req | Notes |
|---|---|---|---|---|---|
| Session Name | `session_name` | text | – | ✓ | e.g. `2026 Session`; also `session_name_bn` |
| Academic Year | `academic_year_id` | combobox | Academic Year entity (4) | ✓ | |
| Term Name | `term_name` | text | – | ✓ | also `term_name_bn` (`প্রথম সাময়িক`) |
| Term Order | `term_order` | number | – | ✓ | 1, 2, 3… |
| Start Date / End Date | `term_start` / `term_end` | date | – | ✓ | must fit inside the year's range |
| Is Current | `is_current` | toggle | – | – | one current term |
| Result Type | `result_type` | combobox | `jsons/result_types.json` (Annual, Average of Terms, Cumulative) | – | how the final result is computed |

**Relation:** `exam_terms.term_id` (10); fees & instalments can be term-scoped.

---

## Implementation Map — Pages & Files

> All 12 subcategories are **fully implemented**. Below is the exact file inventory per page.
> Every page follows: `View.vue` (page) + `FormModal.vue` (add/edit) + `use<X>.ts` (API) +
> `use<X>Excel.ts` (Excel) + backend controller/routes + DB table.

### 1. Institute Dashboard — `/institute-setup`
- **View:** `src/pages/Institute_Setup/Index.vue` — progress checklist of all 12 steps (maps `STEP_ROUTES`), EMIS import dropzone
- **Backend:** uses `useInstituteProfile` / `useInstituteSetupImport`
- **JSON:** none (progress derives from the other entities' counts)

### 2. Institute Profile — `/institute-setup/profile`
- **View:** `InstituteProfileView.vue` (big form: identity, contact, head, staff, committee members, classifications, facilities, branding w/ logo upload)
- **Modals:** `InstituteProfilePreviewModal.vue`
- **Composables:** `useInstituteProfile.ts`, `useInstituteProfileExcel.ts` (Excel export/import with `EN - BN` values)
- **Backend:** `profile_controller.py` / `profile_routes.py` — tables `institute_profiles`, `committee_members`, `facilities`
- **JSON:** `committee_positions.json`, `institute_types.json`, `genders.json`, `banks.json`, `account_types.json`, `account_purposes.json`, `geographical_location.json`, `location_type.json`, `management_type.json`, `parliamentary_seat.json`, `school_expenses.json`, `student_types.json`, `classes.json`

### 3. Branches / Campus — `/institute-setup/branches`
- **Views:** `BranchesView.vue` (card grid) · **Modals:** `BranchFormModal.vue`, `BranchPreviewModal.vue`
- **Composables:** `useBranches.ts`, `useBranchesExcel.ts` (4-sheet workbook)
- **Backend:** `branch_controller.py` / `branch_routes.py` — table `branches` (multi-campus, `is_main` demotes others)
- **Sample:** `branch_import_sample.xlsx`

### 4. Academic Year — `/institute-setup/academic-year`
- **Views:** `AcademicYearsView.vue` (card grid) · **Modals:** `AcademicYearFormModal.vue`, `AcademicYearPreviewModal.vue`
- **Composables:** `useAcademicYears.ts`, `useAcademicYearsExcel.ts`
- **Backend:** `academic_year_controller.py` / `academic_year_routes.py` — table `academic_years` (`is_current` demotes others)
- **Sample:** `academic_year_import_sample.xlsx`

### 5. Class / Section / Group / Shift — `/institute-setup/classes`
- **Views:** `ClassesView.vue` (4 tabs) · **Modal:** `ClassSetupFormModal.vue` (generic per-entity form, class-name preset combobox from `class_names.json`, phase auto-fill + red-border rule)
- **Composables:** `useClassesSetup.ts` (CRUD + `importClassSetupAll`), `useClassesSetupExcel.ts` (4 sheets, one-click import)
- **Backend:** `class_setup_controller.py` / `class_setup_routes.py` — tables `classes`, `sections`, `groups`, `shifts`; import match keys: classes = name+year+branch, sections = name+class+shift, groups = name, shifts = name
- **JSON:** `class_names.json`, `groups.json`, `shift_counts.json`
- **Samples:** `class_import_sample.xlsx`, `class_setup_max_sample.xlsx`

### 6. Holidays & Working Days — `/institute-setup/holidays`
- **Views:** `HolidaysWorkingDaysView.vue` (2 tabs) · **Modal:** `HolidayWorkingDayFormModal.vue` (Date To auto-follows From)
- **Composables:** `useHolidaysWorkingDays.ts` (+ `importHolidaysAll`), `useHolidaysWorkingDaysExcel.ts` (2 sheets)
- **Backend:** `holiday_controller.py` / `holiday_routes.py` — tables `working_days`, `holidays`; import match: day_of_week / holiday name+date_from
- **JSON:** `holiday_types.json` (Govt./Religious/Institute/Sports/Exam/Other)
- **Sample:** `holidays_working_days_import_sample.xlsx`

### 7. Grading Scheme — `/institute-setup/grading`
- **Views:** `GradingSchemesView.vue` · **Modal:** `GradingSchemeFormModal.vue` (scheme-name combobox → auto-fills grading type/board/pass marks/grade rows; repeatable grade rows with type presets)
- **Composables:** `useGradingSchemes.ts` (+ `importSchemes`), `useGradingSchemesExcel.ts` (grades serialized `Name|BN|Point|Min|Max|Remarks ; …`)
- **Backend:** `grading_scheme_controller.py` / `grading_scheme_routes.py` — table `grading_schemes` (grades + class_level_ids as JSON columns, `is_default` demotes)
- **JSON:** `grading_types.json` (GPA 5.00 / CGPA 4.00 / Percentage / Pass-Fail), `scheme_names.json` (14 BD scheme presets)
- **Sample:** `grading_scheme_import_sample.xlsx`

### 8. Board & Regulatory Setup — `/institute-setup/boards`
- **Views:** `BoardsView.vue` · **Modal:** `BoardSetupFormModal.vue` (collapsed regulatory block: recognition/registration/MPO/attachment)
- **Composables:** `useBoards.ts` (+ `importBoards`), `useBoardsExcel.ts` (15 cols incl. flattened regulatory)
- **Backend:** `board_controller.py` / `board_routes.py` — table `boards` (regulatory + institute_type_ids JSON)
- **Seed:** `_seed_boards` → **13 official BD boards** (9 regional BISE + Madrasah + BTEB + NU + IAU) with official codes DHA/RAJ/COM/CHI/BAR/JES/SYL/DIN/MYM/MAD/TEC/NU/IAU — `is_builtin` protects from deletion
- **JSON:** `board_types.json`, `institute_types.json`

### 9. Subjects & Curriculum — `/institute-setup/subjects`
- **Views:** `SubjectsView.vue` · **Modal:** `SubjectFormModal.vue` (comboboxes everywhere: name → auto-fills code+type+board; code; type; board; group; version; classes multi)
- **Composables:** `useSubjects.ts` (+ `importSubjects`), `useSubjectsExcel.ts` (marks rows `ClassId|Theory|Practical|CA|Pass|Periods|Books ; …`)
- **Backend:** `subject_controller.py` / `subject_routes.py` — table `subjects` (marks_distribution + class_level_ids JSON); import match: name+board
- **Seed:** `_seed_subjects` → **52 default BD subjects** (33 NCTB general, 5 BMEB madrasah, 14 BTEB vocational) with real codes 101–194 — deleted rows never resurrect (seed on empty table only)
- **JSON:** `subject_types.json`, `subjects.json` (52 presets with `bn` names for "EN - বাংলা" options)

### 10. Exam Terms & Types — `/institute-setup/exam-terms`
- **Views:** `ExamTermsView.vue` · **Modal:** `ExamTermFormModal.vue` (exam-name combobox → auto-fills type; board/term/scheme combos, classes multi, dates, publish/board-exam toggles)
- **Composables:** `useExamTerms.ts` (+ `importExamTerms`), `useExamTermsExcel.ts`
- **Backend:** `exam_term_controller.py` / `exam_term_routes.py` — table `exam_terms` (class_ids JSON); import match: exam name
- **Seed:** `_seed_exam_terms` → **12 default BD exam terms** (Half Yearly, Annual, Pre-Test, Test, Model Test, Board Final SSC/HSC, Dakhil, Alim, SSC/HSC Vocational, Admission) — deleted terms stay deleted
- **JSON:** `exam_names.json` (15 presets w/ bn), `exam_type_categories.json` (Academic/Board Model/Mock/Admission), `exam_types.json` (legacy)

### 11. Classrooms / Rooms / Buildings — `/institute-setup/rooms`
- **Views:** `RoomsBuildingsView.vue` (2 tabs: Buildings + Rooms) · **Modal:** `RoomBuildingFormModal.vue` (building combo, floor, room-type combo, capacity, **facilities toggle list**, Active/Maintenance status)
- **Composables:** `useRoomsBuildings.ts` (+ `importRoomsAll`), `useRoomsBuildingsExcel.ts` (2 sheets, one-click import)
- **Backend:** `room_controller.py` / `room_routes.py` — tables `buildings`, `rooms` (facilities JSON); import match: building code / room no+building
- **Seed:** `_seed_buildings_rooms` → **3 default buildings** (Main/Science/Admin, BLK-01..03) + **13 default rooms** (classrooms, labs, library, office, auditorium, store) with facilities & status — deleted stay deleted
- **JSON:** `room_types.json` (9 types EN-BN)
- **Sample:** `rooms_buildings_import_sample.xlsx`

### 12. Academic Sessions & Terms — `/institute-setup/sessions`
- **Views:** `AcademicSessionsView.vue` (Current-term chip 🟢) · **Modal:** `AcademicSessionFormModal.vue` (session-name combo → auto-fills year; term combo → auto-fills order; Academic Year defaults to **current year**; no Bangla text inputs — comboboxes show "EN - বাংলা")
- **Composables:** `useAcademicSessions.ts` (+ `importSessions`), `useAcademicSessionsExcel.ts`
- **Backend:** `academic_session_controller.py` / `academic_session_routes.py` — table `academic_sessions` (`is_current` single-term demote); import match: session+term
- **Seed:** `_seed_academic_sessions` → **2026 Session × Term 1/2/3** (Term 2 current) — deleted stay deleted
- **JSON:** `result_types.json` (Annual / Average of Terms / Cumulative)

---

## Route Table

All sub-menus are routed under the `/institute-setup` parent (inside the `DefaultLayout`
children in `src/router/routes.ts`). Every route is wired to a real page and registered in
`Index.vue`'s `STEP_ROUTES` so the dashboard checklist lights up.

| # | Subcategory (nav name) | Route path | Route name | Status |
|---|---|---|---|---|
| 1 | Institute Dashboard | `/institute-setup` | `institute-setup` | ✅ implemented |
| 2 | Institute Profile | `/institute-setup/profile` | `institute-profile` | ✅ implemented |
| 3 | Branches/Campus | `/institute-setup/branches` | `institute-setup-branches` | ✅ implemented |
| 4 | Academic Year | `/institute-setup/academic-year` | `institute-setup-academic-year` | ✅ implemented |
| 5 | Class/Section/Group/Shift | `/institute-setup/classes` | `institute-setup-classes` | ✅ implemented |
| 6 | Holidays & Working Days | `/institute-setup/holidays` | `institute-setup-holidays` | ✅ implemented |
| 7 | Grading Scheme | `/institute-setup/grading` | `institute-setup-grading` | ✅ implemented |
| 8 | Board & Regulatory Setup | `/institute-setup/boards` | `institute-setup-boards` | ✅ implemented |
| 9 | Subjects & Curriculum | `/institute-setup/subjects` | `institute-setup-subjects` | ✅ implemented |
| 10 | Exam Terms & Types | `/institute-setup/exam-terms` | `institute-setup-exam-terms` | ✅ implemented |
| 11 | Classrooms / Rooms / Buildings | `/institute-setup/rooms` | `institute-setup-rooms` | ✅ implemented |
| 12 | Academic Sessions & Terms | `/institute-setup/sessions` | `institute-setup-sessions` | ✅ implemented |

**When adding a future page:**
1. Create `<Name>View.vue` in `src/pages/Institute_Setup/`
2. Add the route in `src/router/routes.ts` (`name: '<kebab>'`, auth guard)
3. Register the step in `Index.vue`'s `STEP_ROUTES` — the dashboard checklist lights up automatically

---

## Shared UI Components

| Component | File | Notes |
|---|---|---|
| `BaseCombobox` | `src/components/ui/BaseCombobox.vue` | single + `multiple` chips, search, `clearable`, `invalid`; **strict `===` matching** on `optionValue` — pass matching value types (String vs Number) |
| `BaseDatePicker` | `src/components/ui/BaseDatePicker.vue` | stores ISO `YYYY-MM-DD`, displays `DD/MM/YYYY`, editable masked input, Today/Clear |
| `BaseTimePicker` | `src/components/ui/BaseTimePicker.vue` | editable `HH:MM AM/PM` (24h also accepted), stores 24h `HH:MM`, AM/PM hour+minute grid, Now/Clear; panel flips right-aligned near screen edge |
| `BaseToggle` | `src/components/ui/BaseToggle.vue` | bulb switch, `yes-label`/`no-label` |
| `BaseModal` | `src/components/ui/BaseModal.vue` | teleports to `<body>`; props `wide`, `closeOnOverlay` (false for forms), `panelClass` (scoped sizing). Panel height rules live in **each view's own `<style>` block**, never global `_modal.scss` |
| `DataTable` | `src/components/ui/DataTable.vue` | sticky header, scrollable body (capped `min(60vh, 32rem)`), **sortable headers** (`sortable`, `sortValue` for resolved names), cell slots keyed by column key (`#is_active`), actions slot; emits `sort-change` |

---

## Backend & Database

**Server:** `backend/server.py` (Python 3, stdlib `http.server` + `ThreadingMixIn` from `socketserver`),
CORS with `DELETE`. Run: `python3 backend/server.py` (port 5000 default).

**Layer split:** `backend/api/v1/controllers/` (business logic) · `backend/api/v1/routes/`
(URL dispatch) · `backend/core/db.py` (schema + idempotent migrations + seeders) ·
`backend/utils/response.py` (JSON + CORS).

**Tables (auto-created in `core/db.py`):**

| Table | Purpose | JSON columns |
|---|---|---|
| `institute_profiles` / `committee_members` / `facilities` | profile + child rows | classifications |
| `branches` | multi-campus | — |
| `academic_years` | year registry (`is_current`) | — |
| `classes` / `sections` / `groups` / `shifts` | academic structure | groups.class_ids |
| `working_days` / `holidays` | calendar | — |
| `grading_schemes` | grade sets | grades, class_level_ids |
| `boards` | BD board registry | institute_type_ids, regulatory |
| `subjects` | BD curriculum | marks_distribution, class_level_ids |
| `exam_terms` | exam calendar | class_ids |
| `buildings` / `rooms` | infrastructure | rooms.facilities |
| `academic_sessions` | terms of a year | — |

**Import = cross-check upsert.** Every import endpoint (`POST /api/<entity>/import`) matches
rows by a natural key (e.g. branch name, subject name+board, room no+building) — existing rows
are skipped and counted, only new rows are stored. Toasts report `X added · Y already existed`.

**Default seed data** (seeded only on **empty** tables so user deletions stick — no
resurrection on restart): 13 BD boards, 52 subjects, 12 exam terms, 3 buildings + 13 rooms,
2026 session × 3 terms.

---

## Suggested Implementation Order

> ✅ **All steps are complete** — this was the build order used, in case the module is ever
> rebuilt from scratch or extended.

```
1. Board & Regulatory Setup   → everything else filters by board
2. Academic Year              → classes/exams/sessions need a year
3. Branches / Campus          → classes & students belong to a branch
4. Class / Section / Group / Shift
5. Academic Sessions & Terms
6. Subjects & Curriculum
7. Grading Scheme
8. Exam Terms & Types
9. Classrooms / Rooms / Buildings
10. Holidays & Working Days   (independent — can be built anytime)
```

Each page follows the same pattern: `src/pages/Institute_Setup/<Name>View.vue` (skeleton →
header → DataTable) + `<Name>FormModal.vue` + `use<Name>.ts` composable + `use<Name>Excel.ts`
+ backend `routes/` + `controllers/` + DB table + optional seed data + JSON option lists.
Add the route to `src/router/routes.ts` and register the step in `Index.vue`'s `STEP_ROUTES`.
