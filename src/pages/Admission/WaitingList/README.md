# 📝 Admission Waiting List — Page Blueprint & Architecture

This directory contains the **Admission Waiting List** sub-module, managing reserve student queues, vacancy calculations, and real-time merit promotions.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`WaitingListView.vue`)
*   **Purpose:** Central waiting list dashboard. Displays candidates sorted dynamically by score and allows real-time vacancy tracking and candidate promotions.
*   **Dynamic Vacancy Counter:**
    Calculates remaining vacancies in the selected class in real-time based on seat capacity and selected counts:
    ```ts
    const selectedCount = computed(() => allApplications.value.filter(a => a.application_status === 'Selected').length)
    const openVacancies = computed(() => Math.max(0, intakeCapacity.value - selectedCount.value))
    ```
*   **Auto-Promote Next:** A premium one-click action that automatically takes the **#1 ranked waitlisted candidate** in the selected class, checks if there is a vacancy, and promotes them!
*   **Manual Row Promotion:** A click-action button on each table row that opens a promotion confirmation modal to upgrade any selected waitlisted candidate.
*   **Stat Widgets Grid:** Shows real-time counters of waitlisted queue sizes, selected totals, and available seat vacancies.

### B. Promote Candidate Modal (`BaseModal.vue` popup)
*   A confirmation dialog to prevent accidental clicks before promoting waitlist entries.

### C. UI Elements Used
*   `BaseCombobox.vue`: Desired Class, Academic Year.
*   `BaseToggle.vue`: Active states.

### D. Excel Wires (`useAdmissionWaitingListExcel.ts`)
*   **Export (`exportWaitingListToExcel`):** Downloads an Excel sheet (`Waitlist Queue`) with 10 data columns containing waitlist ranks, scores, and candidate contacts.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table:**
    Operates dynamically on the **`admission_applications`** database table in real-time, keeping the system fully normalized and preventing double-data sync bugs.
*   **Controller (`admission_application_controller.py`):**
    Queries and bulk-updates the `admission_applications` records.
