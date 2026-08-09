# Admission Module — Guide & Directory Concept Map

> **Purpose:** This document is the living reference, overview, and architectural concept map for the **Admission** module.
> It details the student intake pipeline, custom form generation, applicant evaluations, exam parameters, randomized digital lotteries, merit calculations, document audits, and seat planning.
>
> All subcategories are fully implemented and organized under structured page directories for premium SaaS scalability.

---

## 📂 1. Directory Structure: Modular Sub-Directories

The Admission module has been fully refactored from a flat layout into **9 independent sub-directories**. Each subdirectory encapsulates a single page concept, housing its Page View, Form Modal, and any localized helper assets:

```
src/pages/Admission/
├── README.md                   # This overview guide
├── Enquiries/                  # Step 1: Lead Capture, Front-desk CRM
│   ├── EnquiriesView.vue
│   └── EnquiryFormModal.vue
├── FormBuilder/                # Step 2: Public Registration Form customization
│   └── FormBuilderView.vue
├── Applications/               # Step 3: Applicant Profiles review, Audits, Grading
│   ├── ApplicationsView.vue
│   └── ApplicationFormModal.vue
├── Tests/                      # Step 4: Exam Scheduling & Venue Allocations
│   ├── TestsView.vue
│   └── TestFormModal.vue
├── DigitalLottery/             # Step 5: Randomized selection & quota draws
│   ├── DigitalLotteryView.vue
│   └── LotteryDrawModal.vue
├── MeritList/                  # Step 6: Real-time GPA/CGPA scores ranking & publication
│   ├── MeritListView.vue
│   └── PublishMeritListModal.vue
├── WaitingList/                # Step 7: Queue movements & automated promotions
│   └── WaitingListView.vue
├── DocumentVerification/       # Step 8: Document audits & verification sign-offs
│   ├── DocumentVerificationView.vue
│   └── VerificationModal.vue
├── SeatQuota/                  # Step 9: Intake capacity & quota mapping
│   ├── SeatQuotaView.vue
│   └── SeatQuotaFormModal.vue
└── Settings/                   # Step 10: Global intake calendar & payment credentials
    └── AdmissionSettingsView.vue
```

---

## 📐 2. Building Blocks & Design Conventions

Every folder under `src/pages/Admission/` follows the same proven design pattern. When writing a new page or extending an existing one, replicate this layout:

| Piece | File Location | Responsibility |
|---|---|---|
| **Page View** | `src/pages/Admission/<Name>/<Name>View.vue` | Houses the top banner, primary Action buttons (Add, Export, Import), and the main `DataTable`. |
| **Form Modal** | `src/pages/Admission/<Name>/<Name>FormModal.vue` | Encapsulates the reactive editing form, using `BaseModal` and local validation rules. |
| **API Composable** | `src/composables/Admission/useAdmission<Name>.ts` | Client API hooks (fetch, save, delete, bulk import) linked to the Python server. |
| **Excel Helper** | `src/composables/Admission/useAdmission<Name>Excel.ts` | Coordinates XLSX parsing, downloading, mapping, and array serialization. |

### Styling Rule: No Inline Styles! 🚫
To maintain your strict **SASS 7-1 Architecture**, all custom styles must live in the global `src/styles/` directory:
*   Global design variables and tokens live inside `src/styles/abstracts/_variables.scss`.
*   Module-level SASS stylesheets are housed under `src/styles/pages/Admission/` (such as `_form-builder.scss`, `_enquiries.scss`, `_tests.scss`, `_lottery.scss`, `_merit.scss`, `_waiting.scss`, `_verification.scss`, `_seat.scss`, and `_settings.scss`).
*   Modal dimensions and scroll boundaries are styled using classes inside `src/styles/pages/Admission/` with the global `.modal-panel` capping rules.

---

## 🗃️ 3. Core Database & Model Mappings

All Admission sub-directories are fully integrated into the backend SQL database (`school.db`). On server boot, `backend/core/db.py` automatically initializes, runs idempotent schema migrations, and seeds standard default registers.

| Sub-Module Directory | Database Table | JSON Columns | Primary / Foreign Keys |
|---|---|---|---|
| **Enquiries** | `admission_enquiries` | — | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **FormBuilder** | `admission_forms` | `fields_config`, `custom_fields` | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **Applications** | `admission_applications` | — | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **Tests** | `admission_tests` | — | `id` PRIMARY KEY, `academic_year_id`, `room_id` FOREIGN KEYS |
| **DigitalLottery** | `admission_lotteries` | `quota_config`, `selected_applicant_ids`, `waiting_applicant_ids` | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **MeritList** | `admission_applications` *(dynamic)* | — | Derived on-the-fly via written and viva scores |
| **WaitingList** | `admission_applications` *(dynamic)* | — | Derived on-the-fly via waitlist ranks |
| **DocumentVerification** | `admission_applications` *(dynamic)* | `verification_checklist` | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |
| **SeatQuota** | `classes` *(dynamic)* | — | Integrates capacity parameters inside core classes |
| **Settings** | `admission_settings` | `age_limits`, `payment_credentials` | `id` PRIMARY KEY, `academic_year_id` FOREIGN KEY |

---

## 🗺️ 4. Router Mapping Table

All active sub-directories are mounted as lazy-loaded routes under the `/admission` parent path. Routing paths are mapped inside `src/router/routes.ts`:

| # | Folder Name | Path | Route name | Active Page View |
|---|---|---|---|---|
| 1 | `Enquiries` | `/admission/enquiries` | `admission-enquiries` | `Enquiries/EnquiriesView.vue` |
| 2 | `FormBuilder` | `/admission/form-builder` | `admission-form-builder` | `FormBuilder/FormBuilderView.vue` |
| 3 | `Applications` | `/admission/applications` | `admission-applications` | `Applications/ApplicationsView.vue` |
| 4 | `Tests` | `/admission/tests` | `admission-tests` | `Tests/TestsView.vue` |
| 5 | `DigitalLottery` | `/admission/digital-lottery` | `admission-digital-lottery` | `DigitalLottery/DigitalLotteryView.vue` |
| 6 | `MeritList` | `/admission/merit-list` | `admission-merit-list` | `MeritList/MeritListView.vue` |
| 7 | `WaitingList` | `/admission/waiting-list` | `admission-waiting-list` | `WaitingList/WaitingListView.vue` |
| 8 | `DocumentVerification` | `/admission/document-verification` | `admission-document-verification` | `DocumentVerification/DocumentVerificationView.vue` |
| 9 | `SeatQuota` | `/admission/seat-quota` | `admission-seat-quota` | `SeatQuota/SeatQuotaView.vue` |
| 10 | `Settings` | `/admission/settings` | `admission-settings` | `Settings/AdmissionSettingsView.vue` |

---

## ⚡ 5. Data Flow & Bootstrap Integrity

1.  **State Synchronization:** When any View page mounts, it fires `fetch<Name>()` to query the database. It falls back to empty defaults if the Python backend is offline (e.g. static Vercel deployments), keeping the UI robust and crash-free.
2.  **Strict SQLite Foreign Keys:** SQLite now enforces strict `FOREIGN KEY` constraints.
3.  **Bootstrapping Integrity:** Because `academic_years` starts empty, a new database seeds a default year (`2026`) immediately on bootstrap so that dependent tables referencing `academic_year_id` do not fail their integrity checks on initial startup.
