# 📝 Exam Terms & Types — Page Blueprint & Architecture

This directory contains the **Exam Terms** sub-module, which schedules and configures terminal examinations.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`ExamTermsView.vue`)
*   **Purpose:** Displays scheduled exam terms, protecting 12 national seeded exam terms (Half Yearly, SSC Model, Alim Final, etc.) from deletion.
*   **Exam Term Form Modal (`ExamTermFormModal.vue`):**
    Configures an exam.
    *   **Auto-Fills:** Selecting an exam name (e.g. `Pre-Test Examination`) automatically defaults its exam type.
    *   **Multi-Select:** Associates the exam with a sessional term, grading scheme, and multiple class levels.

### B. UI Elements Used
*   `BaseCombobox.vue`: Exam Name, Exam Type, Board, Academic Term, Grading Scheme, Class Levels (Multiple chips).
*   `BaseDatePicker.vue`: Exam Start Date, Exam End Date.
*   `BaseToggle.vue`: Publish to Parents, Is National Board Exam, Is Active.

### C. Excel Wires (`useExamTermsExcel.ts`)
*   **Export (`exportTermsToExcel`):** Exports scheduled exams.
*   **Import (`importExamTerms`):** Bulk imports exam schedules, checking by exam name to prevent overlaps.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `exam_terms`: Stores exam details, dates, toggles, and `class_ids` as a JSON string.
*   **Controller (`exam_term_controller.py`):**
    *   Lists, creates, and updates exam schedules.
*   **Routes (`exam_term_routes.py`):**
    *   `GET  /api/exam-terms`
    *   `POST /api/exam-terms`
