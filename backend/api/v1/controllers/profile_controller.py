# backend/api/v1/controllers/profile_controller.py
"""Business logic for the institute profile resource.

API Design:
  - Uses `id` (auto-increment PK) as the primary lookup key
  - EIIN is optional — works for private schools without EIIN
  - Falls back to id=1 (first institute) when no ID specified
"""

import json

from backend.core.db import get_db, profile_to_dict

# Scalar fields stored directly on institute_profiles.
PROFILE_FIELDS = [
    "institute_name_bn", "institute_name_en", "institute_logo",
    "classifications", "founder_name",
    "establishment_date", "parliamentary_constituency",
    "division_id", "district_id", "upazila_id", "union_id",
    "village_road_holding_no", "post_office", "post_code",
    "institute_phone", "institute_email", "website",
    "institute_type", "attached_technical_branch_type",
    "group_field", "student_type", "shift_count", "management",
    "board_institute_code", "technical_board_code",
    "mpo_code", "technical_branch_mpo_code", "stipend_code",
    "general_mpo_code", "tech_mpo_code",
    "secondary_mpo_date", "secondary_mpo_code",
    "higher_secondary_mpo_date", "higher_secondary_mpo_code",
    "bank_name", "bank_branch", "bank_account_type",
    "bank_account_holder", "bank_account_number", "bank_account_purpose",
]

BOOLEAN_FIELDS = ("has_english_version", "general_mpo", "tech_mpo")
NUMBER_FIELDS = (
    # Staff model v2: Total / Male / Female / MPO / Non-MPO
    "staff_total", "staff_male", "staff_female", "staff_mpo", "staff_nonmpo",
)


# ── ID-based lookups (primary API) ─────────────────────────────────────


def get_profile_by_id(institute_id):
    """Fetch a profile by ID (primary key), or None when it does not exist.
    
    This is the primary lookup method — works for all institutes
    regardless of whether they have an EIIN.
    """
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM institute_profiles WHERE id=?", (institute_id,)
        ).fetchone()
        return profile_to_dict(row, conn) if row else None
    finally:
        conn.close()


def get_card_info_by_id(institute_id):
    """Fetch only the fields needed for ID card generation (optimized).
    
    Returns institute_name_en and institute_logo only — avoids pulling
    the full profile (classifications, committee, facilities, bank, etc.)
    when all we need is the header block for ID cards.
    """
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT institute_name_en, institute_logo FROM institute_profiles WHERE id=?",
            (institute_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "institute_name_en": row["institute_name_en"] if row["institute_name_en"] else "",
            "institute_logo": row["institute_logo"] if row["institute_logo"] else "",
        }
    finally:
        conn.close()


def upsert_profile_by_id(institute_id, body):
    """Insert or update a profile (upsert) with its related tables.
    
    Uses ID as the primary key. Creates new profile if ID doesn't exist.
    """
    conn = get_db()
    try:
        # Check if profile with this ID exists
        existing = conn.execute(
            "SELECT id FROM institute_profiles WHERE id=?", (institute_id,)
        ).fetchone()
        
        vals = _normalize_values(body, institute_id)
        
        if existing:
            # Update existing profile
            set_clause = ", ".join(f"{k}=?" for k in vals.keys())
            set_clause += ", updated_at=datetime('now')"
            conn.execute(
                f"UPDATE institute_profiles SET {set_clause} WHERE id=?",
                (*vals.values(), institute_id),
            )
            pid = institute_id
        else:
            # Insert new profile
            cols = ", ".join(vals.keys())
            phs = ", ".join("?" for _ in vals)
            conn.execute(
                f"INSERT INTO institute_profiles ({cols}, id, updated_at) "
                f"VALUES ({phs}, ?, datetime('now'))",
                (*vals.values(), institute_id),
            )
            pid = institute_id

        _replace_committee(conn, pid, body.get("committee_members"))
        _replace_facilities(conn, pid, body.get("facilities"))
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── EIIN-based lookups (backward compatibility) ────────────────────────


def get_profile(eiin):
    """Fetch a profile by EIIN (legacy support).
    
    New code should use get_profile_by_id() instead.
    """
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM institute_profiles WHERE eiin=?", (eiin,)
        ).fetchone()
        return profile_to_dict(row, conn) if row else None
    finally:
        conn.close()


def get_card_info(eiin):
    """Fetch card info by EIIN (legacy support)."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT institute_name_en, institute_logo FROM institute_profiles WHERE eiin=?",
            (eiin,),
        ).fetchone()
        if row is None:
            return None
        return {
            "institute_name_en": row["institute_name_en"] if row["institute_name_en"] else "",
            "institute_logo": row["institute_logo"] if row["institute_logo"] else "",
        }
    finally:
        conn.close()


def upsert_profile(eiin, body):
    """Insert or update a profile by EIIN (legacy support)."""
    conn = get_db()
    try:
        vals = _normalize_values(body, eiin)
        cols = ", ".join(vals)
        phs = ", ".join(f":{k}" for k in vals)
        ups = ", ".join(f"{k}=excluded.{k}" for k in vals)
        conn.execute(
            f"INSERT INTO institute_profiles ({cols}, updated_at) "
            f"VALUES ({phs}, datetime('now')) "
            f"ON CONFLICT(eiin) DO UPDATE SET {ups}, updated_at=datetime('now')",
            vals,
        )
        pid = conn.execute(
            "SELECT id FROM institute_profiles WHERE eiin=?", (eiin,)
        ).fetchone()["id"]

        _replace_committee(conn, pid, body.get("committee_members"))
        _replace_facilities(conn, pid, body.get("facilities"))
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Shared helpers ──────────────────────────────────────────────────────


def _normalize_values(body, eiin):
    """Coerce the raw JSON body into DB-ready values."""
    vals = {f: body.get(f, "") for f in PROFILE_FIELDS}

    # classifications is a JSON array — store as text
    if isinstance(vals.get("classifications"), (list, dict)):
        vals["classifications"] = json.dumps(vals["classifications"], ensure_ascii=False)
    else:
        vals["classifications"] = "[]"

    for b in BOOLEAN_FIELDS:
        vals[b] = 1 if body.get(b) else 0
    for n in NUMBER_FIELDS:
        vals[n] = int(body.get(n) or 0)
    vals["eiin"] = eiin
    return vals


def _replace_committee(conn, pid, members):
    conn.execute("DELETE FROM committee_members WHERE profile_id=?", (pid,))
    for cm in members or []:
        conn.execute(
            """INSERT INTO committee_members
                (profile_id,member_name,joining_date,phone,gender,
                 committee_position,education_qualification,occupation,
                 left_committee,reason_for_leaving)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                pid,
                cm.get("member_name", ""), cm.get("joining_date", ""),
                cm.get("phone", ""), cm.get("gender", ""),
                cm.get("committee_position", ""), cm.get("education_qualification", ""),
                cm.get("occupation", ""), 1 if cm.get("left_committee") else 0,
                cm.get("reason_for_leaving", ""),
            ),
        )


def _replace_facilities(conn, pid, facilities_body):
    """Replace facilities only when the client actually sent a set.
    A missing/empty `facilities` key means an older client that doesn't
    manage facilities yet — wiping the table then would silently destroy
    existing data (delete-all + insert-nothing)."""
    if isinstance(facilities_body, dict) and facilities_body:
        conn.execute("DELETE FROM facilities WHERE profile_id=?", (pid,))
        for key, val in facilities_body.items():
            conn.execute(
                "INSERT INTO facilities (profile_id,facility_key,enabled) VALUES (?,?,?)",
                (pid, key, 1 if val else 0),
            )
