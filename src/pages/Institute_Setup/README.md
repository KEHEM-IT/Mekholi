# Institute Setup — Module Abstraction & Form Field Specifications

> **Purpose:** This document is the implementation blueprint for the **Institute Setup** module.
> It describes what each subcategory *means* (abstraction), exactly which fields belong on each
> form (with keys, input types, option sources, bilingual labels), and how each entity feeds the
> rest of the ERP.
>
> Target institutes: **School, Alim/Madrasah, Vocational (SSC/HSC), College, School & College**
> (i.e. any institute type under Bangladesh's General / Madrasah / BTEB / University boards).

---

## Table of Contents

1. [Conventions & Building Blocks](#conventions--building-blocks)
2. [Data Design Principles](#data-design-principles)
3. [Subcategory Specifications](#subcategory-specifications)
   - 1. Institute Dashboard *(done)*
   - 2. Institute Profile *(done)*
   - 3. Branches / Campus
   - 4. Academic Year
   - 5. Class / Section / Group / Shift
   - 6. Holidays & Working Days
   - 7. Grading Scheme
   - 8. Board & Regulatory Setup
   - 9. Subjects & Curriculum
   - 10. Exam Terms & Types
   - 11. Classrooms / Rooms / Buildings
   - 12. Academic Sessions & Terms
4. [Suggested Implementation Order](#suggested-implementation-order)

---

## Conventions & Building Blocks

Reuse the exact patterns already established in **InstituteProfileView.vue**:

| Piece | Where | Notes |
|---|---|---|
| UI components | `src/components/ui/` | `BaseCombobox` (single + `multiple` chips), `BaseDatePicker` (ISO storage, DD/MM/YYYY display), `BaseToggle` (bulb switch), `BaseModal` |
| Bilingual labels | inline `t('EN','বাংলা')` + `isBn` | every label / placeholder / title must have both languages |
| Static option lists | `src/assets/jsons/*.json` | shape `{ Id, Name, NameInBangla, LookupText }` |
| Form pattern | `reactive({...})` + `computed` + `watch` | dirty-guard via `useFormDirtyGuard`, save via `saveProfile`/`useToast` |
| Backend pattern | `backend/api/v1/routes|controllers/` + `backend/core/db.py` | one route + one controller per resource; auto-migrations in `core/db.py` |
| Save UX | Ctrl+S + Save button; toast feedback | `0` → placeholder for numeric fields; text normalized (trim + collapse spaces) |

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

## Suggested Implementation Order

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

Each page follows the **InstituteProfileView pattern**: `src/pages/Institute_Setup/<Name>View.vue`
+ `use<Name>.ts` composable + backend `routes/` + `controllers/` + DB table + Excel export/import
(only where the entity is bulk-editable). Add the route to the router with `name: '<kebab>'` and
register the step in `Index.vue`'s `STEP_ROUTES` so the dashboard checklist lights up.
