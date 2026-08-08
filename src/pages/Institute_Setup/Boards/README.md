# 📝 Board & Regulatory Setup — Page Blueprint & Architecture

This directory contains the **Board & Regulatory** sub-module, establishing which national boards or ministries (such as BISE Dhaka, Madrasah Board, or BTEB) the school is governed by.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`BoardsView.vue`)
*   **Purpose:** Displays regulatory authorities governed by the school, protecting official registries (13 national Bangladeshi boards) from being deleted (`is_builtin` check).
*   **Board Form Modal (`BoardFormModal.vue`):**
    Contains form fields and a collapsible, rounded **Regulatory Block panel** to store administrative license numbers, registration dates, MPO numbers, and file attachments.

### B. UI Elements Used
*   `BaseCombobox.vue`: Board Type (General, Madrasah, Technical, National University), Institute Types (Multiple chips).
*   `BaseDatePicker.vue`: Recognition Date.
*   `BaseToggle.vue`: Active status toggles.

### C. Excel Wires (`useBoardsExcel.ts`)
*   **Export (`exportBoardsToExcel`):** Exports the boards registry, flattening the nested regulatory fields into separate column headers.
*   **Import (`importBoards`):** Parses the columns, re-packs them into the nested `regulatory` structure, and performs bulk inserts.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `boards`: Stores board codes (DHA, RAJ, MAD, TEC, etc.), website links, contacts, and `regulatory` data as a JSON string.
*   **Controller (`board_controller.py`):**
    *   `list_boards()`, `create_board()`, `update_board()`: Coerces and serializes regulatory columns.
*   **Routes (`board_routes.py`):**
    *   `GET  /api/boards`
    *   `POST /api/boards`
