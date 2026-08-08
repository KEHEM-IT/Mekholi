# backend/api/v1/controllers/admission_test_controller.py
"""Business logic for the Admission Tests resource.

Handles listing, retrieving, creating, updating, deleting, and bulk importing
admission test schedules.
"""

import json
from backend.core.db import get_db

FIELDS = [
    "test_name", "test_name_bn", "academic_year_id", "class_name",
    "test_date", "start_time", "end_time", "room_id",
    "has_written", "has_mcq", "has_viva",
    "max_written_marks", "max_mcq_marks", "max_viva_marks", "is_active",
]
BOOLEAN_FIELDS = ("is_active", "has_written", "has_mcq", "has_viva")


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    try:
        vals["academic_year_id"] = int(body.get("academic_year_id") or 0)
    except (TypeError, ValueError):
        vals["academic_year_id"] = 0
    try:
        vals["room_id"] = int(body.get("room_id") or 0)
    except (TypeError, ValueError):
        vals["room_id"] = 0
    try:
        vals["max_written_marks"] = float(body.get("max_written_marks") or 0.0)
    except (TypeError, ValueError):
        vals["max_written_marks"] = 0.0
    try:
        vals["max_mcq_marks"] = float(body.get("max_mcq_marks") or 0.0)
    except (TypeError, ValueError):
        vals["max_mcq_marks"] = 0.0
    try:
        vals["max_viva_marks"] = float(body.get("max_viva_marks") or 0.0)
    except (TypeError, ValueError):
        vals["max_viva_marks"] = 0.0

    vals["id"] = item_id
    return vals


def list_tests():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM admission_tests ORDER BY test_date ASC, id ASC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_test(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM admission_tests WHERE id=?", (item_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_test(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO admission_tests ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_test(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM admission_tests WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE admission_tests SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_test(item_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM admission_tests WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def import_tests(items):
    """Bulk import with cross-check: a row whose test_name already exists is skipped;
    only new rows are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            if not vals["test_name"]:
                continue
                
            found = conn.execute(
                "SELECT id FROM admission_tests WHERE TRIM(test_name) = TRIM(?) COLLATE NOCASE",
                (vals["test_name"],),
            ).fetchone()
            if found:
                skipped.append(vals["test_name"])
                continue
                
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO admission_tests ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
