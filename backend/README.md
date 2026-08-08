# Mekholi — Backend Developer's Guide & Concept Map

The Mekholi backend is a **minimal, high-performance Python HTTP API** that powers the Mekholi ERP SPA frontend (Vue 3 + Vite). It stores data in **SQLite**, runs on zero third-party dependencies (built entirely on Python's standard library), and is structured following clean, layered architectural boundaries.

---

## 🗺️ 1. The Core Architecture Concept

The backend is built around **strict dependency directions**. Each layer is isolated and only imports or talks to the layers directly *below* it. This ensures that the HTTP plumbing is completely decoupled from your database and business rules.

```
┌─────────────────────────┐
│     Vue 3 Frontend      │  ← speaks JSON over plain HTTP
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Plumbing (server.py)   │  ← boots the Threaded TCP Server & dispatches requests
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│    api/v1/routes/       │  ← parses URLs, extracts query params, decodes JSON
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  api/v1/controllers/    │  ← validates inputs, runs business rules, sanitizes data
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      core/db.py         │  ← opens WAL-mode SQLite connections, runs seeders & migrations
└─────────────────────────┘
```

### Layer Summary
| Layer | Directory | Responsibility | Imports |
|---|---|---|---|
| **Plumbing** | `server.py` | Starts the `ThreadingMixIn` server, binds to `0.0.0.0`, manages the global route registry. | `api/v1/routes/*`, `core/db` |
| **Routes** | `api/v1/routes/` | URL matching, method checking (`GET`, `POST`, `DELETE`, `OPTIONS`), JSON body extraction. | `api/v1/controllers/*`, `utils/response` |
| **Controllers** | `api/v1/controllers/` | Data normalization, type coercion (booleans ➔ 0/1), database transactions. | `core/db` |
| **Database** | `core/db.py` | Connection pools, idempotent schema migrations, mock-data seeding. | `sqlite3`, `json` |
| **Utilities** | `utils/response.py` | Single source of truth for JSON structure, HTTP status, and Caddy/Vercel CORS preflights. | `json` |

---

## 🧵 2. Request Lifecycle: A Step-by-Step Walkthrough

When a user clicks **"New Enquiry"** on the frontend, fills the form, and clicks save, the request flows through the backend like a thread:

```
                  [ BROWSER / CLIENT ]
                           │
                           │  POST /api/admission-enquiries?id=5 { ... }
                           ▼
                 [ server.py: Handler ]
                           │
                           │  1. OPTIONS check? No, method is POST
                           │  2. Loop route registrars...
                           ▼
         [ admission_enquiry_routes.py ]
                           │
                           │  1. Path starts with /api/admission-enquiries? Yes!
                           │  2. Extract query ID: 5
                           │  3. Read & decode JSON body from connection stream
                           ▼
       [ admission_enquiry_controller.py ]
                           │
                           │  1. Run _normalize(): coerce types, format BD phone to 11 digits
                           │  2. Get connection via db.get_db()
                           │  3. Execute transactional SQL UPDATE statement
                           │  4. Commit transaction
                           ▼
                  [ response.py: res.ok ]
                           │
                           │  1. Serialize {"ok": True, "id": 5} with preserved Bengali text
                           │  2. Write standard CORS & content-length headers
                           │  3. Push payload back into connection socket
                           ▼
                        [ 200 OK ]
```

---

## 🗄️ 3. Database Schema Concept Map

The SQLite database file (`school.db`) lives at your repository root. Relationships are mapped cleanly, utilizing cascading deletions on parent-child tables.

```
       [ institute_profiles ]
        ├── id (PK)
        ├── classifications (JSON text)
        └── facilities (join table)
                 │
                 ▼
       [ committee_members ] (FK: profile_id)
                 │
                 ▼
          [ branches ] (FK: profile_id, is_main)
                 │
                 ▼
     [ academic_years ] (is_current spine)
        │        │        │
        │        │        └───► [ academic_sessions ] (FK: academic_year_id, term_order)
        │        │
        │        └────────────► [ admission_forms ] (FK: academic_year_id)
        │                          - fields_config (JSON text)
        │                          - custom_fields (JSON text)
        │
        └─────────────────────► [ admission_applications ] (FK: academic_year_id)
                                   - application_no (UNIQUE)
                                   - application_status
                                   - payment_status (Pending/Paid/Failed)
                                   - written_marks / viva_marks
                                   - photo / birth_certificate (Paths)
                                             ▲
                                             │
                                             │ (matches Desired Class)
                                             ▼
                                  [ admission_tests ] (FK: academic_year_id)
                                     - test_name
                                     - has_written, has_mcq, has_viva (0/1)
                                     - max_written_marks, max_mcq_marks, max_viva_marks
                                     - room_id (FK) ────────┐
                                                            │ (Venue Link)
                                                            ▼
                                                       [ rooms ] (FK: building_id)
                                                            ▲
                                                            │
                                                       [ buildings ]
```

---

## 🚪 4. Resource Definitions & Endpoints

Mekholi divides its resources into modular files. The **Admission** pipeline is now fully implemented with 4 main endpoints:

### A. Admission Enquiries (`/api/admission-enquiries`)
*   **Purpose:** Lead generation, CRM follow-ups, and prospective walk-ins.
*   **Database Table:** `admission_enquiries`
*   **Controller:** `admission_enquiry_controller.py`
*   **Routes:** `admission_enquiry_routes.py`
*   **Endpoints:**
    *   `GET  /api/admission-enquiries` ➔ List all logged enquiries.
    *   `POST /api/admission-enquiries` ➔ Create a new lead.
    *   `POST /api/admission-enquiries?id=N` ➔ Update/Save a lead.
    *   `DELETE /api/admission-enquiries?id=N` ➔ Delete a lead.
    *   `POST /api/admission-enquiries/import` ➔ Bulk Excel import (skips row if `name + phone` matches).

### B. Online Form Builder (`/api/admission-form`)
*   **Purpose:** Customize standard visibility, required parameters, and configure custom field pipelines.
*   **Database Table:** `admission_forms`
*   **Controller:** `admission_form_controller.py`
*   **Routes:** `admission_form_routes.py`
*   **Endpoints:**
    *   `GET  /api/admission-form` ➔ Fetch primary form template schema (Row 1).
    *   `POST /api/admission-form` ➔ Save/Update form schema & custom fields.

### C. Admission Applications (`/api/admission-applications`)
*   **Purpose:** Applicant profiles inbox, invoice payment audits, exam grading, and registration approvals.
*   **Database Table:** `admission_applications`
*   **Controller:** `admission_application_controller.py`
*   **Routes:** `admission_application_routes.py`
*   **Endpoints:**
    *   `GET  /api/admission-applications` ➔ List all submitted forms.
    *   `POST /api/admission-applications` ➔ Submit a candidate application.
    *   `POST /api/admission-applications?id=N` ➔ Save/Edit candidate details, payment tracking, or scores.
    *   `DELETE /api/admission-applications?id=N` ➔ Delete/Reject an application.
    *   `POST /api/admission-applications/import` ➔ Bulk Excel import.

### D. Admission Tests (`/api/admission-tests`)
*   **Purpose:** Exam calendar scheduling, maximum score boundaries, and classroom allocations.
*   **Database Table:** `admission_tests`
*   **Controller:** `admission_test_controller.py`
*   **Routes:** `admission_test_routes.py`
*   **Endpoints:**
    *   `GET  /api/admission-tests` ➔ List scheduled exam terms.
    *   `POST /api/admission-tests` ➔ Create an exam schedule.
    *   `POST /api/admission-tests?id=N` ➔ Save/Update exam constraints.
    *   `DELETE /api/admission-tests?id=N` ➔ Delete a schedule.
    *   `POST /api/admission-tests/import` ➔ Bulk Excel import.

---

## 🚀 5. How to Add a New Resource (Standard Checklist)

Adding a new feature (such as `/api/alumni` or `/api/transport`) is incredibly easy and takes exactly **4 structured steps**:

### Step 1: Define Table & Seed in `backend/core/db.py`
Add your SQLite `CREATE TABLE` script inside `init_db()`. Write an optional seeder (`_seed_alumni(conn)`) and register its execution on server boot.

### Step 2: Create Controller in `backend/api/v1/controllers/`
Create `alumni_controller.py`. Import `get_db` from `backend.core.db`, write clean, normalized functions (list, fetch, save, delete), and handle type conversions (e.g. converting booleans ➔ 0/1 for SQLite compatibility).

### Step 3: Create Route Dispatcher in `backend/api/v1/routes/`
Create `alumni_routes.py`. Wrap your URL query extracts, read JSON bodies using `_read_json_body()`, call the controller methods, and serialize JSON responses back via `res.ok(handler, payload)`.

### Step 4: Register Route in `backend/server.py`
Import your route registrar at the top of `server.py` and register its dispatcher method inside the `_dispatch()` route loop:
```python
if alumni_routes.register_alumni_routes(self, method, path):
    return True
```

**Done!** Your new module instantly inherits robust threaded performance, global CORS configurations, error handlers, and SQLite transaction safety!
