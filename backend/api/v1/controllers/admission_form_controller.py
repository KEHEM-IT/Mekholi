# backend/api/v1/controllers/admission_form_controller.py
"""Business logic for the Admission Form Builder resource.

Manages saving and retrieving the online admission form configuration,
fields toggle configurations, payment gateway mappings, and custom fields.
"""

import json
from backend.core.db import get_db

FIELDS = [
    "form_title", "form_title_bn", "academic_year_id", "application_fee",
    "open_date", "close_date", "fields_config", "custom_fields",
    "status", "instructions", "instructions_bn", "is_active",
]


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    vals["is_active"] = 1 if body.get("is_active") else 0
    try:
        vals["academic_year_id"] = int(body.get("academic_year_id") or 0)
    except (TypeError, ValueError):
        vals["academic_year_id"] = 0
    try:
        vals["application_fee"] = float(body.get("application_fee") or 0.0)
    except (TypeError, ValueError):
        vals["application_fee"] = 0.0

    # Handle JSON serializations safely
    for jfield in ("fields_config", "custom_fields"):
        val = body.get(jfield)
        if isinstance(val, (dict, list)):
            vals[jfield] = json.dumps(val)
        elif isinstance(val, str):
            vals[jfield] = val
        else:
            vals[jfield] = "[]" if jfield == "custom_fields" else "{}"

    vals["id"] = item_id
    return vals


def get_form():
    """Retrieve the primary admission form configuration (row 1). Create one if missing."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM admission_forms ORDER BY id ASC LIMIT 1").fetchone()
        if not row:
            # Seed a default
            conn.execute(
                "INSERT INTO admission_forms (form_title, form_title_bn, status, is_active) "
                "VALUES ('Online Admission Form', 'অনলাইন ভর্তি ফরম', 'Draft', 1)"
            )
            conn.commit()
            row = conn.execute("SELECT * FROM admission_forms ORDER BY id ASC LIMIT 1").fetchone()
            
        d = dict(row)
        # Parse JSON fields back
        try:
            d["fields_config"] = json.loads(d["fields_config"] or "{}")
        except Exception:
            d["fields_config"] = {}
        try:
            d["custom_fields"] = json.loads(d["custom_fields"] or "[]")
        except Exception:
            d["custom_fields"] = []
            
        return d
    finally:
        conn.close()


def save_form(body):
    """Save/update the primary admission form configuration."""
    conn = get_db()
    try:
        row = conn.execute("SELECT id FROM admission_forms ORDER BY id ASC LIMIT 1").fetchone()
        vals = _normalize(body)
        
        if row:
            item_id = row["id"]
            vals["id"] = item_id
            assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
            conn.execute(
                f"UPDATE admission_forms SET {assignments}, updated_at=datetime('now') WHERE id=:id",
                vals,
            )
        else:
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO admission_forms ({cols}) VALUES ({phs})", vals)
            
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
