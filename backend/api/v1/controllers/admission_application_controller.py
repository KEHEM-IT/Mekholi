# backend/api/v1/controllers/admission_application_controller.py
"""Business logic for the Admission Applications resource.

Handles listing, retrieving, creating, updating, deleting, and bulk importing
admission applications submitted by candidates.
"""

import json
from backend.core.db import get_db

FIELDS = [
    "application_no", "candidate_name", "candidate_name_bn", "guardian_name",
    "phone", "email", "academic_year_id", "desired_class", "version", "shift",
    "previous_school", "country", "nationality", "photo", "birth_certificate",
    "payment_status", "payment_method", "payment_transaction_id",
    "application_status", "viva_marks", "written_marks", "remarks",
    "verification_status", "verification_checklist",
]


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    try:
        vals["academic_year_id"] = int(body.get("academic_year_id") or 0)
    except (TypeError, ValueError):
        vals["academic_year_id"] = 0
    try:
        vals["viva_marks"] = float(body.get("viva_marks") or 0.0)
    except (TypeError, ValueError):
        vals["viva_marks"] = 0.0
    try:
        vals["written_marks"] = float(body.get("written_marks") or 0.0)
    except (TypeError, ValueError):
        vals["written_marks"] = 0.0

    if not vals["nationality"]:
        vals["nationality"] = "Bangladeshi"
    if not vals["country"]:
        vals["country"] = "Bangladesh"
    if not vals["payment_status"]:
        vals["payment_status"] = "Pending"
    if not vals["application_status"]:
        vals["application_status"] = "Submitted"
    if not vals["verification_status"]:
        vals["verification_status"] = "Unverified"
        
    val = body.get("verification_checklist")
    if isinstance(val, dict):
        vals["verification_checklist"] = json.dumps(val)
    elif isinstance(val, str):
        vals["verification_checklist"] = val
    else:
        vals["verification_checklist"] = "{}"

    vals["id"] = item_id
    return vals


def list_applications():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM admission_applications ORDER BY application_no DESC, id DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_application(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM admission_applications WHERE id=?", (item_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_application(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        # Generate an application number if not provided
        if not vals["application_no"]:
            year = conn.execute("SELECT year_name FROM academic_years WHERE id=?", (vals["academic_year_id"],)).fetchone()
            year_str = year["year_name"] if year else "2026"
            
            # Find last count
            last = conn.execute("SELECT id FROM admission_applications ORDER BY id DESC LIMIT 1").fetchone()
            count = last["id"] + 1 if last else 1
            vals["application_no"] = f"APP-{year_str}-{String(count).padStart(4, '0')}"
            
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO admission_applications ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_application(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM admission_applications WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE admission_applications SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_application(item_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM admission_applications WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def import_applications(items):
    """Bulk import with cross-check: a row whose application_no already exists is skipped;
    only new rows are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            if not vals["application_no"]:
                continue
                
            found = conn.execute(
                "SELECT id FROM admission_applications WHERE TRIM(application_no) = TRIM(?) COLLATE NOCASE",
                (vals["application_no"],),
            ).fetchone()
            if found:
                skipped.append(vals["application_no"])
                continue
                
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO admission_applications ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
