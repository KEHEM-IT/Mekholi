# Students Module — Guide & Directory Concept Map

> **Purpose:** This document is the living reference, overview, and architectural concept map for the **Students** module.
> It details sessional student rosters, bulk imports, inter-campus transfer certificate clearances, mobile financial services stipend mappings, CRVS government UID synchronizations, character testimonials generator, and point-based behavioral registries.
>
> All subcategories are fully implemented and organized under structured directories for premium SaaS scalability.

---

## 📂 1. Directory Structure: Modular Sub-Directories

The Students module has been fully structured into **9 independent sub-directories**. Each folder encapsulates a single stage in your student registry workflow, housing its Page View, Form Modal, and any localized helper assets:

```
src/pages/Students/
├── README.md                   # This overview guide
├── Dashboard/                  # Step 1: Central Enrollment & Gender KPI dashboard
│   └── DashboardView.vue
├── StudentList/                # Step 2: Main Student Register & Profiles
│   ├── StudentListView.vue
│   └── StudentProfileFormModal.vue
├── BulkImport/                 # Step 3: Excel Drag-and-Drop student bulk uploader
│   └── BulkImportView.vue
├── Stipends/                   # Step 4: PESP/SEIP Stipend & parent bKash/Nagad MFS registers
│   ├── StipendsView.vue
│   └── StipendSetupModal.vue
├── PromoteTransfer/            # Step 5: Sessional promote & inter-branch transfer manager
│   └── PromoteTransferView.vue
├── UniqueIdSync/               # Step 6: 17-digit CRVS government UID mapper
│   └── UniqueIdSyncView.vue
├── IDCards/                    # Step 7: Bilingual ID Card templates generator & print engine
│   └── IDCardsView.vue
├── Certificates/               # Step 8: Character certificates (প্রশংসাপত্র) & TCs generator
│   └── CertificatesView.vue
└── BehaviorLogs/               # Step 9: Behavioral merits/demerits point tracker
    └── BehaviorLogsView.vue
```

---

## 📐 2. Building Blocks & Design Conventions

Every folder under `src/pages/Students/` follows the same proven design pattern. When writing a new page or extending an existing one, replicate this layout:

| Piece | File Location | Responsibility |
|---|---|---|
| **Page View** | `src/pages/Students/<Name>/<Name>View.vue` | Houses the top banner, primary Action buttons (Add, Export, Import), and the main `DataTable`. |
| **Form Modal** | `src/pages/Students/<Name>/<Name>FormModal.vue` | Encapsulates the reactive editing form, using `BaseModal` and local validation rules. |
| **API Composable** | `src/composables/Students/useStudents.ts` | Client API hooks (fetch, save, delete, bulk import) linked to the Python server. |
| **Excel Helper** | `src/composables/Students/useStudentsExcel.ts` | Coordinates XLSX parsing, downloading, mapping, and array serialization. |

### Styling Rule: No Inline Styles! 🚫
To maintain your strict **SASS 7-1 Architecture**, all custom styles must live in the global `src/styles/` directory:
*   Global design variables and tokens live inside `src/styles/abstracts/_variables.scss`.
*   Module-level SASS stylesheets are housed under `src/styles/pages/Students/` (`_students.scss`).
*   Modal dimensions and scroll boundaries are styled using classes inside `_students.scss` with the global `.modal-panel` capping rules.

---

## 🗃️ 3. Core Database & Model Mappings

All Student sub-directories are fully integrated into the backend SQL database (`school.db`). On server boot, `backend/core/db.py` automatically initializes, runs idempotent schema migrations, and seeds standard default registers.

| Sub-Module Directory | Database Table | JSON Columns | Primary / Foreign Keys |
|---|---|---|---|
| **StudentList** | `students` | — | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **Stipends** | `students` | — | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **PromoteTransfer** | `students` | — | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **UniqueIdSync** | `students` | — | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **BehaviorLogs** | `students` | — | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |

---

## 🗺️ 4. Router Mapping Table

All active sub-directories are mounted as lazy-loaded routes under the `/students` parent path. Routing paths are mapped inside `src/router/routes.ts`:

| # | Folder Name | Path | Route name | Active Page View |
|---|---|---|---|---|
| 1 | `Dashboard` | `/students` | `students-dashboard` | `Dashboard/DashboardView.vue` |
| 2 | `StudentList` | `/students/student-list` | `student-list` | `StudentList/StudentListView.vue` |
| 3 | `BulkImport` | `/students/add-import` | `student-bulk-import` | `BulkImport/BulkImportView.vue` |
| 4 | `Stipends` | `/students/stipend` | `student-stipend` | `Stipends/StipendsView.vue` |
| 5 | `PromoteTransfer` | `/students/promote-transfer` | `student-promote-transfer` | `PromoteTransfer/PromoteTransferView.vue` |
| 6 | `UniqueIdSync` | `/students/uid-sync` | `student-unique-id-sync` | `UniqueIdSync/UniqueIdSyncView.vue` |
| 7 | `IDCards` | `/students/id-cards` | `student-id-cards` | `IDCards/IDCardsView.vue` |
| 8 | `Certificates` | `/students/certificates` | `student-certificates` | `Certificates/CertificatesView.vue` |
| 9 | `BehaviorLogs` | `/students/behavior-logs` | `student-behavior-logs` | `BehaviorLogs/BehaviorLogsView.vue` |
