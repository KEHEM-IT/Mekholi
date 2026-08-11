# backend/api/v1/controllers/student_controller.py
"""Business logic for the Students resource.

Handles listing, retrieving, creating, updating, deleting, and bulk importing
student records in SQLite.
"""

import json
from backend.core.db import get_db

FIELDS = [
    "student_id", "candidate_name", "candidate_name_bn", "guardian_name",
    "father_name", "father_nid", "mother_name", "mother_nid",
    "present_address", "permanent_address",
    "phone", "email", "academic_year_id", "class_name", "section_name", "roll_no",
    "gender", "date_of_birth", "blood_group", "religion", "stipend_eligible",
    "stipend_mfs_provider", "stipend_mfs_number", "government_uid",
    "behavior_points", "is_active", "photo", "birth_certificate",
    "stipend_type", "stipend_amount", "stipend_frequency", "stipend_status", "stipend_criteria",
]
BOOLEAN_FIELDS = ("is_active", "stipend_eligible")


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    try:
        vals["academic_year_id"] = int(body.get("academic_year_id") or 0)
    except (TypeError, ValueError):
        vals["academic_year_id"] = 0
    try:
        vals["stipend_amount"] = float(body.get("stipend_amount") or 0.0)
    except (TypeError, ValueError):
        vals["stipend_amount"] = 0.0
    try:
        vals["roll_no"] = int(body.get("roll_no") or 0)
    except (TypeError, ValueError):
        vals["roll_no"] = 0
    try:
        vals["behavior_points"] = int(body.get("behavior_points") or 100)
    except (TypeError, ValueError):
        vals["behavior_points"] = 100

    vals["id"] = item_id
    return vals


def list_students():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM students ORDER BY class_name ASC, roll_no ASC, id DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_student(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM students WHERE id=?", (item_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_student(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        
        # Generate clean student_id if not provided
        if not vals["student_id"]:
            year = conn.execute("SELECT year_name FROM academic_years WHERE id=?", (vals["academic_year_id"],)).fetchone()
            year_str = year["year_name"] if year else "2026"
            
            # Find last count
            last = conn.execute("SELECT id FROM students ORDER BY id DESC LIMIT 1").fetchone()
            count = last["id"] + 1 if last else 1
            vals["student_id"] = f"STD-{year_str}-{str(count).zfill(4)}"
            
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO students ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_student(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM students WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE students SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_student(item_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM students WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def import_students(items):
    """Bulk import with cross-check: a row whose student_id already exists is skipped;
    only new rows are inserted.

    Returns {"inserted": [new ids], "skipped": [names of matched rows]}.
    """
    conn = get_db()
    try:
        inserted, skipped = [], []
        for body in items:
            vals = _normalize(body)
            if not vals["student_id"]:
                continue
                
            found = conn.execute(
                "SELECT id FROM students WHERE TRIM(student_id) = TRIM(?) COLLATE NOCASE",
                (vals["student_id"],),
            ).fetchone()
            if found:
                skipped.append(vals["student_id"])
                continue
                
            fields = list(vals.keys())
            cols = ", ".join(fields)
            phs = ", ".join(f":{k}" for k in fields)
            conn.execute(f"INSERT INTO students ({cols}) VALUES ({phs})", vals)
            new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            inserted.append(new_id)
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def list_promotion_history():
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM promotion_history ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_promotion_history(data):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO promotion_history (student_id, candidate_name, source_class, target_class, "
            "source_year, target_year, promotion_type, roll_no, destination_branch, tc_no, remarks) "
            "VALUES (:student_id, :candidate_name, :source_class, :target_class, "
            ":source_year, :target_year, :promotion_type, :roll_no, :destination_branch, :tc_no, :remarks)",
            data
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
