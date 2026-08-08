# backend/core/db.py
"""Database layer — connection handling + lightweight migrations.

The SQLite file lives at the repo root (school.db). Migrations are idempotent
so older databases upgrade in place on server start.
"""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "school.db"

# Facilities inserted when a brand-new profile is seeded.
DEFAULT_FACILITY_KEYS = [
    "play_ground", "electricity", "tubewell", "tap", "transport",
    "auditorium", "gas", "canteen", "audio_sound", "health_aid",
    "gymnasium", "audio_visual", "television", "boundary_wall", "solar_panel",
]


def get_db():
    """Open a connection with row access by name."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _migrate(conn):
    """Add any missing columns introduced after the original schema."""
    cols = [r[1] for r in conn.execute("PRAGMA table_info(institute_profiles)").fetchall()]
    if "institute_logo" not in cols:
        conn.execute("ALTER TABLE institute_profiles ADD COLUMN institute_logo TEXT DEFAULT ''")
        print("SQL: migrated institute_profiles — added institute_logo column")
    if "classifications" not in cols:
        conn.execute("ALTER TABLE institute_profiles ADD COLUMN classifications TEXT DEFAULT '[]'")
        print("SQL: migrated institute_profiles — added classifications column")
    if "staff_total" not in cols:
        # Staff model v2: Total / Male / Female / MPO / Non-MPO.
        # Female & Non-MPO are derived on the frontend but stored for history.
        conn.execute("ALTER TABLE institute_profiles ADD COLUMN staff_total INTEGER DEFAULT 0")
        conn.execute("ALTER TABLE institute_profiles ADD COLUMN staff_mpo INTEGER DEFAULT 0")
        conn.execute("ALTER TABLE institute_profiles ADD COLUMN staff_nonmpo INTEGER DEFAULT 0")
        # Backfill from the legacy 6-column split (Male/Female × MPO/Non-MPO).
        conn.execute(
            "UPDATE institute_profiles SET "
            "staff_total = staff_male + staff_female, "
            "staff_mpo = staff_mpo_male + staff_mpo_female, "
            "staff_nonmpo = staff_nonmpo_male + staff_nonmpo_female"
        )
        print("SQL: migrated institute_profiles — staff model v2 (total/mpo/nonmpo) + backfill")


def init_db():
    """Create tables if missing, seed a blank profile, run migrations."""
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS institute_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            eiin TEXT UNIQUE NOT NULL,
            institute_name_bn TEXT DEFAULT '', institute_name_en TEXT DEFAULT '',
            institute_logo TEXT DEFAULT '',
            classifications TEXT DEFAULT '[]',
            founder_name TEXT DEFAULT '', establishment_date TEXT DEFAULT '',
            parliamentary_constituency TEXT DEFAULT '',
            division_id TEXT DEFAULT '', district_id TEXT DEFAULT '',
            upazila_id TEXT DEFAULT '', union_id TEXT DEFAULT '',
            village_road_holding_no TEXT DEFAULT '',
            post_office TEXT DEFAULT '', post_code TEXT DEFAULT '',
            institute_phone TEXT DEFAULT '', institute_email TEXT DEFAULT '',
            website TEXT DEFAULT '',
            institute_type TEXT DEFAULT '', attached_technical_branch_type TEXT DEFAULT '',
            group_field TEXT DEFAULT '', student_type TEXT DEFAULT '',
            shift_count TEXT DEFAULT '',
            has_english_version INTEGER DEFAULT 0, management TEXT DEFAULT '',
            board_institute_code TEXT DEFAULT '', technical_board_code TEXT DEFAULT '',
            mpo_code TEXT DEFAULT '', technical_branch_mpo_code TEXT DEFAULT '',
            stipend_code TEXT DEFAULT '',
            general_mpo INTEGER DEFAULT 0, general_mpo_code TEXT DEFAULT '',
            tech_mpo INTEGER DEFAULT 0, tech_mpo_code TEXT DEFAULT '',
            staff_male INTEGER DEFAULT 0, staff_female INTEGER DEFAULT 0,
            staff_mpo_male INTEGER DEFAULT 0, staff_mpo_female INTEGER DEFAULT 0,
            staff_nonmpo_male INTEGER DEFAULT 0, staff_nonmpo_female INTEGER DEFAULT 0,
            staff_total INTEGER DEFAULT 0, staff_mpo INTEGER DEFAULT 0,
            staff_nonmpo INTEGER DEFAULT 0,
            secondary_mpo_date TEXT DEFAULT '', secondary_mpo_code TEXT DEFAULT '',
            higher_secondary_mpo_date TEXT DEFAULT '', higher_secondary_mpo_code TEXT DEFAULT '',
            bank_name TEXT DEFAULT '', bank_branch TEXT DEFAULT '',
            bank_account_type TEXT DEFAULT '', bank_account_holder TEXT DEFAULT '',
            bank_account_number TEXT DEFAULT '', bank_account_purpose TEXT DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS committee_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES institute_profiles(id) ON DELETE CASCADE,
            member_name TEXT DEFAULT '', joining_date TEXT DEFAULT '',
            phone TEXT DEFAULT '', gender TEXT DEFAULT '',
            committee_position TEXT DEFAULT '', education_qualification TEXT DEFAULT '',
            occupation TEXT DEFAULT '',
            left_committee INTEGER DEFAULT 0, reason_for_leaving TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS facilities (
            profile_id INTEGER NOT NULL REFERENCES institute_profiles(id) ON DELETE CASCADE,
            facility_key TEXT NOT NULL, enabled INTEGER DEFAULT 0,
            PRIMARY KEY (profile_id, facility_key)
        );
        CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_name TEXT DEFAULT '', branch_name_bn TEXT DEFAULT '',
            branch_code TEXT DEFAULT '', campus_type TEXT DEFAULT 'Main',
            is_main INTEGER DEFAULT 0,
            logo TEXT DEFAULT '',
            division_id TEXT DEFAULT '', district_id TEXT DEFAULT '',
            upazila_id TEXT DEFAULT '', union_id TEXT DEFAULT '',
            village_road_holding_no TEXT DEFAULT '',
            post_office TEXT DEFAULT '', post_code TEXT DEFAULT '',
            phone TEXT DEFAULT '', email TEXT DEFAULT '', website TEXT DEFAULT '',
            head_name TEXT DEFAULT '', head_designation TEXT DEFAULT '',
            head_phone TEXT DEFAULT '', head_email TEXT DEFAULT '',
            eiin TEXT DEFAULT '', board TEXT DEFAULT '',
            institute_type TEXT DEFAULT '', shift TEXT DEFAULT '',
            established_date TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1, admission_open INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS academic_years (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year_name TEXT DEFAULT '', year_name_bn TEXT DEFAULT '',
            start_date TEXT DEFAULT '', end_date TEXT DEFAULT '',
            reg_start TEXT DEFAULT '', reg_end TEXT DEFAULT '',
            is_current INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            remarks TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT DEFAULT '', class_name_bn TEXT DEFAULT '',
            phase TEXT DEFAULT '', sort_order INTEGER DEFAULT 0,
            academic_year_id INTEGER DEFAULT 0, branch_id INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_name TEXT DEFAULT '', section_name_bn TEXT DEFAULT '',
            class_id INTEGER DEFAULT 0, shift_id INTEGER DEFAULT 0,
            capacity INTEGER DEFAULT 0, room_id INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_name TEXT DEFAULT '', group_name_bn TEXT DEFAULT '',
            class_ids TEXT DEFAULT '[]', version TEXT DEFAULT '',
            group_type TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_name TEXT DEFAULT '', shift_name_bn TEXT DEFAULT '',
            start_time TEXT DEFAULT '', end_time TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- Weekly working calendar (one row per day of the week)
        CREATE TABLE IF NOT EXISTS working_days (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week TEXT DEFAULT '',
            is_working INTEGER DEFAULT 1,
            open_time TEXT DEFAULT '', close_time TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- One-off / recurring closed days + special working days
        CREATE TABLE IF NOT EXISTS holidays (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            holiday_name TEXT DEFAULT '', holiday_name_bn TEXT DEFAULT '',
            date_from TEXT DEFAULT '', date_to TEXT DEFAULT '',
            holiday_type TEXT DEFAULT '',
            is_recurring INTEGER DEFAULT 0,
            is_working_override INTEGER DEFAULT 0,
            branch_id INTEGER DEFAULT 0,
            remarks TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- Grading schemes: a named set of grade rows + scale (GPA/percentage/
        -- pass-fail), assigned to class levels. Grade rows live in the `grades`
        -- JSON column (same repeatable-row pattern as `classifications`).
        CREATE TABLE IF NOT EXISTS grading_schemes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scheme_name TEXT DEFAULT '', scheme_name_bn TEXT DEFAULT '',
            grading_type TEXT DEFAULT '',
            class_level_ids TEXT DEFAULT '[]',
            board_id TEXT DEFAULT '',
            pass_marks INTEGER DEFAULT 0,
            grades TEXT DEFAULT '[]',
            is_default INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- Boards & regulatory authorities: the registry of external boards
        -- the institute reports to + per-board regulatory info (recognition/
        -- registration/MPO). Institute-type mapping lives in
        -- `institute_type_ids` (JSON, from institute_types.json).
        CREATE TABLE IF NOT EXISTS boards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            board_name TEXT DEFAULT '', board_name_bn TEXT DEFAULT '',
            board_code TEXT DEFAULT '', board_type TEXT DEFAULT '',
            institute_type_ids TEXT DEFAULT '[]',
            website TEXT DEFAULT '', contact TEXT DEFAULT '', address TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            regulatory TEXT DEFAULT '{}',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    """)

    # Seed a blank profile so the API always has something to return.
    if conn.execute("SELECT COUNT(*) FROM institute_profiles").fetchone()[0] == 0:
        conn.execute("INSERT INTO institute_profiles (eiin) VALUES ('130430')")
        pid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        for key in DEFAULT_FACILITY_KEYS:
            conn.execute(
                "INSERT INTO facilities (profile_id,facility_key,enabled) VALUES (?,?,0)",
                (pid, key),
            )
        print("SQL: seeded blank profile (EIIN: 130430)")

    _migrate(conn)
    conn.commit()
    conn.close()


def profile_to_dict(row, conn):
    """Convert a profile row + related tables into a plain JSON-able dict."""
    d = dict(row)
    d["committee_members"] = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM committee_members WHERE profile_id=? ORDER BY id",
            (d["id"],),
        ).fetchall()
    ]
    rows = conn.execute(
        "SELECT facility_key, enabled FROM facilities WHERE profile_id=?",
        (d["id"],),
    ).fetchall()
    d["facilities"] = {r["facility_key"]: bool(r["enabled"]) for r in rows}
    try:
        d["classifications"] = json.loads(d.get("classifications") or "[]")
    except (json.JSONDecodeError, TypeError):
        d["classifications"] = []
    del d["id"]
    return d
