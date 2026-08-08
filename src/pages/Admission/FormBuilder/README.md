# 📝 Online Form Builder — Page Blueprint & Architecture

This directory contains the **Online Form Builder** sub-module, letting school administrators customize and preview the public student admission registration form.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`FormBuilderView.vue`)
This page is split into **two powerful, responsive columns**:

#### Left Column (Configuration Panel)
*   **General Settings:** Configure Form Title (EN/BN), Application Processing Fee (BDT), Open/Close dates, Publish Status (Draft, Active, Closed), and Parent Instructions.
*   **Standard Fields Manager:** A clean table listing 13 standard fields (such as Candidate Name, Phone, Email, Photo, Birth Certificate) with individual switches for visibility and required status.
*   **Custom Fields Manager:** An on-the-fly component generator where the administrator can type a label, select a field type (text, number, dropdown, file upload), and click **Add Custom Field** to instantly append a custom field.

#### Right Column (Live Public Portal Mockup)
*   A gorgeous, sticky browser mockup designed to look exactly like your public school portal.
*   **Real-time Live Preview:** As you change titles, fees, or instructions, or toggle checkboxes on the left, **the public form on the right re-renders in real-time**!

### B. UI Elements Used
*   `BaseCombobox.vue`: Form Status, Academic Year, Custom Field Type.
*   `BaseDatePicker.vue`: Open Date, Close Date.
*   `BaseToggle.vue`: Fields visibility, required toggles, and form active.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `admission_forms`: Stores form titles, dates, fees, instructions, and configurations.
    *   `fields_config` and `custom_fields` are stored as JSON-serialized text columns.
*   **Controller (`admission_form_controller.py`):**
    *   `get_form()`: Retrieves the primary form configuration (Row 1). Returns fully populated default parameters if the table is empty.
    *   `save_form()`: Upserts/updates the single-instance configuration row in the database.
*   **Routes (`admission_form_routes.py`):**
    *   `GET  /api/admission-form`
    *   `POST /api/admission-form`
