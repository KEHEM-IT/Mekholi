# 📝 Institute Profile — Page Blueprint & Architecture

This directory contains the **Institute Profile** page, which manages the central identity of the institution. Uses `id` (auto-increment PK) as the primary lookup — EIIN is optional for private schools.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`ProfileView.vue`)
*   **Purpose:** Form-driven dashboard for editing basic info, contact details, head of institution, staff statistics, banking details, facility toggles, and managing committee members.
*   **State Management:** Stores profile state in `instituteProfile` global reactive ref, computed `profileProgress` (completion percentage).
*   **Branding & Logo Upload:** Drag-and-drop uploader linked to `useImgbbUpload` with file validations.
*   **State / Geo Cascades:** Division, district, upazila, union cascading via `bdGeo.ts`.
*   **Excel Wires:** Export/Import via `useInstituteProfileExcel.ts` (3-sheet workbook).
*   **Template Download:** "Template" button downloads pre-filled Excel for EIIN 129348.

### B. Preview Modal (`ProfilePreviewModal.vue`)
*   Read-only document mockup displaying complete institutional profile.

### C. UI Elements Used
*   `BaseCombobox.vue`: Geolocation cascades, bank names, account purposes.
*   `BaseDatePicker.vue`: Establishment date, joining date, MPO approval date.
*   `BaseToggle.vue`: English version toggle, committee left toggle, facility toggles.

---

## ⚙️ 2. Backend Wires & Database

### API Design (ID-based, not EIIN)
*   Uses `id` (auto-increment PK) as primary lookup key
*   EIIN is optional — works for private schools without EIIN
*   Default institute ID = 1 (first institute created)

### Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/profile?id=1` | Fetch full profile document |
| GET | `/api/profile/card-info?id=1` | Fetch only name + logo (optimized) |
| POST | `/api/profile?id=1` | Upsert profile document |

### Database Tables (`core/db.py`)
*   `institute_profiles`: Stores scalar fields, `classifications` as JSON. `id` is PK, `eiin` is optional UNIQUE.
*   `committee_members`: Linked via `profile_id` with `ON DELETE CASCADE`.
*   `facilities`: Composite PK `(profile_id, facility_key)`.

### Controller (`profile_controller.py`)
*   `get_profile_by_id(id)`: Fetch by ID (primary method).
*   `get_card_info_by_id(id)`: Optimized — returns only name + logo.
*   `upsert_profile_by_id(id, body)`: Create or update by ID.
*   Legacy EIIN-based functions kept for backward compatibility.

### Seeding
*   Blank profile seeded with `id=1` and empty EIIN (private school support).
*   No hardcoded EIIN references.
