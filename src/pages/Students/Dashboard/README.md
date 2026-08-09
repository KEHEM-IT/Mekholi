# 📝 Student Dashboard — Page Blueprint & Architecture

This directory contains the **Student Dashboard** sub-module, providing a visual overview of active enrolled student rosters, gender ratios, religious distributions, and stipend eligibility metrics.

---

## 🎨 1. Frontend Wires & Interface

*   **KPI Stat Cards Grid:**
    Displays active student counts, gender ratios (Male vs Female percentages), and stipend recipients.
*   **Enrolment & Demographics Summary:**
    Renders demographic counts (Male and Female registers) dynamically by querying the SQLite candidate application database in the background.
*   **Pulsing Skeleton Loader:**
    Page-accurate pulsing skeletons prevent UI jumps on initial mount.
