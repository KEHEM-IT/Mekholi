# backend/api/v1/controllers/exam_term_controller.py
"""Business logic for the Exam Terms & Types resource.

An exam term = which exams happen when, for which classes, under which
board's rules, with which grading scheme. `class_ids` is a JSON list.
"""

import json

from backend.core.db import get_db

FIELDS = [
    "exam_name", "exam_name_bn", "exam_type", "board_id", "term_id",
    "class_ids", "scheme_id", "exam_start", "exam_end",
    "publish_to_portal", "is_board_exam", "is_builtin", "is_active",
]
JSON_FIELDS = ("class_ids",)
BOOLEAN_FIELDS = ("publish_to_portal", "is_board_exam", "is_builtin", "is_active")


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
    for n in ("board_id", "term_id", "scheme_id"):
        try:
            vals[n] = int(body.get(n) or 0)
        except (TypeError, ValueError):
            vals[n] = 0
    vals["id"] = item_id
    return vals


def _decode(row):
    d = dict(row)
    try:
        d["class_ids"] = json.loads(d.get("class_ids") or "[]")
    except json.JSONDecodeError:
        d["class_ids"] = []
    return d


def list_exams():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM exam_terms ORDER BY exam_name ASC, id ASC"
        ).fetchall()
        return [_decode(r) for r in rows]
    finally:
        conn.close()


def get_exam(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM exam_terms WHERE id=?", (item_id,)).fetchone()
        return _decode(row) if row else None
    finally:
        conn.close()


def create_exam(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO exam_terms ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_exam(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM exam_terms WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE exam_terms SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_exam(item_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM exam_terms WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def import_exams(items):
    """Bulk import with cross-check: an exam whose name already exists is
    skipped; only new rows are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            found = conn.execute(
                "SELECT id FROM exam_terms WHERE TRIM(exam_name) = TRIM(?) COLLATE NOCASE",
                (vals["exam_name"],),
            ).fetchone()
            if found:
                skipped.append(str(vals["exam_name"] or ""))
                continue
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO exam_terms ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
