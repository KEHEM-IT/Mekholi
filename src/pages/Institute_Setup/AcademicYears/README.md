# 📝 Academic Year — Page Blueprint & Architecture

This directory contains the **Academic Year** sub-module, which establishes the primary calendar spine of the school.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`AcademicYearsView.vue`)
*   **Purpose:** Displays academic years as cards, showing the duration of the school year and highlighting the current active calendar.
*   **Year Form Modal (`AcademicYearFormModal.vue`):**
    Allows admins to set the start date, end date, and admission registration window.
    *   **Date Constraint Validation:** The form validates that the `end_date` is strictly after the `start_date` and the admission registration window falls within the year bounds.
    *   **Single Current Year rule:** Toggling `is_current` true on any year will demote all other years inside the database automatically.

### B. UI Elements Used
*   `BaseDatePicker.vue`: Start Date, End Date, Registration Open, Registration Close.
*   `BaseToggle.vue`: Is Current Year, Is Active.

### C. Excel Wires (`useAcademicYearsExcel.ts`)
*   **Export (`exportYearsToExcel`):** Generates `AcademicYears.xlsx`, translating date strings and booleans.
*   **Import (`importYears`):** Bulk import matching by year name (e.g. `2026`). Existing year names are skipped to prevent duplicate calendar spans.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `academic_years`: Stores year labels (English/Bangla), dates, current toggles, and remarks.
*   **Controller (`academic_year_controller.py`):**
    *   `list_years()`: Retrieves all calendar years sorted by date.
    *   `create_year(body)` / `update_year(id, body)`: Standard SQL execution. If `is_current = 1`, runs `UPDATE academic_years SET is_current = 0` to preserve single-active-year constraints.
*   **Routes (`academic_year_routes.py`):**
    *   `GET    /api/academic-years`
    *   `POST   /api/academic-years`
    *   `POST   /api/academic-years?id=N`
    *   `DELETE /api/academic-years?id=N`
    *   `POST   /api/academic-years/import`
