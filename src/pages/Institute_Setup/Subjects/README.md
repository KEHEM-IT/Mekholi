# 📝 Subjects & Curriculum — Page Blueprint & Architecture

This directory contains the **Subjects & Curriculum** sub-module, managing the school's subject catalog and terminal marks distribution per class level.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`SubjectsView.vue`)
*   **Purpose:** Displays the school's subject catalog, protecting 52 default seeded national Bangladeshi subjects from accidental deletion.
*   **Subject Form Modal (`SubjectFormModal.vue`):**
    Allows admins to build subjects.
    *   **Auto-Fills:** Selecting a subject name (e.g. `Physics`) automatically retrieves and populates its national board code and default subject type.
    *   **Repeatable Marks Distribution Grid:** Let's the admin add class levels (Classes multi-combo) and configure theory, practical, continuous assessment (CA), pass marks, and textbooks for each class.

### B. UI Elements Used
*   `BaseCombobox.vue`: Subject Name, Code, Type, Board, Group, Version, Class Levels (Multiple chips).
*   `BaseToggle.vue`: Active status toggles.

### C. Excel Wires (`useSubjectsExcel.ts`)
*   **Export (`exportSubjectsToExcel`):** Exports the subjects registry, serializing the marks distribution rows into a single string: `ClassId|Theory|Practical|CA|Pass|Periods|Books ; ...`.
*   **Import (`importSubjects`):** Parses columns, deserializes marks rows back into JSON, and imports.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `subjects`: Stores subject details, `class_level_ids` (JSON text), and `marks_distribution` (JSON text).
*   **Controller (`subject_controller.py`):**
    *   Lists, creates, and updates subject records.
*   **Routes (`subject_routes.py`):**
    *   `GET  /api/subjects`
    *   `POST /api/subjects`
