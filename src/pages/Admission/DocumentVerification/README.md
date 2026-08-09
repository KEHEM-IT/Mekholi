# 📝 Document Verification — Page Blueprint & Architecture

This directory contains the **Document Verification** sub-module, which manages the auditing and verification of candidate documents (passport photo, birth certificates, previous transcripts, etc.).

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`DocumentVerificationView.vue`)
*   **Purpose:** Displays applicants who have submitted their applications and paid their application processing fees.
*   **Audit status badges:** Displays colored state labels:
    *   🟢 **Fully Verified** (All checklist items cleared)
    *   🟡 **Partially Verified** (Some items cleared)
    *   🔴 **Unverified** (No items audited yet)
*   **Audit Row Trigger:** Clicking the "Audit" button opens the detailed document audit modal.

### B. Verification Audit Modal (`VerificationModal.vue`)
*   **Identity Summary:** Read-only panels summarizing candidate name, application number, desired class, and contact number.
*   **Mandatory Document Checklist:** Integrates standard checklists:
    *   *Applicant Passport Photo:* Checked toggle. Includes a clickable, targetted anchor to view the submitted file scan in a separate browser tab if available.
    *   *Birth Certificate Scan:* Checked toggle + view anchor.
    *   *Previous Academic Transcript / Marksheet:* Checked toggle.
    *   *Transfer Certificate (TC):* Checked toggle.
*   **Auto-Status Assigner:** Watches the checklist states. If all four items are toggled active, it automatically sets the main status parameter to `Fully Verified`. If some are active, sets to `Partially Verified`, otherwise `Unverified`.
*   **Auditor Remarks Logs:** Textarea to capture detailed internal notes or followup timestamps.

### C. UI Elements Used
*   `BaseCombobox.vue`: Target Class, Academic Year, Verification Status.
*   `BaseToggle.vue`: Checklist item checks.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table:**
    Operates dynamically on the **`admission_applications`** database table in real-time.
    *   `verification_status` column: Stores overall audit status string.
    *   `verification_checklist` column: Stores checkbox states `{ "photo": true, "birth_certificate": false, ... }` as a JSON string.
*   **Controller (`admission_application_controller.py`):**
    Queries and bulk-updates the `admission_applications` records, automatically parsing checklist JSON strings.
