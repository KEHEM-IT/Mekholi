# backend/api/v1/controllers/room_controller.py
"""Business logic for Classrooms / Rooms / Buildings resources.

Two entities share this controller:
  - buildings : building registry (name/code/floors)
  - rooms     : rooms inside buildings (no, floor, type, capacity,
                facilities JSON list, status Active/Maintenance)
"""

import json

from backend.core.db import get_db

ENTITIES = {
    "buildings": {
        "fields": ["building_name", "building_name_bn", "building_code",
                   "floor_count", "is_active"],
        "json_fields": [],
        "bool_fields": ["is_active"],
        "int_fields": ["floor_count"],
        "order": "building_name ASC, id ASC",
    },
    "rooms": {
        "fields": ["room_no", "room_no_bn", "building_id", "floor_no",
                   "room_type", "capacity", "facilities", "status", "is_active"],
        "json_fields": ["facilities"],
        "bool_fields": ["is_active"],
        "int_fields": ["building_id", "floor_no", "capacity"],
        "order": "building_id ASC, floor_no ASC, room_no ASC, id ASC",
    },
}

# Match keys used by import to decide "does this already exist?".
MATCH_KEYS = {
    "buildings": [("building_code", "text")],
    "rooms": [("room_no", "text"), ("building_id", "int")],
}

NAME_FIELD = {
    "buildings": "building_name",
    "rooms": "room_no",
}


def _normalize(entity, body, item_id=None):
    spec = ENTITIES[entity]
    vals = {f: body.get(f, "") for f in spec["fields"]}
    for f in spec["json_fields"]:
        v = vals.get(f)
        if isinstance(v, (list, dict)):
            vals[f] = json.dumps(v, ensure_ascii=False)
        elif not v:
            vals[f] = "[]"
    for b in spec["bool_fields"]:
        vals[b] = 1 if body.get(b) else 0
    for n in spec["int_fields"]:
        try:
            vals[n] = int(body.get(n) or 0)
        except (TypeError, ValueError):
            vals[n] = 0
    if entity == "rooms" and not vals.get("status"):
        vals["status"] = "Active"
    vals["id"] = item_id
    return vals


def _decode(entity, row):
    d = dict(row)
    for f in ENTITIES[entity]["json_fields"]:
        try:
            d[f] = json.loads(d.get(f) or "[]")
        except json.JSONDecodeError:
            d[f] = []
    return d


def list_items(entity):
    spec = ENTITIES[entity]
    conn = get_db()
    try:
        rows = conn.execute(
            f"SELECT * FROM {entity} ORDER BY {spec['order']}"
        ).fetchall()
        return [_decode(entity, r) for r in rows]
    finally:
        conn.close()


def get_item(entity, item_id):
    conn = get_db()
    try:
        row = conn.execute(f"SELECT * FROM {entity} WHERE id=?", (item_id,)).fetchone()
        return _decode(entity, row) if row else None
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
