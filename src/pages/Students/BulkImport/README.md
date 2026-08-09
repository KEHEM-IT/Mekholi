# 📝 Add/Bulk Import — Page Blueprint & Architecture

This directory contains the **Bulk Import** sub-module, managing mass drag-and-drop Excel candidate profile uploading.

---

## 🎨 1. Frontend Wires & Interface

*   **Excel Drag-and-Drop Box:**
    Supports `.xlsx` and `.xls` uploads, parsing candidate sheets in real-time, matching duplicates by `student_id` to safely skip existing registers.
