# 📝 Branches / Campus — Page Blueprint & Architecture

This directory contains the **Branches / Campus** sub-module, managing multi-campus school layouts (main branch, annexes, and temporary sub-campuses) across Bangladesh.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`BranchesView.vue`)
*   **Purpose:** Displays branches as a responsive card grid, highlighting whether they are the *Main Branch* or have open admission sessions. Handles delete-confirm popups with a 5-second undoable action toast.
*   **Branch Form Modal (`BranchFormModal.vue`):**
    A modal containing 4 sections: *Identity & Code*, *Geographic Address*, *Campus Head Info*, and *Regulatory Setup*.
    *   **Main Branch Constraint:** Only *one* branch can be set as the Main Branch. Toggling `is_main` true inside the form triggers the server to demote all other branches on save.
    *   **Geographic Cascades:** Integrates divisions, districts, upazilas, and unions selectors using `bdGeo.ts`.

### B. UI Elements Used
*   `BaseCombobox.vue`: Division, District, Upazila, Union, Campus Type (Main, Annex, Sub-Campus, Temporary).
*   `BaseDatePicker.vue`: Established Date.
*   `BaseToggle.vue`: Is Main Branch, Is Active, Admission Open.

### C. Excel Wires (`useBranchesExcel.ts`)
*   **Export (`exportBranchesToExcel`):** Exports all campuses into a single spreadsheet with 25 column data definitions, translating codes and booleans into yes/no text.
*   **Import (`importBranches`):** Performs a bulk import. Campuses are matched by their English branch name; existing names are skipped and reported, only new records are inserted.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `branches`: Primary key `id`, stores campus codes, coordinates, established dates, and active toggles.
*   **Controller (`branch_controller.py`):**
    *   `list_branches()`: Fetches all branches sorted by main branch first.
    *   `create_branch(body)` / `update_branch(id, body)`: Standard SQL execution. If the item has `is_main = 1`, the controller first runs `UPDATE branches SET is_main = 0` to ensure single-instance integrity.
    *   `delete_branch(id)`: Removes the branch.
*   **Routes (`branch_routes.py`):**
    *   `GET    /api/branches` ➔ Fetch all branches.
    *   `POST   /api/branches` ➔ Create a branch.
    *   `POST   /api/branches?id=N` ➔ Update a branch.
    *   `DELETE /api/branches?id=N` ➔ Delete a branch.
    *   `POST   /api/branches/import` ➔ Bulk import.
