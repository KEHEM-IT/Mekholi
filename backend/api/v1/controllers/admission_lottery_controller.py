# backend/api/v1/controllers/admission_lottery_controller.py
"""Business logic for the Admission Lottery Draw resource.

Handles listing, retrieving, executing, and deleting digital lottery draws,
mapping quota distributions, and persisting selected & waitlisted rosters.
"""

import json
from backend.core.db import get_db

FIELDS = [
    "academic_year_id", "class_name", "total_seats", "quota_config",
    "selected_applicant_ids", "waiting_applicant_ids", "draw_date",
    "is_published", "is_active",
]


def _normalize(body, item_id=None):
    vals = {f: body.get(f, "") for f in FIELDS}
    vals["is_published"] = 1 if body.get("is_published") else 0
    vals["is_active"] = 1 if body.get("is_active") else 0
    try:
        vals["academic_year_id"] = int(body.get("academic_year_id") or 0)
    except (TypeError, ValueError):
        vals["academic_year_id"] = 0
    try:
        vals["total_seats"] = int(body.get("total_seats") or 0)
    except (TypeError, ValueError):
        vals["total_seats"] = 0

    # Handle JSON fields safely
    for jfield in ("quota_config", "selected_applicant_ids", "waiting_applicant_ids"):
        val = body.get(jfield)
        if isinstance(val, (dict, list)):
            vals[jfield] = json.dumps(val)
        elif isinstance(val, str):
            vals[jfield] = val
        else:
            vals[jfield] = "[]" if jfield != "quota_config" else "{}"

    vals["id"] = item_id
    return vals


def list_lotteries():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM admission_lotteries ORDER BY draw_date DESC, id DESC"
        ).fetchall()
        
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["quota_config"] = json.loads(d["quota_config"] or "{}")
            except Exception:
                d["quota_config"] = {}
            try:
                d["selected_applicant_ids"] = json.loads(d["selected_applicant_ids"] or "[]")
            except Exception:
                d["selected_applicant_ids"] = []
            try:
                d["waiting_applicant_ids"] = json.loads(d["waiting_applicant_ids"] or "[]")
            except Exception:
                d["waiting_applicant_ids"] = []
            results.append(d)
            
        return results
    finally:
        conn.close()


def get_lottery(item_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM admission_lotteries WHERE id=?", (item_id,)).fetchone()
        if not row:
            return None
        d = dict(row)
        try:
            d["quota_config"] = json.loads(d["quota_config"] or "{}")
        except Exception:
            d["quota_config"] = {}
        try:
            d["selected_applicant_ids"] = json.loads(d["selected_applicant_ids"] or "[]")
        except Exception:
            d["selected_applicant_ids"] = []
        try:
            d["waiting_applicant_ids"] = json.loads(d["waiting_applicant_ids"] or "[]")
        except Exception:
            d["waiting_applicant_ids"] = []
        return d
    finally:
        conn.close()


def create_lottery(body):
    conn = get_db()
    try:
        vals = _normalize(body)
        fields = list(vals.keys())
        cols = ", ".join(fields)
        phs = ", ".join(f":{k}" for k in fields)
        conn.execute(f"INSERT INTO admission_lotteries ({cols}) VALUES ({phs})", vals)
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_lottery(item_id, body):
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM admission_lotteries WHERE id=?", (item_id,)).fetchone()
        if not existing:
            return False
        vals = _normalize(body, item_id)
        assignments = ", ".join(f"{f}=:{f}" for f in FIELDS)
        conn.execute(
            f"UPDATE admission_lotteries SET {assignments}, updated_at=datetime('now') WHERE id=:id",
            vals,
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_lottery(item_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM admission_lotteries WHERE id=?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
