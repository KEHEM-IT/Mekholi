# 📝 Holidays & Working Days — Page Blueprint & Architecture

This directory contains the **Holidays & Working Days** sub-module, managing the school's weekly work schedules and holiday calendar.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`HolidaysView.vue`)
*   **Purpose:** A 2-tab view separating Weekly Working Days (Sun–Thu) from specific Calendar Holidays (national, religious, or administrative).
*   **Holiday Form Modal (`HolidayFormModal.vue`):**
    Allows admins to schedule a holiday.
    *   **Date Linkage:** Selecting `date_from` automatically sets `date_to` to the same date as a default, reducing parent clicks.
    *   **Overriding Closed Days:** Includes a `is_working_override` toggle to designate a weekend day (e.g. Friday) as an active school day.

### B. UI Elements Used
*   `BaseCombobox.vue`: Holiday Type (Govt, Religious, Institute, Sports, Exam), Branch, Day of the Week.
*   `BaseDatePicker.vue`: Date From, Date To.
*   `BaseTimePicker.vue`: Shift open/close hours.
*   `BaseToggle.vue`: Repeats Every Year, Working Override, Is Active.

### C. Excel Wires (`useHolidaysWorkingDaysExcel.ts`)
*   **Export (`exportHolidaysToExcel`):** Exports a 2-sheet workbook (`Working Days`, `Holidays`).
*   **Import (`importHolidays`):** Parses sheets, matching holidays by `name + date_from` and skipping duplicates.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Tables (`core/db.py`):**
    *   `working_days`: Stores Sunday–Saturday active toggles and timings.
    *   `holidays`: Stores holiday records, dates, and recurring status.
*   **Controller (`holiday_controller.py`):**
    *   Lists, updates, and deletes working days and holidays.
*   **Routes (`holiday_routes.py`):**
    *   `GET  /api/working-days`, `/api/holidays`
    *   `POST /api/working-days`, `/api/holidays`
