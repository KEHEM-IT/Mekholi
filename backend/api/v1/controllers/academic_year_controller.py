# backend/api/v1/controllers/academic_year_controller.py
"""Business logic for the academic year resource."""

from backend.core.db import get_db

FIELDS = [
    "year_name", "year_name_bn", "start_date", "end_date",
    "reg_start", "reg_end", "is_current", "is_active", "remarks",
]

BOOLEAN_FIELDS = ("is_current", "is_active")


def _normalize(body, year_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    vals["id"] = year_id
    return vals


def list_years():
    """All academic years, current first, then newest start date."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM academic_years ORDER BY is_current DESC, start_date DESC, id DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_year(year_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM academic_years WHERE id=?", (year_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_year(body):
    """Insert a new academic year; when is_current=1, demote others."""
    conn = get_db()
    try:
        vals = _normalize(body)
        if vals["is_current"]:
            conn.execute("UPDATE academic_years SET is_current=0")
        cols = ", ".join(FIELDS + ["created_at", "updated_at"])
        phs = ", ".join(f":{k}" for k in FIELDS) + ", datetime('now'), datetime('now')"
        conn.execute(f"INSERT INTO academic_years ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_year(year_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM academic_years WHERE id=?", (year_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, year_id)
        if vals["is_current"]:
            conn.execute("UPDATE academic_years SET is_current=0 WHERE id<>?", (year_id,))
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE academic_years SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_year(year_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM academic_years WHERE id=?", (year_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
