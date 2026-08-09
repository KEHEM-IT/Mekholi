# 📝 Seat/Quota Planning — Page Blueprint & Architecture

This directory contains the **Seat/Quota Planning** sub-module, which manages available student seat intake capacities and quota percentage maps per class level.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`SeatQuotaView.vue`)
*   **Purpose:** Displays all class levels for the selected academic year, showing their seat capacities and quota percentages.
*   **Action Trigger:** Clicking the "Configure" button opens the seat/quota configuration modal.

### B. Seat/Quota Setup Modal (`SeatQuotaFormModal.vue`)
*   **Cap Inputs:** Allows editing total available seats and the 4 standard quotas (General, Freedom Fighter, Sibling, Disabled).
*   **Cumulative Sum Indicator:** A computed property that sums up the quotas and provides a green validation tick (or a red warning cross) to alert the user if the sum is not exactly `100%`:
    ```ts
    const totalPercentage = computed(() => Number(form.quota_general) + Number(form.quota_freedom_fighter) + ...)
    const isSumValid = computed(() => totalPercentage.value === 100)
    ```
*   **Validation Rule:** Blocks form submission and triggers a toast if the sum is not exactly `100%`.

### C. UI Elements Used
*   `BaseCombobox.vue`: Academic Year.
*   `BaseModal.vue`: Config forms.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table:**
    Operates dynamically on your core **`classes`** database table in real-time, avoiding duplication.
    *   `intake_capacity` column: Stores available seats (default `40`).
    *   `quota_general` / `quota_freedom_fighter` / `quota_disabled` / `quota_staff` columns: Stores quota percentages (default `80 / 10 / 5 / 5`).
*   **Controller (`class_setup_controller.py`):**
    Manages database CRUD operations for classes, including normalization and type coercion of the new columns.
