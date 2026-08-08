# 📝 Admission Enquiries — Page Blueprint & Architecture

This directory contains the **Admission Enquiries** sub-module, which manages prospective student leads, phone enquiries, and front-office walk-in logs.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`EnquiriesView.vue`)
*   **Purpose:** Form-driven central dashboard to log prospective applicant leads, phone follow-ups, and front-desk walk-ins. Displays details in a sortable, sticky-header table with beautiful, color-coded badges for status.
*   **Bilingual Render Helper:** Integrates a reactive bilingually translated candidate name parser `Mehedi Hasan (মেহেদী হাসান)` in the datatable view.
*   **Archiving Confirm Modal:** Features a custom confirmation block to safely deactivate or archive a resolved inquiry.

### B. Enquiry Form Modal (`EnquiryFormModal.vue`)
*   **Layout:** A dual-column, beautifully structured modal that separates fields into logical sections:
    *   *Candidate & Guardian:* Name (English/Bangla), Guardian info, phone, and previous school.
    *   *Intake & Preferences:* Desired Class, Desired Version, Shift, and Academic intake year.
    *   *Nationality & Residency:* Country of Residence (Combobox) and Nationality.
    *   *Enquiry Logs:* Date of Enquiry, Source, Status (New, Follow-up, Selected, Converted, Rejected), and Remarks.
*   **Mobile Grid Fixes:** Fully styled using media-gated `.ipf-field--span2` classes so two-column fields collapse cleanly into a single column on phone viewports.
*   **Bangladesh Mobile Phone Validator:** Automatically cleans and validates standard 11-digit Bangladeshi mobile numbers starting with `01` when the country is Bangladesh.

### C. UI Elements Used
*   `BaseCombobox.vue`: Desired Class, Desired Version, Preferred Shift, Country of Residence (loaded from `countries.json`), Source, Status.
*   `BaseDatePicker.vue`: Date of Enquiry.
*   `BaseToggle.vue`: Is Active Enquiry.

### D. Excel Wires (`useAdmissionEnquiriesExcel.ts`)
*   **Export (`exportEnquiriesToExcel`):** Downloads a formatted spreadsheet containing 17 data columns, translating active states and date strings.
*   **Import (`importEnquiriesFromExcel`):** Bulk imports enquiries, matching records by `candidate_name + phone` to safely skip existing entries.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `admission_enquiries`: Stores candidate names, guardian info, phone numbers, desired class, version, dates, and active flags.
    *   `academic_year_id` explicitly references `academic_years(id) ON DELETE SET NULL` for referential integrity.
*   **Controller (`admission_enquiry_controller.py`):**
    *   `list_enquiries()`, `create_enquiry()`, `update_enquiry(id)`: Standard SQL CRUD operations. Coerces booleans into integers for database compatibility.
*   **Routes (`admission_enquiry_routes.py`):**
    *   `GET    /api/admission-enquiries`
    *   `POST   /api/admission-enquiries`
    *   `POST   /api/admission-enquiries?id=N`
    *   `DELETE /api/admission-enquiries?id=N`
    *   `POST   /api/admission-enquiries/import`
