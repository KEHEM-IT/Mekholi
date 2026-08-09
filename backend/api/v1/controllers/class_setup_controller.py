# backend/api/v1/controllers/class_setup_controller.py
"""Business logic for the Class / Section / Group / Shift resources."""

import json

from backend.core.db import get_db

# Entity → fields (list/dict fields are JSON-serialized)
ENTITIES = {
    "classes": {
        "fields": ["class_name", "class_name_bn", "phase", "sort_order",
                   "academic_year_id", "branch_id", "intake_capacity",
                   "quota_general", "quota_freedom_fighter", "quota_disabled",
                   "quota_staff", "is_active"],
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

# Natural business keys used by import to decide "does this already exist?".
#  - "text" → case-insensitive trimmed comparison
#  - "int"  → numeric equality (a blank value matches rows where it is NULL/'')
# A row in the import file is a duplicate when ALL its key parts match an
# existing record; duplicates are skipped, only genuinely new rows are stored.
MATCH_KEYS = {
    "classes": [("class_name", "text"), ("academic_year_id", "int"), ("branch_id", "int")],
    "sections": [("section_name", "text"), ("class_id", "int"), ("shift_id", "int")],
    "groups": [("group_name", "text")],
    "shifts": [("shift_name", "text")],
}

NAME_FIELD = {
    "classes": "class_name",
    "sections": "section_name",
    "groups": "group_name",
    "shifts": "shift_name",
}


def _match_clause(entity, vals):
    """Build a WHERE clause that finds an existing record matching `vals`."""
    clauses, params = [], []
    for field, kind in MATCH_KEYS[entity]:
        v = vals.get(field)
        is_empty = v is None or v == "" or v == "[]"
        if is_empty:
            clauses.append(f"({field} IS NULL OR {field} = '')")
        elif kind == "text":
            clauses.append(f"TRIM({field}) = TRIM(?) COLLATE NOCASE")
            params.append(v)
        else:
            clauses.append(f"{field} = ?")
            params.append(int(v))
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
    if "intake_capacity" in vals:
        vals["intake_capacity"] = int(body.get("intake_capacity") or 40)
    if "quota_general" in vals:
        vals["quota_general"] = int(body.get("quota_general") or 80)
    if "quota_freedom_fighter" in vals:
        vals["quota_freedom_fighter"] = int(body.get("quota_freedom_fighter") or 10)
    if "quota_disabled" in vals:
        vals["quota_disabled"] = int(body.get("quota_disabled") or 5)
    if "quota_staff" in vals:
        vals["quota_staff"] = int(body.get("quota_staff") or 5)
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
