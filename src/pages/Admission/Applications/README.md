# 📝 Admission Applications — Page Blueprint & Architecture

This directory contains the **Admission Applications** sub-module, which manages candidate applications inbox, fee payment audits, exam grading, and registration approvals.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`ApplicationsView.vue`)
*   **Purpose:** Central candidate applications register displaying critical candidate profiles, sessional intakes, and contact numbers. Uses color-coded status badges for **Payment Status** (Paid, Pending, Failed) and **Application Status** (Submitted, Screening, Selected, Rejected).
*   **Written & VIVA Scores:** Displays recorded test marks directly on the main register dashboard.

### B. Application Form Modal (`ApplicationFormModal.vue`)
*   **Layout:** A multi-section, highly structured form modal divided into:
    *   *Candidate Profile:* English/Bangla name, Guardian info, phone, and previous school.
    *   *Placement Preferences:* Desired class, shift, and curriculum (English, Bangla, or Cambridge).
    *   *Payment Tracking:* Set payment state, select gateway channel (bKash, Nagad, Rocket, SSLCommerz), and record the merchant Transaction ID.
    *   *Results & Review:* Log Written and VIVA voce test marks, set the review stage, and append internal committee notes.

### C. UI Elements Used
*   `BaseCombobox.vue`: Class, Shift, Version, Payment Status, Payment Method, Country of Residence (from `countries.json`), Application Status.

### D. Excel Wires (`useAdmissionApplicationsExcel.ts`)
*   **Export (`exportApplicationsToExcel`):** Downloads a formatted spreadsheet containing 20 data columns, translating payment gates and evaluation scores.
*   **Import (`importApplicationsFromExcel`):** Parses sheets, matching applicants by `application_no` to safely skip existing entries.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `admission_applications`: Stores application numbers, candidate names, contact details, payment logs, exam marks, and committee remarks.
    *   `academic_year_id` explicitly references `academic_years(id) ON DELETE SET NULL` for referential integrity.
*   **Controller (`admission_application_controller.py`):**
    *   `list_applications()`, `create_application()`, `update_application(id)`: Handles CRUD operations. Automatically formats missing application numbers matching your sessional intake (e.g. `APP-2026-0004`).
*   **Routes (`admission_application_routes.py`):**
    *   `GET    /api/admission-applications`
    *   `POST   /api/admission-applications`
    *   `POST   /api/admission-applications?id=N`
    *   `DELETE /api/admission-applications?id=N`
    *   `POST   /api/admission-applications/import`
