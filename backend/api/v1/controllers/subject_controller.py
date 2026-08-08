# backend/api/v1/controllers/subject_controller.py
"""Business logic for the Subjects & Curriculum resource.

A subject = the catalogue entry per board × group × version, with a JSON
list of per-class marks-distribution rows:
  [{ class_id, full_marks_theory, full_marks_practical, full_marks_ca,
     pass_marks, periods_week, book_names }]
"""

import json

from backend.core.db import get_db

FIELDS = [
    "subject_name", "subject_code", "subject_type", "board_id", "group_id",
    "version", "class_level_ids", "marks_distribution", "is_builtin", "is_active",
]
JSON_FIELDS = ("class_level_ids", "marks_distribution")
BOOLEAN_FIELDS = ("is_builtin", "is_active")


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
    for n in ("board_id", "group_id"):
        try:
            vals[n] = int(body.get(n) or 0)
        except (TypeError, ValueError):
            vals[n] = 0
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


def list_subjects():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM subjects ORDER BY subject_name ASC, id ASC"
        ).fetchall()
        return [_decode(r) for r in rows]
    finally:
        conn.close()


def get_subject(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM subjects WHERE id=?", (item_id,)).fetchone()
        return _decode(row) if row else None
    finally:
        conn.close()


def create_subject(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO subjects ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_subject(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM subjects WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE subjects SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_subject(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT is_builtin FROM subjects WHERE id=?", (item_id,)).fetchone()
        if not row:
            return False
        # Built-in BD curriculum subjects are part of the registry — never deletable.
        if row["is_builtin"]:
            raise PermissionError("Built-in subjects cannot be deleted")
        cur = conn.execute("DELETE FROM subjects WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    except PermissionError:
        raise
    finally:
        conn.close()


def import_subjects(items):
    """Bulk import with cross-check: a subject whose name already exists for
    the same board is skipped; only new rows are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            found = conn.execute(
                "SELECT id FROM subjects WHERE TRIM(subject_name) = TRIM(?) COLLATE NOCASE AND board_id = ?",
                (vals["subject_name"], vals["board_id"]),
            ).fetchone()
            if found:
                skipped.append(str(vals["subject_name"] or ""))
                continue
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO subjects ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
