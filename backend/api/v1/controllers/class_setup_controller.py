# backend/api/v1/controllers/class_setup_controller.py
"""Business logic for the Class / Section / Group / Shift resources."""

import json

from backend.core.db import get_db

# Entity → fields (list/dict fields are JSON-serialized)
ENTITIES = {
    "classes": {
        "fields": ["class_name", "class_name_bn", "phase", "sort_order",
                   "academic_year_id", "branch_id", "is_active"],
        "json_fields": [],
        "order": "sort_order ASC, id ASC",
    },
    "sections": {
        "fields": ["section_name", "section_name_bn", "class_id", "shift_id",
                   "capacity", "room_id", "is_active"],
        "json_fields": [],
        "order": "class_id ASC, id ASC",
    },
    "groups": {
        "fields": ["group_name", "group_name_bn", "class_ids", "version",
                   "group_type", "is_active"],
        "json_fields": ["class_ids"],
        "order": "group_name ASC, id ASC",
    },
    "shifts": {
        "fields": ["shift_name", "shift_name_bn", "start_time", "end_time", "is_active"],
        "json_fields": [],
        "order": "id ASC",
    },
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
    if "is_active" in vals:
        vals["is_active"] = 1 if body.get("is_active") else 0
    if "sort_order" in vals:
        vals["sort_order"] = int(body.get("sort_order") or 0)
    if "capacity" in vals:
        vals["capacity"] = int(body.get("capacity") or 0)
    vals["id"] = item_id
    return vals


def list_items(entity):
    spec = ENTITIES[entity]
    conn = get_db()
    try:
        rows = conn.execute(f"SELECT * FROM {entity} ORDER BY {spec['order']}").fetchall()
        out = []
        for r in rows:
            d = dict(r)
            for f in spec["json_fields"]:
                try:
                    d[f] = json.loads(d.get(f) or "[]")
                except json.JSONDecodeError:
                    d[f] = []
            out.append(d)
        return out
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
