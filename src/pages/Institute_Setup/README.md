# Institute Setup — Module Guide & Directory Concept Map

> **Purpose:** This document is the living reference and overview for the **Institute Setup** module.
> It describes what each subcategory *means* (abstraction), the fields on each form, and most
> importantly — **how everything is organized**: the structured folder hierarchy, page views, form
> modals, composables, JSON option lists, backend controllers, and DB tables.
>
> Target institutes: **School, Alim/Madrasah, Vocational (SSC/HSC), College, School & College**
> (i.e. any institute type under Bangladesh's General / Madrasah / BTEB / University boards).

---

## 📂 1. Directory Structure: Modular Sub-Directories

To scale the project cleanly, the Institute Setup module has been restructured from a flat register of files into **11 independent sub-directories**. Each subdirectory encapsulates a single page concept, housing its main Page View, Form Modal, read-only Preview Modal, and any localized asset files:

```
src/pages/Institute_Setup/
├── Index.vue                   # Dashboard checklist landing page
├── Profile/                    # Step 2: Institute Profile Form, Preview, and Tools
│   ├── ProfileView.vue
│   ├── ProfilePreviewModal.vue
│   └── facilityMeta.ts
├── Branches/                   # Step 3: Branch/Campus dashboard & form modals
│   ├── BranchesView.vue
│   ├── BranchFormModal.vue
│   └── BranchPreviewModal.vue
├── AcademicYears/              # Step 4: Year timeline planner & form modals
│   ├── AcademicYearsView.vue
│   ├── AcademicYearFormModal.vue
│   └── AcademicYearPreviewModal.vue
├── Classes/                    # Step 5: Classes, Sections, Shifts, and Groups
│   ├── ClassesView.vue
│   └── ClassFormModal.vue
├── Holidays/                   # Step 6: Weekly workdays & Holiday planner
│   ├── HolidaysView.vue
│   └── HolidayFormModal.vue
├── Grading/                    # Step 7: Grading schemes and repeatable GPA rows
│   ├── GradingView.vue
│   └── GradingFormModal.vue
├── Boards/                     # Step 8: Board & Regulatory settings panel
│   ├── BoardsView.vue
│   └── BoardFormModal.vue
├── Subjects/                   # Step 9: Subject catalog and class weights allocation
│   ├── SubjectsView.vue
│   └── SubjectFormModal.vue
├── ExamTerms/                  # Step 10: Exam calendar scheduling
│   ├── ExamTermsView.vue
│   └── ExamTermFormModal.vue
├── Rooms/                      # Step 11: Buildings & Classrooms layout
│   ├── RoomsView.vue
│   └── RoomFormModal.vue
└── AcademicSessions/           # Step 12: Term sessions splits (Term 1/2/3)
    ├── AcademicSessionsView.vue
    └── AcademicSessionFormModal.vue
```

---

## 📐 2. Building Blocks & Design Conventions

Every folder under `src/pages/Institute_Setup/` follows the exact same proven design pattern. When writing a new page or extending an existing one, replicate this layout:

| Piece | File Location | Responsibility |
|---|---|---|
| **Page View** | `src/pages/Institute_Setup/<Name>/<Name>View.vue` | Houses the top banner, primary Action buttons (Add, Export, Import), and the main `DataTable`. |
| **Form Modal** | `src/pages/Institute_Setup/<Name>/<Name>FormModal.vue` | Encapsulates the reactive editing form, using `BaseModal` and local validation rules. |
| **Preview Modal** | `src/pages/Institute_Setup/<Name>/<Name>PreviewModal.vue` | Optional read-only mockup view representing the certification layout. |
| **API Composable** | `src/composables/Institute_Setup/use<Name>.ts` | Client API hooks (fetch, save, delete, bulk import) linked to the Python server. |
| **Excel Helper** | `src/composables/Institute_Setup/use<Name>Excel.ts` | Coordinates XLSX parsing, downloading, mapping, and array serialization. |

### Styling Rule: No Inline Styles! 🚫
To keep Vue files lightweight and maintain a clean **SASS 7-1 Architecture**, all custom styles must live in the global `src/styles/` directory:
*   Global design variables and tokens live inside `src/styles/abstracts/_variables.scss`.
*   Module-level SASS stylesheets are housed under `src/styles/pages/Institute_Setup/` (such as `_institute-profile.scss` and `_institute-setup.scss`).
*   Any styling heights, paddings, or media overrides must be defined there and compiled cleanly.

---

## 🗃️ 3. Core Database & Model Mappings

All 11 sub-directories are fully integrated into the backend SQL database (`school.db`). On server boot, `backend/core/db.py` automatically initializes, runs idempotent schema migrations, and seeds standard default registers.

| Sub-Module Directory | Database Table | JSON Columns | Primary / Foreign Keys |
|---|---|---|---|
| **Profile** | `institute_profiles` | `classifications` | `id` PRIMARY KEY |
| **Branches** | `branches` | — | `id` PRIMARY KEY |
| **AcademicYears** | `academic_years` | — | `id` PRIMARY KEY |
| **Classes** | `classes`, `sections`, `groups`, `shifts` | `groups.class_ids` | `classes.id`, `sections.class_id` |
| **Holidays** | `working_days`, `holidays` | — | `holidays.id` |
| **Grading** | `grading_schemes` | `grades` | `id` PRIMARY KEY |
| **Boards** | `boards` | `institute_type_ids`, `regulatory` | `id` PRIMARY KEY |
| **Subjects** | `subjects` | `marks_distribution` | `id` PRIMARY KEY |
| **ExamTerms** | `exam_terms` | `class_ids` | `id` PRIMARY KEY |
| **Rooms** | `buildings`, `rooms` | `rooms.facilities` | `rooms.id`, `rooms.building_id` |
| **AcademicSessions** | `academic_sessions` | — | `id` PRIMARY KEY |

---

## 🗺️ 4. Router Mapping Table

All sub-directories are mounted as lazy-loaded routes under the central `/institute-setup` parent path. Routing paths are mapped inside `src/router/routes.ts`:

| # | Folder Name | Path | Route name | Active Page View |
|---|---|---|---|---|
| 1 | `(setup-root)` | `/institute-setup` | `institute-setup` | `Index.vue` |
| 2 | `Profile` | `/institute-setup/profile` | `institute-profile` | `Profile/ProfileView.vue` |
| 3 | `Branches` | `/institute-setup/branches` | `institute-setup-branches` | `Branches/BranchesView.vue` |
| 4 | `AcademicYears` | `/institute-setup/academic-year` | `institute-setup-academic-year` | `AcademicYears/AcademicYearsView.vue` |
| 5 | `Classes` | `/institute-setup/classes` | `institute-setup-classes` | `Classes/ClassesView.vue` |
| 6 | `Holidays` | `/institute-setup/holidays` | `institute-setup-holidays` | `Holidays/HolidaysView.vue` |
| 7 | `Grading` | `/institute-setup/grading` | `institute-setup-grading` | `Grading/GradingView.vue` |
| 8 | `Boards` | `/institute-setup/boards` | `institute-setup-boards` | `Boards/BoardsView.vue` |
| 9 | `Subjects` | `/institute-setup/subjects` | `institute-setup-subjects` | `Subjects/SubjectsView.vue` |
| 10 | `ExamTerms` | `/institute-setup/exam-terms` | `institute-setup-exam-terms` | `ExamTerms/ExamTermsView.vue` |
| 11 | `Rooms` | `/institute-setup/rooms` | `institute-setup-rooms` | `Rooms/RoomsView.vue` |
| 12 | `AcademicSessions` | `/institute-setup/sessions` | `institute-setup-sessions` | `AcademicSessions/AcademicSessionsView.vue` |

---

## ⚡ 5. Data Flow & Bootstrap Integrity

1.  **State Synchronization:** When any View page mounts, it fires `fetch<Name>()` to query the database. It falls back to empty defaults if the Python backend is offline (e.g. static Vercel deployments), keeping the UI robust and crash-free.
2.  **Strict SQLite Foreign Keys:** SQLite now enforces strict `FOREIGN KEY` constraints.
3.  **Bootstrapping Integrity:** Because `academic_years` starts empty, a new database seeds a default year (`2026`) immediately on bootstrap so that dependent tables referencing `academic_year_id` do not fail their integrity checks on initial startup.
