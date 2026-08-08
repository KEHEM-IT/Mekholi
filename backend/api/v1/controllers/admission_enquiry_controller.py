# backend/api/v1/controllers/admission_enquiry_controller.py
"""Business logic for the Admission Enquiries resource.

Handles listing, retrieving, creating, updating, deleting, and bulk importing
admission enquiries (leads/enquiries) in both national and international formats.
"""

import json
from backend.core.db import get_db

FIELDS = [
    "candidate_name", "candidate_name_bn", "guardian_name", "phone",
    "email", "academic_year_id", "desired_class", "version", "shift",
    "previous_school", "nationality", "country", "enquiry_date",
    "source", "status", "remarks", "is_active",
]
BOOLEAN_FIELDS = ("is_active",)


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    try:
        vals["academic_year_id"] = int(body.get("academic_year_id") or 0)
    except (TypeError, ValueError):
        vals["academic_year_id"] = 0
    
    # Sensible defaults for national/international
    if not vals["nationality"]:
        vals["nationality"] = "Bangladeshi"
    if not vals["country"]:
        vals["country"] = "Bangladesh"
    if not vals["source"]:
        vals["source"] = "Walk-in"
    if not vals["status"]:
        vals["status"] = "New"
        
    vals["id"] = item_id
    return vals


def list_enquiries():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM admission_enquiries ORDER BY enquiry_date DESC, id DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_enquiry(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM admission_enquiries WHERE id=?", (item_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_enquiry(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO admission_enquiries ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_enquiry(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM admission_enquiries WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE admission_enquiries SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_enquiry(item_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM admission_enquiries WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def import_enquiries(items):
    """Bulk import with cross-check: a row whose candidate_name + phone already
    exist is skipped; only new rows are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            # Match by candidate name and phone
            found = conn.execute(
                "SELECT id FROM admission_enquiries "
                "WHERE TRIM(candidate_name) = TRIM(?) COLLATE NOCASE "
                "AND TRIM(phone) = TRIM(?)",
                (vals["candidate_name"], vals["phone"]),
            ).fetchone()
            if found:
                skipped.append(f"{vals['candidate_name']} ({vals['phone']})")
                continue
                
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO admission_enquiries ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
