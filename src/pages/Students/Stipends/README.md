# 📝 Stipends & Scholarships — Page Blueprint & Architecture

This directory contains the **Stipends & Scholarships** sub-module, managing student safety net eligibility registries, and verified parent mobile banking (MFS) payment gateways (bKash/Nagad).

---

## 🎨 1. Frontend Wires & Interface

*   **Roster Table:** Displays sessional candidates, highlighting stipend eligibility and active MFS numbers.
*   **Stipend Setup Modal:** Configures candidate eligibility. Selecting eligibility active un-fades and enables MFS Provider (bKash, Nagad, Rocket) and mobile number inputs.
*   **MFS Phone Number Validator:** Validates standard 11-digit mobile accounts starting with `01` to prevent payment failure.
