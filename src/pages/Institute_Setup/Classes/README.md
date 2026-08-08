# 📝 Class / Section / Group / Shift — Page Blueprint & Architecture

This directory contains the **Class Setup** sub-module, managing the academic skeleton: classes, sections, shifts, and groups.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`ClassesView.vue`)
*   **Purpose:** A 4-tab dashboard (Classes, Sections, Groups, Shifts) displaying registers in sortable tables.
*   **Class Form Modal (`ClassFormModal.vue`):**
    A unified form modal whose inputs dynamically adapt based on the selected active tab:
    *   *Classes Tab:* Name, Phase / Level, and Sort Order.
    *   *Sections Tab:* Name, Class link, Shift link, Capacity, and optional Room link.
    *   *Groups Tab:* Name, Group Type, Version, and a **multiple chips combobox** to link multiple classes.
    *   *Shifts Tab:* Name, Start Time, and End Time (TimePicker).

### B. UI Elements Used
*   `BaseCombobox.vue`: Phase level, Class selection, Shift selection, Room selection, multiple classes chips.
*   `BaseDatePicker.vue` / `BaseTimePicker.vue`: Shift start/end times.
*   `BaseToggle.vue`: Active state toggles.

### C. Excel Wires (`useClassesSetupExcel.ts`)
*   **Export (`exportClassSetupAll`):** Exports a 4-sheet workbook: `Classes`, `Sections`, `Groups`, and `Shifts`.
*   **Import (`importClassSetupAll`):** Parses the sheets. Matches records by unique logical keys (e.g. sections by `name + class + shift`) to safely skip existing rows.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Tables (`core/db.py`):**
    *   `classes`, `sections`, `groups`, `shifts`
*   **Controller (`class_setup_controller.py`):**
    *   Handles listing, creating, and updating for each of the 4 tables. Group-class mapping is stored as a JSON string (`class_ids`).
*   **Routes (`class_setup_routes.py`):**
    *   `GET  /api/classes`, `/api/sections`, `/api/groups`, `/api/shifts`
    *   `POST /api/classes`, `/api/sections`, `/api/groups`, `/api/shifts`
