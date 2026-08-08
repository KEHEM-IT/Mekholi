# 📝 Classrooms / Rooms / Buildings — Page Blueprint & Architecture

This directory contains the **Infrastructure** sub-module, managing the school's physical buildings, floors, and classrooms.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`RoomsView.vue`)
*   **Purpose:** A 2-tab view separating Building block cards from individual Room register tables.
*   **Room Form Modal (`RoomFormModal.vue`):**
    Allows admins to build a room, map it to a physical building, specify its floor number, and toggle standard **Facilities checkmarks** (Projector, AC, CCTV, Computers, Smartboard, fan, etc.).

### B. UI Elements Used
*   `BaseCombobox.vue`: Parent Building, Room Type (Classroom, Lab, Library, Office, Auditorium, Store, etc.).
*   `BaseToggle.vue`: Multi-checkbox facilities list, Active/Maintenance state, Is Active.

### C. Excel Wires (`useRoomsBuildingsExcel.ts`)
*   **Export (`exportRoomsAll`):** Exports a 2-sheet workbook (`Buildings`, `Rooms`). Facilities array is serialized as a JSON string inside the rooms sheet.
*   **Import (`importRoomsAll`):** Parses sheets, matching rooms by `room_no + building_id` to prevent layout overlaps.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Tables (`core/db.py`):**
    *   `buildings`
    *   `rooms`: Linked to buildings via `building_id`, stores facilities as a JSON string.
*   **Controller (`room_controller.py`):**
    *   Manages listing, creating, and updating buildings and rooms.
*   **Routes (`room_routes.py`):**
    *   `GET  /api/buildings`, `/api/rooms`
    *   `POST /api/buildings`, `/api/rooms`
