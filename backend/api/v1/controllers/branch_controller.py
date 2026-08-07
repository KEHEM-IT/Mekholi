# backend/api/v1/controllers/branch_controller.py
"""Business logic for the branches/campus resource (multi-campus support)."""

from backend.core.db import get_db

BRANCH_FIELDS = [
    "branch_name", "branch_name_bn", "branch_code", "campus_type", "is_main",
    "logo", "division_id", "district_id", "upazila_id", "union_id",
    "village_road_holding_no", "post_office", "post_code",
    "phone", "email", "website",
    "head_name", "head_designation", "head_phone", "head_email",
    "eiin", "board", "institute_type", "shift",
    "established_date", "is_active", "admission_open",
]

BOOLEAN_FIELDS = ("is_main", "is_active", "admission_open")


def _normalize(body, branch_id=None):
    vals = {f: body.get(f, "") for f in BRANCH_FIELDS}
    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    vals["id"] = branch_id
    return vals


def list_branches():
    """Return all branches, main branch first, then by name."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM branches ORDER BY is_main DESC, branch_name ASC, id ASC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_branch(branch_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM branches WHERE id=?", (branch_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_branch(body):
    """Insert a new branch; when is_main=1, demote other branches first."""
    conn = get_db()
    try:
        vals = _normalize(body)
        if vals["is_main"]:
            conn.execute("UPDATE branches SET is_main=0")
        cols = ", ".join(BRANCH_FIELDS + ["created_at", "updated_at"])
        phs = ", ".join(f":{k}" for k in BRANCH_FIELDS) + ", datetime('now'), datetime('now')"
        conn.execute(
            f"INSERT INTO branches ({cols}) VALUES ({phs})",
            vals,
        )
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_branch(branch_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM branches WHERE id=?", (branch_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, branch_id)
        if vals["is_main"]:
            conn.execute("UPDATE branches SET is_main=0 WHERE id<>?", (branch_id,))
        assignments = ", ".join(f"{f}=:{f}" for f in BRANCH_FIELDS)
        conn.execute(
            f"UPDATE branches SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_branch(branch_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM branches WHERE id=?", (branch_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
