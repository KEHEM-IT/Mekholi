# 📝 Institute Profile — Page Blueprint & Architecture

This directory contains the **Institute Profile** page, which manages the central General and MPO identity of the institution (linked to the default EIIN `130430`).

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`ProfileView.vue`)
*   **Purpose:** Form-driven central dashboard editing basic info, contact details, head of institution, staff statistics (total, male, MPO), banking details, facility toggles, and managing repeatable rows of school committee members.
*   **State Management:** Stores central profile state inside the `instituteProfile` global reactive ref, computed `profileProgress` (percentage completion of mandatory fields).
*   **Branding & Logo Upload:** Features a drag-and-drop file uploader linked to `useImgbbUpload` to upload institute logo, with automated base64 file validations.
*   **State / Geo Cascades:** Connects division, district, upazila, and union selection fields using the reactive, bilingual geographical cascading helper `bdGeo.ts`.

### B. Preview Modal (`ProfilePreviewModal.vue`)
*   A premium, read-only document mockup sheet displaying the complete institutional profile, MPO approval stamps, board identifiers, and committee rosters in a clean card layout.

### C. UI Elements Used
*   `BaseCombobox.vue`: Geolocation cascades, bank names, account purposes.
*   `BaseDatePicker.vue`: Establishment date, joining date, MPO approval date.
*   `BaseToggle.vue`: English version toggle, committee left toggle, facility active toggles.

### D. Excel Wires (`useInstituteProfileExcel.ts`)
*   **Export (`exportProfileToExcel`):** Generates a 3-sheet workbook:
    1.  `Profile`: Key-value rows for scalar fields and 15 facility yes/no toggles.
    2.  `Committee Members`: Lists name, phone, position, and status.
    3.  `Classifications`: Lists institutional types and groups.
*   **Import (`importProfileFromExcel`):** Parses the 3 sheets back, matching fields by their English column headers, allowing bulk edits.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Tables (`core/db.py`):**
    *   `institute_profiles`: Stores scalar text, integers, and `classifications` as a JSON string.
    *   `committee_members`: Linked via `profile_id` with `ON DELETE CASCADE`.
    *   `facilities`: Composite primary key `(profile_id, facility_key)`.
*   **Controller (`profile_controller.py`):**
    *   `get_profile(eiin)`: Queries SQLite, serializes classifications and committee lists into a single consolidated JSON document.
    *   `upsert_profile(eiin, body)`: Coordinates a safe database transaction. Replaces the committee list wholesale, merges facility toggles, and updates scalar columns.
*   **Routes (`profile_routes.py`):**
    *   `GET  /api/profile?eiin=130430`
    *   `POST /api/profile?eiin=130430`
