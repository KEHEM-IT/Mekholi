# Mekholi — Backend Documentation

The Mekholi backend is a **minimal, structural Python HTTP API** that powers the
Institute Profile module of the SPA frontend (Vue 3 + Vite). It speaks JSON over
plain HTTP, stores data in **SQLite**, and is organised so new resources can be
added without touching the HTTP plumbing.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Running the Server](#running-the-server)
4. [Request Lifecycle](#request-lifecycle)
5. [API Reference](#api-reference)
6. [Data Model (SQLite)](#data-model-sqlite)
7. [Code Structure & Conventions](#code-structure--conventions)
8. [Adding a New Resource](#adding-a-new-resource)
9. [Frontend Integration](#frontend-integration)
10. [Error Handling & CORS](#error-handling--cors)
11. [Backup & Migrations](#backup--migrations)
12. [Deployment Notes](#deployment-notes)
13. [Future Roadmap](#future-roadmap)

---

## Architecture Overview

```
┌─────────────────────┐         HTTP / JSON          ┌──────────────────────────┐
│  Vue 3 + Vite SPA   │  ──────────────────────────► │  Python HTTP Server      │
│  (src/, services/)  │  GET/POST /api/profile…      │  (backend/server.py)    │
└─────────────────────┘                              └───────────┬──────────────┘
                                                                 │
                                              ┌──────────────────┼──────────────────┐
                                              ▼                  ▼                  ▼
                                       ┌────────────┐    ┌──────────────┐   ┌───────────────┐
                                       │  routes/   │───►│ controllers/ │──►│   core/db.py  │
                                       │ (dispatch) │    │ (business)   │   │   (SQLite)    │
                                       └────────────┘    └──────────────┘   └───────────────┘
```

**Layers (dependency direction — each layer only imports the ones below it):**

| Layer | Responsibility | Imports |
|---|---|---|
| `server.py` | HTTP plumbing: threaded server, method dispatch, route registry | routes, core, utils |
| `api/v1/routes/` | URL parsing, method dispatch, request → controller, response shaping | controllers, utils/response |
| `api/v1/controllers/` | Business logic: validation, DB operations, guards | core/db |
| `core/db.py` | SQLite connection, schema, migrations, row→dict conversion | — |
| `utils/response.py` | Single JSON + CORS response builder | — |

The whole server has **zero third-party dependencies** — only Python's standard
library (`http.server`, `sqlite3`, `json`, `urllib`).

---

## Directory Structure

```
backend/
├── server.py                       # Entry point — starts the threaded HTTP server
├── api/
│   ├── __init__.py
│   └── v1/                         # Versioned API (v1)
│       ├── __init__.py             # Re-exports route registrars
│       ├── routes/
│       │   ├── __init__.py
│       │   └── profile_routes.py   # /api/profile — URL parse + GET/POST dispatch
│       └── controllers/
│           ├── __init__.py
│           └── profile_controller.py  # Business logic: get/upsert profile
├── core/
│   ├── __init__.py
│   └── db.py                       # SQLite connection, schema, migrations, seed
└── utils/
    ├── __init__.py
    └── response.py                 # ok() / created() / error() / no_content()
```

**Conventions:**

- `api/v1/routes/` — one file per resource, named `<resource>_routes.py`
- `api/v1/controllers/` — one file per resource, named `<resource>_controller.py`
- Every directory is a package (`__init__.py` present)
- No business logic in `server.py`; no SQL in routes; no response-writing in controllers

---

## Running the Server

```bash
# from the repo root
python3 backend/server.py            # → listens on 0.0.0.0:5000
python3 backend/server.py 8080       # custom port
```

On start the server:

1. **Initialises the database** (`core/db.init_db()`):
   - creates tables if missing
   - seeds a blank profile (EIIN `130430`) on a brand-new database
   - runs **idempotent migrations** (adds missing columns to older DBs)
2. Prints the base URL: `SQL API: http://localhost:5000/api/profile?eiin=130430`
3. Serves requests on a **threaded** HTTP/1.1 server (`ThreadingMixIn`),
   so concurrent requests never block each other.

Requires **Python 3.8+** (uses `socketserver.ThreadingMixIn`; works on 3.13).

---

## Request Lifecycle

```
Browser / curl
   │  GET /api/profile?eiin=130430
   ▼
Handler._dispatch()              (server.py)
   │  method = GET, path = /api/profile
   │  OPTIONS? → res.no_content()  (CORS preflight)
   ▼
profile_routes.register_profile_routes(handler, 'GET', '/api/profile')
   │  path starts with /api/profile? → handled here
   │  dispatch on method:
   ▼
handle_get()                     (profile_routes.py)
   │  parse eiin from query string
   ▼
profile_controller.get_profile(eiin)      (controller)
   │  core/db.get_db() → SELECT … → profile_to_dict()
   ▼
res.ok(handler, profile)         (utils/response.py)
   │  JSON-encode + CORS headers + Content-Length
   ▼
HTTP 200 { ...profile document... }
```

Unknown paths fall through to `res.error(handler, 404, "Not found")`.

---

## API Reference

### `GET /api/profile?eiin=130430`

Returns the full institute profile document (or `404` when the EIIN does not exist).

**Query params**

| Param | Default | Description |
|---|---|---|
| `eiin` | `130430` | Institute's EIIN (11-digit code) |

**Response `200 OK`** — profile document:

```json
{
  "eiin": "130430",
  "institute_name_bn": "",
  "institute_name_en": "Sofir Uddin High School and College",
  "institute_logo": "https://i.ibb.co/.../logo.jpg",
  "classifications": [
    {
      "institute_type": "School & College - স্কুল এন্ড কলেজ",
      "groups": ["Science - বিজ্ঞান", "Arts - কলা"],
      "mpo_status": true,
      "mpo_code": "12345",
      "mpo_date": "2024-06-15"
    }
  ],
  "founder_name": "",
  "establishment_date": "1993-04-14",
  "parliamentary_constituency": "",
  "division_id": "5",
  "district_id": "36",
  "upazila_id": "281",
  "union_id": "2518",
  "village_road_holding_no": "",
  "post_office": "",
  "post_code": "",
  "institute_phone": "",
  "institute_email": "",
  "website": "",
  "student_type": "",
  "shift_count": "",
  "has_english_version": 0,
  "management": "",
  "board_institute_code": "",
  "technical_board_code": "",
  "mpo_code": "",
  "technical_branch_mpo_code": "",
  "stipend_code": "",
  "staff_male": 0,
  "staff_female": 0,
  "staff_mpo_male": 0,
  "staff_mpo_female": 0,
  "staff_nonmpo_male": 0,
  "staff_nonmpo_female": 0,
  "bank_name": "",
  "bank_branch": "",
  "bank_account_type": "",
  "bank_account_holder": "",
  "bank_account_number": "",
  "bank_account_purpose": "",
  "updated_at": "2026-08-06 23:09:36",
  "committee_members": [
    {
      "id": 1,
      "profile_id": 1,
      "member_name": "Rahim Uddin",
      "joining_date": "2024-01-15",
      "phone": "01712345678",
      "gender": "Male - পুরুষ",
      "committee_position": "President - সভাপতি",
      "education_qualification": "",
      "occupation": "",
      "left_committee": 0,
      "reason_for_leaving": ""
    }
  ],
  "facilities": {
    "play_ground": true,
    "electricity": true,
    "tubewell": true,
    "tap": true,
    "transport": false,
    "auditorium": false,
    "gas": false,
    "canteen": false,
    "audio_sound": true,
    "health_aid": true,
    "gymnasium": true,
    "audio_visual": true,
    "television": false,
    "boundary_wall": false,
    "solar_panel": true
  }
}
```

**Error `404`** — unknown EIIN:

```json
{ "error": "Not found" }
```

### `POST /api/profile?eiin=130430`

Creates or **upserts** (insert-or-update) the profile document. Sending the same
profile twice updates it rather than creating a duplicate.

**Request body** — any subset of the profile document above. Examples:

```json
{
  "institute_name_en": "Sofir Uddin High School and College",
  "classifications": [
    {
      "institute_type": "School & College - স্কুল এন্ড কলেজ",
      "groups": ["Science - বিজ্ঞান"],
      "mpo_status": true,
      "mpo_code": "12345",
      "mpo_date": "2024-06-15"
    }
  ],
  "facilities": { "play_ground": true, "electricity": false },
  "committee_members": [
    {
      "member_name": "Rahim Uddin",
      "joining_date": "2024-01-15",
      "phone": "01712345678",
      "gender": "Male - পুরুষ",
      "committee_position": "President - সভাপতি",
      "left_committee": false
    }
  ]
}
```

**Response `200 OK`**:

```json
{ "ok": true }
```

**Behaviour notes**

| Body key | Behaviour |
|---|---|
| scalar text fields | stored as-is (`TEXT`) |
| `classifications` | must be a JSON **array**; stored as JSON text, parsed back to an array on GET |
| boolean fields (`has_english_version`, `general_mpo`, `tech_mpo`) | truthy → `1`, falsy → `0` |
| numeric fields (staff counts, post code) | coerced with `int()`; empty → `0` |
| `facilities` | **guard:** only replaced when the body sends a non-empty object. A payload *without* `facilities` (older client) preserves existing rows — prevents accidental data wipe |
| `committee_members` | replaced wholesale (delete + re-insert) |

### `OPTIONS /api/profile`

CORS preflight — returns `204` with the CORS headers. The SPA never needs this
explicitly; browsers send it automatically for cross-origin requests.

---

## Data Model (SQLite)

File: **`school.db`** at the repo root (created automatically).

```
institute_profiles            committee_members              facilities
┌───────────────────────┐    ┌──────────────────────────┐   ┌──────────────────────────┐
│ id (PK)               │    │ id (PK)                  │   │ profile_id (FK, PK)      │
│ eiin (UNIQUE)         │1──◄┼ profile_id (FK)          │   │ facility_key (PK)        │
│ institute_name_bn/en  │    │ member_name, joining_date│   │ enabled (0/1)            │
│ institute_logo        │    │ phone, gender            │   └──────────────────────────┘
│ classifications (JSON)│    │ committee_position       │
│ founder_name, est_date│    │ education_qualification  │
│ parliamentary_...     │    │ occupation               │
│ division/district/    │    │ left_committee (0/1)     │
│  upazila/union_id     │    │ reason_for_leaving       │
│ village/post_office/  │    └──────────────────────────┘
│  post_code            │
│ institute_phone/email/│
│  website              │
│ student_type, shift   │
│ has_english_version,  │
│  management           │
│ eiin, board/tech/     │
│  mpo/stipend codes    │
│ general/tech mpo      │
│ staff_* counts        │
│ secondary/higher mpo  │
│ bank_* fields         │
│ updated_at            │
└───────────────────────┘
```

**Notes:**

- `facilities` uses a composite primary key `(profile_id, facility_key)` with
  `ON DELETE CASCADE` — deleting a profile cleans up its children.
- `classifications` is stored as a **JSON text column**; the server parses it
  to an array on read and serializes it on write.
- Booleans are stored as `0`/`1` integers.
- `updated_at` is maintained automatically with `datetime('now')` on every upsert.

---

## Code Structure & Conventions

### Response helper — `backend/utils/response.py`

**Every** HTTP response flows through this module so format + CORS stay
consistent. Use these in routes:

```python
res.ok(handler, profile)          # 200 + JSON body
res.created(handler, obj)         # 201
res.error(handler, 404, "Not found")   # any code + {"error": msg}
res.no_content(handler)           # 204 (OPTIONS preflight)
```

Behaviour: JSON-encodes with `ensure_ascii=False` (Bengali preserved), adds
`Content-Type: application/json`, CORS headers, and `Content-Length`.

### Routes — `backend/api/v1/routes/profile_routes.py`

Routes handle **transport only**: parse the URL, read the body, call the
controller, shape the response. A registrar function per resource:

```python
def register_profile_routes(handler, method, path) -> bool:
    """Return True when this resource handled the request."""
    if not path.startswith("/api/profile"):
        return False
    if method == "GET":
        handle_get(handler)
    elif method == "POST":
        handle_post(handler)
    else:
        res.error(handler, 405, "Method not allowed")
    return True
```

### Controllers — `backend/api/v1/controllers/profile_controller.py`

Controllers own the **business logic**: `get_profile(eiin)` and
`upsert_profile(eiin, body)`, plus private helpers `_normalize_values`,
`_replace_committee`, `_replace_facilities`. No HTTP knowledge — they take
plain values and return plain values.

### Database — `backend/core/db.py`

- `get_db()` — connection with `row_factory = sqlite3.Row` + WAL mode
- `init_db()` — schema creation, seed, migrations (idempotent)
- `profile_to_dict(row, conn)` — row + related tables → plain dict

**Migrations** are additive `ALTER TABLE … ADD COLUMN` statements guarded by a
`PRAGMA table_info` check, run on every server start:

```python
cols = [r[1] for r in conn.execute("PRAGMA table_info(institute_profiles)").fetchall()]
if "classifications" not in cols:
    conn.execute("ALTER TABLE institute_profiles ADD COLUMN classifications TEXT DEFAULT '[]'")
```

---

## Adding a New Resource

Adding e.g. `/api/students` takes **4 small files**:

```
backend/api/v1/controllers/student_controller.py   # business logic
backend/api/v1/routes/student_routes.py            # URL + method dispatch
```

```python
# student_controller.py
from backend.core.db import get_db

def list_students(school_id):
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM students WHERE school_id=?", (school_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
```

```python
# student_routes.py
from backend.api.v1.controllers import student_controller
from backend.utils import response as res

def register_student_routes(handler, method, path):
    if not path.startswith("/api/students"):
        return False
    if method == "GET":
        res.ok(handler, {"students": student_controller.list_students(1)})
    else:
        res.error(handler, 405, "Method not allowed")
    return True
```

Then **register the route** in `server.py`:

```python
from backend.api.v1.routes import profile_routes, student_routes

if profile_routes.register_profile_routes(self, method, path):
    return True
if student_routes.register_student_routes(self, method, path):
    return True
```

And (optionally) add the table to `core/db.py`. Done — new resource inherits
the same CORS, error format and threading automatically.

---

## Frontend Integration

The frontend talks to this API through `src/composables/useInstituteProfile.ts`:

```ts
const API_BASE = 'http://localhost:5000'

export async function loadProfile(): Promise<Record<string, any> | null> {
  const res = await fetch(`${API_BASE}/api/profile?eiin=130430`)
  if (!res.ok) return null
  return await res.json()
}

export async function saveProfile(form) {
  const res = await fetch(`${API_BASE}/api/profile?eiin=${form.eiin || '130430'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
  return res.ok
}
```

> ⚠️ **Hosting note:** `API_BASE` is currently hardcoded to `localhost:5000`.
> Before any hosted deployment, replace it with an env var
> (`import.meta.env.VITE_API_BASE_URL`) so the SPA can point at the real server.

---

## Error Handling & CORS

- **JSON always:** every response (including errors) is `application/json` with
  a stable shape: `{"ok": true}` or `{"error": "message"}`.
- **CORS:** `Access-Control-Allow-Origin: *` (dev-friendly) with
  `GET, POST, OPTIONS` allowed methods and `Content-Type` allowed header.
- **Unknown resources** → `404 {"error": "Not found"}`
- **Unknown methods** on a known resource → `405 {"error": "Method not allowed"}`
- **Controller exceptions** on save are caught in the route and returned as
  `500 {"error": "Save failed: …"}` (the transaction is rolled back).

---

## Backup & Migrations

**Backup** (SQLite makes this trivial):

```bash
# safe online backup (VACUUM INTO produces a compact consistent copy)
sqlite3 school.db "VACUUM INTO 'school_backup.db'"

# or simply copy the file (stop the server first for a 100% clean copy)
cp school.db school_backup.db
```

**Migrations** are automatic and idempotent — just update `core/db.py`:

```python
if "new_column" not in cols:
    conn.execute("ALTER TABLE institute_profiles ADD COLUMN new_column TEXT DEFAULT ''")
```

Every server start applies any pending migrations, so deployments never need a
manual "run migrations" step.

---

## Deployment Notes

| Target | Works? | Notes |
|---|---|---|
| Local dev (`python3 backend/server.py`) | ✅ | Primary use today |
| Small VPS (Hetzner/DigitalOcean/Railway/Render) | ✅ | SQLite file persists on disk; fine for 1–5 schools |
| Vercel / serverless | ⚠️ **No** | Serverless has **no persistent filesystem** — the `school.db` file cannot survive between requests. Needs a hosted DB (Postgres/MySQL) or a VPS |

Before hosting:

1. Make `API_BASE` configurable (`VITE_API_BASE_URL`) in `useInstituteProfile.ts`
2. Consider running the server behind a reverse proxy (nginx/Caddy) for TLS
3. Decide on the data store (see roadmap)

---

## Future Roadmap

The project's navigation (5 roles, 104 institute-admin sub-menus, multi-tenant
"Active tenants"/"Revenue" modules) points at a **SaaS-style multi-school
architecture**. Recommended evolution path:

```
Phase 1 (now)      SQLite + local Python server        ← works, zero-ops
Phase 2 (pilot)    SQLite on a small VPS               ← 1–5 schools
Phase 3 (SaaS)     PostgreSQL + Supabase/Neon/RDS      ← multi-tenant
```

The current layering makes Phase 3 low-cost: all SQL lives in
`core/db.py` + controllers with parameterized queries, so porting to
PostgreSQL is mostly a connector swap — the routes, response format and
frontend stay unchanged.
