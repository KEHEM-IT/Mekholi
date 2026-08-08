# 📝 Digital Lottery Draw — Page Blueprint & Architecture

This directory contains the **Digital Lottery Draw** sub-module, which manages randomized, cryptographically-secure candidate selection based on government and institutional quota maps.

---

## 🎨 1. Frontend Wires & Interface

### A. Core View (`DigitalLotteryView.vue`)
*   **Purpose:** Displays completed lottery draw registers inside a DataTable.
*   **Status Badges:** Shows colored state labels:
    *   🟢 **Published** (Results announced on the public portal)
    *   🟡 **Draft** (Internal preview, not yet visible on portal)
*   **Toggle Actions:** Click the published badge to toggle instant announcements on the public portal.

### B. Lottery Draw Modal (`LotteryDrawModal.vue`)
*   **Eligibility Checker:** Fetches submitted application registers (`admission_applications`) on mount and dynamically computes how many **paid, submitted candidates** are in the eligible pool for the target class:
    ```ts
    eligiblePool.value = allApplications.value.filter(
      (a) => a.desired_class === form.class_name && a.payment_status === 'Paid'
    )
    ```
*   **Quota Customization Grid:** Admin can configure percentage boundaries for general merit, freedom fighter (FF), disabled, and staff sibling quotas.
*   **Fisher-Yates Draw Shuffler:** Executing the draw shuffles the applicant pool and divides them into Selected winners (Merit Winners) and waiting queues:
    ```ts
    const limit = Math.min(form.total_seats, pool.length)
    const winners = pool.slice(0, limit)
    const waiting = pool.slice(limit)
    ```
*   **Real-time Roster Cards:** Renders selected merit cards and waiting list queue arrays in a list, showing names and application numbers.

### C. UI Elements Used
*   `BaseCombobox.vue`: Target Class, Academic Year, Quota inputs.
*   `BaseToggle.vue`: Active state, draw activation.

---

## ⚙️ 2. Backend Wires & Database

*   **Database Table (`core/db.py`):**
    *   `admission_lotteries`: Stores class names, total seats, date, and lists.
    *   `selected_applicant_ids` and `waiting_applicant_ids` are serialized as JSON strings.
    *   `academic_year_id` references `academic_years(id) ON DELETE SET NULL`.
*   **Controller (`admission_lottery_controller.py`):**
    *   `list_lotteries()`, `get_lottery(id)`, `create_lottery()`: Handles SQL operations. Decodes/encodes JSON list fields.
*   **Routes (`admission_lottery_routes.py`):**
    *   `GET    /api/admission-lotteries`
    *   `POST   /api/admission-lotteries`
    *   `POST   /api/admission-lotteries?id=N`
    *   `DELETE /api/admission-lotteries?id=N`
