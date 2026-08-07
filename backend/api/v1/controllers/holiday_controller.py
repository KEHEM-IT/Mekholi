# backend/api/v1/controllers/holiday_controller.py
"""Business logic for Holidays & Working Days resources.

Two entities share this controller:
  - working_days : the weekly calendar (Sun..Sat, is_working, open/close time)
  - holidays     : one-off / recurring closed days + special working days
"""

from backend.core.db import get_db

ENTITIES = {
    "working_days": {
        "fields": ["day_of_week", "is_working", "open_time", "close_time", "is_active"],
        "bool_fields": ["is_working", "is_active"],
        "int_fields": [],
        "order": "id ASC",
    },
    "holidays": {
        "fields": ["holiday_name", "holiday_name_bn", "date_from", "date_to",
                   "holiday_type", "is_recurring", "is_working_override",
                   "branch_id", "remarks", "is_active"],
        "bool_fields": ["is_recurring", "is_working_override", "is_active"],
        "int_fields": ["branch_id"],
        "order": "date_from ASC, id ASC",
    },
}

# Natural business keys used by import to decide "does this already exist?".
# A row in the import file is a duplicate when ALL its key parts match an
# existing record; duplicates are skipped, only new rows are stored.
MATCH_KEYS = {
    "working_days": [("day_of_week", "text")],
    "holidays": [("holiday_name", "text"), ("date_from", "text")],
}

NAME_FIELD = {
    "working_days": "day_of_week",
    "holidays": "holiday_name",
}


def _normalize(entity, body, item_id=None):
    spec = ENTITIES[entity]
    vals = {f: body.get(f, "") for f in spec["fields"]}
    for b in spec["bool_fields"]:
        vals[b] = 1 if body.get(b) else 0
    for n in spec["int_fields"]:
        try:
            vals[n] = int(body.get(n) or 0)
        except (TypeError, ValueError):
            vals[n] = 0
    vals["id"] = item_id
    return vals


def list_items(entity):
    spec = ENTITIES[entity]
    conn = get_db()
    try:
        rows = conn.execute(
            f"SELECT * FROM {entity} ORDER BY {spec['order']}"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_item(entity, item_id):
    conn = get_db()
    try:
        row = conn.execute(f"SELECT * FROM {entity} WHERE id=?", (item_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_item(entity, body):
    conn = get_db()
    try:
        vals = _normalize(entity, body)
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO {entity} ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_item(entity, item_id, body):
    conn = get_db()
    try:
        existing = conn.execute(f"SELECT id FROM {entity} WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(entity, body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in ENTITIES[entity]["fields"])
        conn.execute(
            f"UPDATE {entity} SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_item(entity, item_id):
    conn = get_db()
    try:
        cur = conn.execute(f"DELETE FROM {entity} WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def _match_clause(entity, vals):
    clauses, params = [], []
    for field, kind in MATCH_KEYS[entity]:
        v = vals.get(field)
        is_empty = v is None or v == ""
        if is_empty:
            clauses.append(f"({field} IS NULL OR {field} = '')")
        elif kind == "text":
            clauses.append(f"TRIM({field}) = TRIM(?) COLLATE NOCASE")
            params.append(v)
        else:
            clauses.append(f"{field} = ?")
            params.append(v)
    return " AND ".join(clauses), params


def import_items(entity, items):
    """Bulk import with cross-check: existing matches are kept (skipped),
    only new rows are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(entity, body)
            where, params = _match_clause(entity, vals)
            found = conn.execute(
                f"SELECT id FROM {entity} WHERE {where}", params
            ).fetchone()
            if found:
                skipped.append(str(vals.get(NAME_FIELD[entity]) or ""))
                continue
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO {entity} ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
