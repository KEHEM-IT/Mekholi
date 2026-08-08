# backend/api/v1/controllers/board_controller.py
"""Business logic for the Board & Regulatory Setup resource.

A board = an external authority the institute reports to (Sylhet Board,
Madrasah Board, BTEB, National University …) plus its regulatory block
(recognition / registration / MPO). The institute-type mapping lives in
`institute_type_ids` (JSON list of ids from institute_types.json) and the
regulatory block is a JSON object.
"""

import json

from backend.core.db import get_db

FIELDS = [
    "board_name", "board_name_bn", "board_code", "board_type",
    "institute_type_ids", "website", "contact", "address", "remarks",
    "regulatory", "is_builtin", "is_active",
]
JSON_FIELDS = ("institute_type_ids", "regulatory")
BOOLEAN_FIELDS = ("is_builtin", "is_active")

DEFAULT_REGULATORY = {
    "recognition_no": "",
    "recognition_date": "",
    "registration_no": "",
    "mpo_no": "",
    "document": "",
}


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    for f in JSON_FIELDS:
        v = vals.get(f)
        if isinstance(v, (list, dict)):
            vals[f] = json.dumps(v, ensure_ascii=False)
        elif not v:
            vals[f] = "[]" if f == "institute_type_ids" else "{}"
    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    vals["id"] = item_id
    return vals


def _decode(row):
    d = dict(row)
    try:
        d["institute_type_ids"] = json.loads(d.get("institute_type_ids") or "[]")
    except json.JSONDecodeError:
        d["institute_type_ids"] = []
    try:
        d["regulatory"] = json.loads(d.get("regulatory") or "{}")
    except json.JSONDecodeError:
        d["regulatory"] = {}
    # Fill missing regulatory keys so the form never sees undefined.
    reg = {**DEFAULT_REGULATORY, **d["regulatory"]}
    d["regulatory"] = reg
    return d


def list_boards():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM boards ORDER BY board_name ASC, id ASC"
        ).fetchall()
        return [_decode(r) for r in rows]
    finally:
        conn.close()


def get_board(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM boards WHERE id=?", (item_id,)).fetchone()
        return _decode(row) if row else None
    finally:
        conn.close()


def create_board(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO boards ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_board(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM boards WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE boards SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_board(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT is_builtin FROM boards WHERE id=?", (item_id,)).fetchone()
        if not row:
            return False
        # Built-in BD boards are part of the registry — never deletable.
        if row["is_builtin"]:
            raise PermissionError("Built-in boards cannot be deleted")
        cur = conn.execute("DELETE FROM boards WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    except PermissionError:
        raise
    finally:
        conn.close()


def import_boards(items):
    """Bulk import with cross-check: a board whose name already exists
    (case-insensitive) is skipped; only new boards are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            found = conn.execute(
                "SELECT id FROM boards WHERE TRIM(board_name) = TRIM(?) COLLATE NOCASE",
                (vals["board_name"],),
            ).fetchone()
            if found:
                skipped.append(str(vals["board_name"] or ""))
                continue
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO boards ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
