# 📝 Student List — Page Blueprint & Architecture

This directory contains the **Student List** sub-module, managing student registries, basic contact details, and sessional roll rankings.

---

## 🎨 1. Frontend Wires & Interface

*   **Roster DataTable:** Displays sessional student listings with filters, full screen triggers, and loading skeletons.
*   **Student Profile Form Modal:** Supports full candidate editing (bilingual names, contact phones, previous school, date of birth, blood groups, and government unique ID mapping).

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table:**
    Operates on the **`students`** table.
    *   `academic_year_id` explicitly references `academic_years(id) ON DELETE SET NULL`.
*   **Controller:** `student_controller.py` manages standard SQLite CRUD execution.
