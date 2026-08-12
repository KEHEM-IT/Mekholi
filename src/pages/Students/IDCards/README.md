# 📝 Student ID Cards — Page Blueprint & Architecture

This directory contains the **Student ID Cards** sub-module, rendering professional white-themed sessional student ID card certificates on-the-fly.

---

## 🎨 1. Frontend Wires & Interface

*   **Student Register Table:** Select target class and academic year to load active students. Supports selective bulk checks and search filtering.
*   **ID Card Console:** Live card preview panel with design theme and orientation controls.
*   **Focus Preview:** Click "Focus Preview" in the table to focus on a specific student's card in the preview panel.
*   **Responsive Layout:** Two-column grid (Student Register + ID Card Console) that stacks on mobile.

---

## 🖼️ 2. Card Design

*   **White Professional Design:** Clean white background with blue accents for print-ready cards.
*   **Institute Logo:** Pulls from `instituteProfile.institute_logo` (set in Institute Setup > Profile).
*   **Dynamic Institute Name:** Shows actual institute name from database (not hardcoded).
*   **Signature Blocks:** Class Teacher and Headmaster signature lines at the bottom.
*   **Three Themes:**
    - **Modern Dark** → White with blue accents
    - **Corporate Blue** → White with blue header banner
    - **Emerald Minimal** → White with green accents
*   **Orientations:** Portrait (250×390px) and Landscape (390×250px).

---

## ⚙️ 3. Backend Wires & Database

*   **Optimized API (`useCardInfo.ts`):**
    - Calls `GET /api/profile/card-info?id=1` (fetches only name + logo, not full profile)
    - Session caching — API called once, result reused
    - Reduces payload from ~2KB to ~50-100 bytes
*   **Print Sheet:** Hidden A4 printable sheet with 8 cards per page, shown only in browser print dialog.
