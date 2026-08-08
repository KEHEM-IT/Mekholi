# 📝 Admission Tests — Page Blueprint & Architecture

This directory contains the **Admission Tests** sub-module, which configures exam schedules, assigns physical classroom venues, and enforces written/MCQ/VIVA maximum marks.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`TestsView.vue`)
*   **Purpose:** Displays scheduled exam terms, desired classes, year, test date, and room.
*   **Dynamic Component Indicators:** Displays max marks under Written, MCQ, and VIVA columns. If a component is active, it renders the score cap; if inactive for that schedule, it renders a grayed-out dash **`—`** indicating that the component is disabled!

### B. Test Form Modal (`TestFormModal.vue`)
*   **Exam Parameters Toggles:** Displays three toggle rows (**Written Exam**, **MCQ Exam**, **VIVA Interview**).
*   **Dynamic Input Disabling:** If a parameter toggle is unchecked, its corresponding Maximum Marks input field is **instantly disabled and faded out (`opacity: 0.55`)** via `.is-disabled-opacity` CSS class!
*   **Minimum Selection Rule:** Validates that at least one of `has_written`, `has_mcq`, or `has_viva` is checked before allowing form submission.

### C. UI Elements Used
*   `BaseCombobox.vue`: Desired Class, Academic Year, Physical Venue Room (loaded from `rooms` table).
*   `BaseDatePicker.vue`: Test Date.
*   `BaseTimePicker.vue`: Start Time, End Time.
*   `BaseToggle.vue`: Exam parameter toggles, Active schedule.

### D. Excel Wires (`useAdmissionTestsExcel.ts`)
*   **Export (`exportTestsToExcel`):** Downloads an Excel sheet with 15 data columns, including active exam parameter booleans.
*   **Import (`importTestsFromExcel`):** Parses sheets, matching exams by `test_name` to safely skip duplicates.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `admission_tests`: Stores test names, dates, times, rooms, parameter switches, and marks caps.
    *   `academic_year_id` references `academic_years(id) ON DELETE SET NULL`.
    *   `room_id` references `rooms(id) ON DELETE SET NULL` to link tests to physical classrooms.
*   **Controller (`admission_test_controller.py`):**
    *   `list_tests()`, `create_test()`, `update_test(id)`: Standard CRUD operations.
*   **Routes (`admission_test_routes.py`):**
    *   `GET    /api/admission-tests`
    *   `POST   /api/admission-tests`
    *   `POST   /api/admission-tests?id=N`
    *   `DELETE /api/admission-tests?id=N`
    *   `POST   /api/admission-tests/import`
