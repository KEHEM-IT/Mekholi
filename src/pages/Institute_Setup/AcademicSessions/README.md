# 📝 Academic Sessions & Terms — Page Blueprint & Architecture

This directory contains the **Academic Sessions & Terms** sub-module, which splits academic years into named sessions used for term exams, tuition billings, and grade promotions.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`AcademicSessionsView.vue`)
*   **Purpose:** Displays scheduled session terms with a green active indicator (🟢 Current) showing which term is currently active in the school calendar.
*   **Session Form Modal (`AcademicSessionFormModal.vue`):**
    *   **Auto-Fills:** Selecting a session name (e.g. `2026 Session`) automatically maps and selects the corresponding academic year `id`. Selecting a term name (e.g. `Term 2`) automatically sets its default chronological order (`2`).
    *   **Active Term constraint:** Toggling `is_current` true on a term will automatically demote all other sessions and terms on save.

### B. UI Elements Used
*   `BaseCombobox.vue`: Session Name, Academic Year, Term Name, Result Calculation Type (Annual, Cumulative, Average).
*   `BaseDatePicker.vue`: Term Start Date, Term End Date.
*   `BaseToggle.vue`: Is Current Active Term, Is Active.

### C. Excel Wires (`useAcademicSessionsExcel.ts`)
*   **Export (`exportSessionsToExcel`):** Exports session terms.
*   **Import (`importSessions`):** Bulk imports session terms, matching by `session_name + term_name` to prevent duplicated calendar terms.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `academic_sessions`: Stores session labels, term orders, start/end dates, current active status, and result calculation types.
*   **Controller (`academic_session_controller.py`):**
    *   `list_sessions()`, `create_session()`, `update_session()`: Normalizes data. If `is_current = 1`, runs `UPDATE academic_sessions SET is_current = 0` to preserve single-active-term constraints.
*   **Routes (`academic_session_routes.py`):**
    *   `GET  /api/academic-sessions`
    *   `POST /api/academic-sessions`
