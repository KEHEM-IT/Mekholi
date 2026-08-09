# 📝 Admission Settings — Page Blueprint & Architecture

This directory contains the **Admission Settings** sub-module, which manages global intake schedules, payment gateway merchant keys, and class-wise age restrictions.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`AdmissionSettingsView.vue`)
This page is split into **three beautifully organized tabs**:

#### 1. Intake Calendar & Fees
*   **Active Intake Session:** Selects which Academic Year (referenced from your `academic_years` table) drives the portal.
*   **Open & Close Dates:** Select opening/closing periods.
*   **Fees & Terms:** Set default processing fees (BDT) and bilingual terms and conditions.

#### 2. Class Age Restrictions
*   Renders all 14 Bangladeshi class levels in a clean table checklist.
*   Let's administrators specify the **Minimum Age** and **Maximum Age** limits in years for each class.

#### 3. Payment Gateway Setup
*   Log merchant API keys and IDs for **bKash** and **Nagad** securely. Inputs utilize masked password styles (`type="password"`) for maximum visual credential protection.

### B. UI Elements Used
*   `BaseCombobox.vue`: Academic Year.
*   `BaseDatePicker.vue`: Open Date, Close Date.
*   `BaseToggle.vue`: Admission Portal active toggles.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `admission_settings`: Stores active year links, dates, and fees.
    *   `age_limits` and `payment_credentials` are serialized and stored as JSON strings.
    *   `academic_year_id` explicitly references `academic_years(id) ON DELETE SET NULL`.
*   **Controller (`admission_setting_controller.py`):**
    *   `get_settings()`: Retrieves row 1 configurations. Creates a default template if missing.
    *   `save_settings()`: Upserts/updates the single configuration record in SQLite.
*   **Routes (`admission_setting_routes.py`):**
    *   `GET  /api/admission-settings`
    *   `POST /api/admission-settings`
