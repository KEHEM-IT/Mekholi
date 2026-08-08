# backend/api/v1/controllers/academic_session_controller.py
"""Business logic for the Academic Sessions & Terms resource.

A session term = one row: session name + academic year + term (name, order,
dates) + is_current + result type. Exams, fees and promotion reference these.
"""

import json

from backend.core.db import get_db

FIELDS = [
    "session_name", "session_name_bn", "academic_year_id", "term_name",
    "term_name_bn", "term_order", "term_start", "term_end",
    "is_current", "result_type", "is_active",
]
BOOLEAN_FIELDS = ("is_current", "is_active")


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    try:
        vals["academic_year_id"] = int(body.get("academic_year_id") or 0)
    except (TypeError, ValueError):
        vals["academic_year_id"] = 0
    try:
        vals["term_order"] = int(body.get("term_order") or 0)
    except (TypeError, ValueError):
        vals["term_order"] = 0
    vals["id"] = item_id
    return vals


def list_sessions():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM academic_sessions ORDER BY session_name ASC, term_order ASC, id ASC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_session(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM academic_sessions WHERE id=?", (item_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_session(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        if vals["is_current"]:
            conn.execute("UPDATE academic_sessions SET is_current=0")
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO academic_sessions ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_session(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM academic_sessions WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        if vals["is_current"]:
            conn.execute("UPDATE academic_sessions SET is_current=0 WHERE id<>?", (item_id,))
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE academic_sessions SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_session(item_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM academic_sessions WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def import_sessions(items):
    """Bulk import with cross-check: a row whose session_name + term_name
    already exist is skipped; only new rows are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            found = conn.execute(
                "SELECT id FROM academic_sessions WHERE TRIM(session_name) = TRIM(?) COLLATE NOCASE"
                " AND TRIM(term_name) = TRIM(?) COLLATE NOCASE",
                (vals["session_name"], vals["term_name"]),
            ).fetchone()
            if found:
                skipped.append(f"{vals['session_name']} / {vals['term_name']}".strip(" /"))
                continue
            if vals["is_current"]:
                conn.execute("UPDATE academic_sessions SET is_current=0")
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO academic_sessions ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
