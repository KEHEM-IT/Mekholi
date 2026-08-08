# 📝 Grading Scheme — Page Blueprint & Architecture

This directory contains the **Grading Scheme** sub-module, managing GPA/CGPA grading rules, percentage ranges, and grade rows.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`GradingView.vue`)
*   **Purpose:** Displays grading schemes (GPA 5.0, CGPA 4.0, Pass/Fail, Percentage) in tables.
*   **Grading Form Modal (`GradingFormModal.vue`):**
    Allows admins to build grades and associate them with classes and national boards.
    *   **Preset Auto-Fills:** Selecting a scheme name (e.g. `SSC Grade`) automatically populates the grading type, boards, pass marks, and injects a fully populated, repeatable table of grade rows (A+, A, A-, etc.) which the user can then customize.
    *   **Repeatable Rows:** Dynamic "Add Grade" and "Remove" controls to customize point ranges and percentages.

### B. UI Elements Used
*   `BaseCombobox.vue`: Grading Type, Applicable Boards, Class Levels (Multiple chips).
*   `BaseToggle.vue`: Is Default Scheme, Is Active.

### C. Excel Wires (`useGradingSchemesExcel.ts`)
*   **Export (`exportSchemesToExcel`):** Exports schemes. Complex grade rows are serialized into a single string column: `Name|BN|Point|Min|Max|Remarks ; ...`.
*   **Import (`importSchemes`):** Parses schemes, deserializes grade rows back into objects, and inserts them.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `grading_schemes`: Stores scalar properties, `class_level_ids` (JSON text), and `grades` (JSON text).
*   **Controller (`grading_scheme_controller.py`):**
    *   `list_schemes()`, `create_scheme()`, `update_scheme()`: Coerces and serializes grade rows. If `is_default = 1`, clears other defaults.
*   **Routes (`grading_scheme_routes.py`):**
    *   `GET  /api/grading-schemes`
    *   `POST /api/grading-schemes`
