# 📝 Admission Merit List — Page Blueprint & Architecture

This directory contains the **Admission Merit List** sub-module, managing the calculation, ranking, publication, and locking of the student selection results.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`MeritListView.vue`)
*   **Purpose:** The central ranking center. Computes merit and waiting lists dynamically based on the applicants' scores: `Total Score = Written Marks + VIVA Marks`.
*   **Roster Compilation State (`compileMeritList`):**
    Filters candidates by the selected target class, sorts them in descending order of their total score, assigns chronological ranks, and splits them into two tables:
    *   *Selected Merit List:* Winners within the class seat capacity.
    *   *Waitlisted Queue:* The remaining qualified applicants.
*   **Dual-Tab Roster Tables:** Interactive tabs switch display grids smoothly.
*   **Stat Widget Cards:** Shows real-time summaries of target classes, selected capacities, and waitlist counts.
*   **Lock & Publish Action:** A bulk-saving workflow that loops through the compiled merit lists and writes their final statuses (e.g. `'Selected'`) back to the SQLite candidate applications database!

### B. Compile & Settings Modal (`PublishMeritListModal.vue`)
*   Allows the administrator to configure the target class, year, and seat intake capacity (e.g. 30 seats) to dynamically compile the rankings.

### C. UI Elements Used
*   `BaseCombobox.vue`: Target Class, Academic Year, Seat capacity.
*   `BaseModal.vue`: Config forms.

### D. Excel Wires (`useAdmissionMeritListExcel.ts`)
*   **Export (`exportMeritListToExcel`):** Downloads a 2-sheet workbook (`Selected Merit List` and `Waitlisted Queue`) containing ranked records, scores, and candidate details.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table:**
    Operates dynamically on the **`admission_applications`** database table in real-time, keeping the system fully normalized and preventing double-data sync bugs.
*   **Controller (`admission_application_controller.py`):**
    Queries and bulk-updates the `admission_applications` records.
