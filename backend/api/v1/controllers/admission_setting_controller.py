# backend/api/v1/controllers/admission_setting_controller.py
"""Business logic for the Admission Settings resource.

Manages saving and retrieving global admission calendar settings, default fees,
payment gateway credentials, age restrictions, and bilingual terms and conditions.
"""

import json
from backend.core.db import get_db

FIELDS = [
    "academic_year_id", "open_date", "close_date", "application_fee",
    "age_limits", "payment_credentials", "terms_en", "terms_bn", "is_active",
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

    # Handle JSON fields safely
    for jfield in ("age_limits", "payment_credentials"):
        val = body.get(jfield)
        if isinstance(val, (dict, list)):
            vals[jfield] = json.dumps(val)
        elif isinstance(val, str):
            vals[jfield] = val
        else:
            vals[jfield] = "{}"

    vals["id"] = item_id
    return vals


def get_settings():
    """Retrieve the primary admission settings configuration (row 1). Create one if missing."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM admission_settings ORDER BY id ASC LIMIT 1").fetchone()
        if not row:
            # Seed a default
            conn.execute(
                "INSERT INTO admission_settings (status, is_active) VALUES ('Draft', 1)"
            )
            conn.commit()
            row = conn.execute("SELECT * FROM admission_settings ORDER BY id ASC LIMIT 1").fetchone()
            
        d = dict(row)
        # Parse JSON fields back
        try:
            d["age_limits"] = json.loads(d["age_limits"] or "{}")
        except Exception:
            d["age_limits"] = {}
        try:
            d["payment_credentials"] = json.loads(d["payment_credentials"] or "{}")
        except Exception:
            d["payment_credentials"] = {}
            
        return d
    finally:
        conn.close()


def save_settings(body):
    """Save/update the primary admission settings configuration."""
    conn = get_db()
    try:
        row = conn.execute("SELECT id FROM admission_settings ORDER BY id ASC LIMIT 1").fetchone()
        vals = _normalize(body)
        
        if row:
            item_id = row["id"]
            vals["id"] = item_id
            assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
            conn.execute(
                f"UPDATE admission_settings SET {assignments}, updated_at=datetime('now') WHERE id=:id",
                vals,
            )
        else:
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO admission_settings ({cols}) VALUES ({phs})", vals)
            
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
