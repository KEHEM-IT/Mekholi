# 📝 Admission Dashboard — Page Blueprint & Architecture

This directory contains the **Admission Dashboard** sub-module, which provides a comprehensive, highly-visual real-time overview of the student intake pipeline and progression statistics.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`DashboardView.vue`)
*   **Purpose:** The central dashboard and main landing page of the Admission module (sub-navigation index #1).
*   **Key Statistics Widget Cards:**
    *   Displays 3 prominent counters capturing:
        - *Total Enquiries logged* (derived from `fetchEnquiries()`)
        - *Submitted Online Applications* (derived from `fetchApplications()`)
        - *Selected Candidates* (applicants whose status is marked as `'Selected'`)
*   **Pipeline Progression Flow Chart:**
    Renders an interactive 4-stage pipeline diagram tracing prospective candidate conversion rates:
    `Logged Enquiries` ➔ `Applications Submitted` ➔ `Paid Application Fees` ➔ `Selected Candidates`.
*   **Notice Board / Circulars Widget:**
    Displays upcoming calendar dates, scheduled exam counts, completed lottery draw rosters, and admission circular announcements.
*   **Established Pulse Skeleton Loader:**
    Shows an exact pulsing card skeleton layout on mount for at least 2 seconds, preventing UI layout jumps on slow network environments.

### B. UI Elements Used
*   `BaseToggle.vue`: Language/theme settings selectors.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Integration:**
    Does not write directly to SQLite, but dynamically queries across **5 database tables** in the background:
    *   `academic_years` (Retrieves active year name)
    *   `admission_enquiries` (Computes logged leads counts)
    *   `admission_applications` (Computes submitted application volumes, paid fee metrics, and selected winners)
    *   `admission_tests` (Retrieves scheduled exams volume)
    *   `admission_lotteries` (Retrieves completed lottery draw counts)
