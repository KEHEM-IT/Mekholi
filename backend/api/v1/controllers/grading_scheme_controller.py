# backend/api/v1/controllers/grading_scheme_controller.py
"""Business logic for the grading scheme resource.

A grading scheme = a named set of grade rows + a scale (GPA 5.00, percentage,
pass/fail, CGPA 4.00) assigned to class levels. Grade rows and class-level
lists are stored as JSON columns (repeatable-row pattern, like
`classifications` on the institute profile).
"""

import json

from backend.core.db import get_db

FIELDS = [
    "scheme_name", "scheme_name_bn", "grading_type", "class_level_ids",
    "board_id", "pass_marks", "grades", "is_default", "is_active",
]
JSON_FIELDS = ("class_level_ids", "grades")
BOOLEAN_FIELDS = ("is_default", "is_active")


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    for f in JSON_FIELDS:
        v = vals.get(f)
        if isinstance(v, (list, dict)):
            vals[f] = json.dumps(v, ensure_ascii=False)
        elif not v:
            vals[f] = "[]"
    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    try:
        vals["pass_marks"] = int(body.get("pass_marks") or 0)
    except (TypeError, ValueError):
        vals["pass_marks"] = 0
    vals["id"] = item_id
    return vals


def _decode(row):
    d = dict(row)
    for f in JSON_FIELDS:
        try:
            d[f] = json.loads(d.get(f) or "[]")
        except json.JSONDecodeError:
            d[f] = []
    return d


def list_schemes():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM grading_schemes ORDER BY is_default DESC, scheme_name ASC, id ASC"
        ).fetchall()
        return [_decode(r) for r in rows]
    finally:
        conn.close()


def get_scheme(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM grading_schemes WHERE id=?", (item_id,)).fetchone()
        return _decode(row) if row else None
    finally:
        conn.close()


def create_scheme(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        if vals["is_default"]:
            conn.execute("UPDATE grading_schemes SET is_default=0")
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO grading_schemes ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_scheme(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM grading_schemes WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        if vals["is_default"]:
            conn.execute("UPDATE grading_schemes SET is_default=0 WHERE id<>?", (item_id,))
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE grading_schemes SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_scheme(item_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM grading_schemes WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def import_schemes(items):
    """Bulk import with cross-check: a scheme whose name already exists
    (case-insensitive) is skipped; only new schemes are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            found = conn.execute(
                "SELECT id FROM grading_schemes WHERE TRIM(scheme_name) = TRIM(?) COLLATE NOCASE",
                (vals["scheme_name"],),
            ).fetchone()
            if found:
                skipped.append(str(vals["scheme_name"] or ""))
                continue
            if vals["is_default"]:
                conn.execute("UPDATE grading_schemes SET is_default=0")
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO grading_schemes ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
