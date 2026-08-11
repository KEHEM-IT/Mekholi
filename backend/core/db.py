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
    conn.execute("PRAGMA foreign_keys = ON")
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

    # Boards: add is_builtin (protects the built-in BD board registry from
    # deletion). Safe to skip when the table doesn't exist yet.
    try:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(boards)").fetchall()]
        if cols and "is_builtin" not in cols:
            conn.execute("ALTER TABLE boards ADD COLUMN is_builtin INTEGER DEFAULT 0")
            print("SQL: migrated boards — added is_builtin column")
    except sqlite3.OperationalError:
        pass

    # Migrate admission_tests: add exam parameter options
    try:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(admission_tests)").fetchall()]
        if cols:
            if "has_written" not in cols:
                conn.execute("ALTER TABLE admission_tests ADD COLUMN has_written INTEGER DEFAULT 1")
            if "has_mcq" not in cols:
                conn.execute("ALTER TABLE admission_tests ADD COLUMN has_mcq INTEGER DEFAULT 0")
            if "has_viva" not in cols:
                conn.execute("ALTER TABLE admission_tests ADD COLUMN has_viva INTEGER DEFAULT 1")
            if "max_mcq_marks" not in cols:
                conn.execute("ALTER TABLE admission_tests ADD COLUMN max_mcq_marks REAL DEFAULT 100.0")
            print("SQL: migrated admission_tests — added has_written, has_mcq, has_viva, max_mcq_marks")
    except sqlite3.OperationalError:
        pass

    # Migrate admission_applications: add document verification fields
    try:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(admission_applications)").fetchall()]
        if cols:
            if "verification_status" not in cols:
                conn.execute("ALTER TABLE admission_applications ADD COLUMN verification_status TEXT DEFAULT 'Unverified'")
            if "verification_checklist" not in cols:
                conn.execute("ALTER TABLE admission_applications ADD COLUMN verification_checklist TEXT DEFAULT '{}'")
            print("SQL: migrated admission_applications — added verification_status and verification_checklist")
    except sqlite3.OperationalError:
        pass

    # Migrate classes: add intake capacity & quota parameters
    try:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(classes)").fetchall()]
        if cols:
            if "intake_capacity" not in cols:
                conn.execute("ALTER TABLE classes ADD COLUMN intake_capacity INTEGER DEFAULT 40")
            if "quota_general" not in cols:
                conn.execute("ALTER TABLE classes ADD COLUMN quota_general INTEGER DEFAULT 80")
            if "quota_freedom_fighter" not in cols:
                conn.execute("ALTER TABLE classes ADD COLUMN quota_freedom_fighter INTEGER DEFAULT 10")
            if "quota_disabled" not in cols:
                conn.execute("ALTER TABLE classes ADD COLUMN quota_disabled INTEGER DEFAULT 5")
            if "quota_staff" not in cols:
                conn.execute("ALTER TABLE classes ADD COLUMN quota_staff INTEGER DEFAULT 5")
            print("SQL: migrated classes — added intake_capacity and quota parameters")
    except sqlite3.OperationalError:
        pass

    # Migrate students: add advanced parent and address fields
    try:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(students)").fetchall()]
        if cols:
            if "father_name" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN father_name TEXT DEFAULT ''")
            if "father_nid" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN father_nid TEXT DEFAULT ''")
            if "mother_name" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN mother_name TEXT DEFAULT ''")
            if "mother_nid" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN mother_nid TEXT DEFAULT ''")
            if "present_address" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN present_address TEXT DEFAULT ''")
            if "permanent_address" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN permanent_address TEXT DEFAULT ''")
            if "stipend_type" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN stipend_type TEXT DEFAULT ''")
            if "stipend_amount" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN stipend_amount REAL DEFAULT 0.0")
            if "stipend_frequency" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN stipend_frequency TEXT DEFAULT 'Quarterly'")
            if "stipend_status" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN stipend_status TEXT DEFAULT 'Active'")
            if "stipend_criteria" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN stipend_criteria TEXT DEFAULT 'General'")
            if "photo" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN photo TEXT DEFAULT ''")
            if "birth_certificate" not in cols:
                conn.execute("ALTER TABLE students ADD COLUMN birth_certificate TEXT DEFAULT ''")
            print("SQL: migrated students — added father/mother names & NIDs + addresses + advanced stipend fields + photo & birth_certificate")
    except sqlite3.OperationalError:
        pass


# Built-in Bangladesh education boards (the official registry). Seeded once
# on server start; marked is_builtin=1 so they can't be deleted from the UI
# (users may still edit them or add their own boards).
# Board codes are the official SMS/result codes used across Bangladesh.
BUILTIN_BOARDS = [
    # 9 regional Boards of Intermediate & Secondary Education
    {
        "board_name": "Dhaka Board", "board_name_bn": "ঢাকা বোর্ড",
        "board_code": "DHA", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://dhakaeducationboard.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Dhaka",
    },
    {
        "board_name": "Rajshahi Board", "board_name_bn": "রাজশাহী বোর্ড",
        "board_code": "RAJ", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://rajshahiboard.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Rajshahi",
    },
    {
        "board_name": "Cumilla Board", "board_name_bn": "কুমিল্লা বোর্ড",
        "board_code": "COM", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://comillaboard.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Cumilla",
    },
    {
        "board_name": "Chattogram Board", "board_name_bn": "চট্টগ্রাম বোর্ড",
        "board_code": "CHI", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://bise-ctg.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Chattogram",
    },
    {
        "board_name": "Barishal Board", "board_name_bn": "বরিশাল বোর্ড",
        "board_code": "BAR", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://barisalboard.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Barishal",
    },
    {
        "board_name": "Jashore Board", "board_name_bn": "যশোর বোর্ড",
        "board_code": "JES", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://jessoreboard.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Jashore",
    },
    {
        "board_name": "Sylhet Board", "board_name_bn": "সিলেট বোর্ড",
        "board_code": "SYL", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://sylhetboard.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Sylhet",
    },
    {
        "board_name": "Dinajpur Board", "board_name_bn": "দিনাজপুর বোর্ড",
        "board_code": "DIN", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://dinajpurboard.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Dinajpur",
    },
    {
        "board_name": "Mymensingh Board", "board_name_bn": "ময়মনসিংহ বোর্ড",
        "board_code": "MYM", "board_type": "General Education",
        "institute_type_ids": [2, 3, 4, 17],
        "website": "https://mymensingheducationboard.gov.bd",
        "remarks": "Board of Intermediate & Secondary Education, Mymensingh",
    },
    # Specialized boards
    {
        "board_name": "Bangladesh Madrasah Education Board", "board_name_bn": "বাংলাদেশ মাদরাসা শিক্ষা বোর্ড",
        "board_code": "MAD", "board_type": "Madrasah Education",
        "institute_type_ids": [5, 6],
        "website": "https://ebmeb.gov.bd",
        "remarks": "Dakhil, Alim and higher madrasah examinations",
    },
    {
        "board_name": "Bangladesh Technical Education Board", "board_name_bn": "বাংলাদেশ কারিগরি শিক্ষা বোর্ড (বিটেব)",
        "board_code": "TEC", "board_type": "Technical (BTEB)",
        "institute_type_ids": [9, 10, 11, 12, 13, 14],
        "website": "https://bteb.gov.bd",
        "remarks": "SSC/HSC (Vocational), BM, Diploma in Engineering etc.",
    },
    # Higher-education authorities
    {
        "board_name": "National University", "board_name_bn": "জাতীয় বিশ্ববিদ্যালয়",
        "board_code": "NU", "board_type": "National University",
        "institute_type_ids": [17],
        "website": "https://nu.ac.bd",
        "remarks": "Degree (Pass) and Honours colleges",
    },
    {
        "board_name": "Islamic Arabic University", "board_name_bn": "ইসলামি আরবি বিশ্ববিদ্যালয়",
        "board_code": "IAU", "board_type": "University",
        "institute_type_ids": [7, 8],
        "website": "https://iau.edu.bd",
        "remarks": "Fazil and Kamil examinations",
    },
]


def _seed_academic_years(conn):
    """Seed a default academic year if the table is empty (makes foreign keys safe)."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM academic_years").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if count == 0:
        conn.execute(
            "INSERT INTO academic_years (year_name, year_name_bn, start_date, end_date, is_current, is_active) "
            "VALUES ('2026', '২০২৬', '2026-01-01', '2026-12-31', 1, 1)"
        )
        print("SQL: seeded default academic year — 2026")


def _seed_boards(conn):
    """Insert the built-in Bangladesh boards once (idempotent by name)."""
    try:
        conn.execute("SELECT 1 FROM boards LIMIT 1")
    except sqlite3.OperationalError:
        return  # boards table not created yet — nothing to seed
    for b in BUILTIN_BOARDS:
        found = conn.execute(
            "SELECT id FROM boards WHERE TRIM(board_name) = TRIM(?) COLLATE NOCASE",
            (b["board_name"],),
        ).fetchone()
        if found:
            continue
        conn.execute(
            "INSERT INTO boards (board_name, board_name_bn, board_code, board_type,"
            " institute_type_ids, website, remarks, regulatory, is_builtin, is_active)"
            " VALUES (:board_name, :board_name_bn, :board_code, :board_type,"
            " :institute_type_ids, :website, :remarks, '{}', 1, 1)",
            {
                **b,
                "institute_type_ids": json.dumps(b["institute_type_ids"]),
            },
        )
        print(f"SQL: seeded built-in board — {b['board_name']}")


# Built-in Bangladesh exam terms (standard BD exam calendar). Seeded once,
# marked is_builtin=1 so they can't be deleted from the UI (editable + users
# may add their own). Board resolved by name at seed time.
BUILTIN_EXAMS = [
    {"name": "Half Yearly", "bn": "অর্ধবার্ষিক", "type": "Academic", "board": "Dhaka Board"},
    {"name": "Annual Examination", "bn": "বার্ষিক পরীক্ষা", "type": "Academic", "board": "Dhaka Board"},
    {"name": "Pre-Test Examination", "bn": "প্রি-টেস্ট পরীক্ষা", "type": "Board Model", "board": "Dhaka Board"},
    {"name": "Test Examination", "bn": "টেস্ট পরীক্ষা", "type": "Board Model", "board": "Dhaka Board"},
    {"name": "Model Test", "bn": "মডেল টেস্ট", "type": "Mock", "board": "Dhaka Board"},
    {"name": "Board Final (SSC)", "bn": "বোর্ড ফাইনাল (এসএসসি)", "type": "Board Model", "board": "Dhaka Board"},
    {"name": "Board Final (HSC)", "bn": "বোর্ড ফাইনাল (এইচএসসি)", "type": "Board Model", "board": "Dhaka Board"},
    {"name": "Dakhil Examination", "bn": "দাখিল পরীক্ষা", "type": "Board Model", "board": "Bangladesh Madrasah Education Board"},
    {"name": "Alim Examination", "bn": "আলিম পরীক্ষা", "type": "Board Model", "board": "Bangladesh Madrasah Education Board"},
    {"name": "SSC (Vocational) Exam", "bn": "এসএসসি (ভোকেশনাল) পরীক্ষা", "type": "Board Model", "board": "Bangladesh Technical Education Board"},
    {"name": "HSC (Vocational) Exam", "bn": "এইচএসসি (ভোকেশনাল) পরীক্ষা", "type": "Board Model", "board": "Bangladesh Technical Education Board"},
    {"name": "Admission Test", "bn": "ভর্তি পরীক্ষা", "type": "Admission", "board": "Dhaka Board"},
]


# Default Bangladesh school infrastructure (common buildings + rooms).
# Seeded ONLY on empty tables, so rows the user deletes stay deleted
# (no resurrection on restart). Rooms reference buildings by code, resolved
# at seed time.
DEFAULT_BUILDINGS = [
    {"name": "Main Building", "bn": "মূল ভবন", "code": "BLK-01", "floors": 3},
    {"name": "Science Building", "bn": "বিজ্ঞান ভবন", "code": "BLK-02", "floors": 2},
    {"name": "Admin Building", "bn": "প্রশাসনিক ভবন", "code": "BLK-03", "floors": 1},
]

DEFAULT_ROOMS = [
    # (room_no, room_no_bn, building_code, floor, type, capacity, facilities, status)
    ("101", "", "BLK-01", 1, "Classroom", 50, ["projector", "whiteboard", "fan"], "Active"),
    ("102", "", "BLK-01", 1, "Classroom", 45, ["whiteboard", "fan"], "Active"),
    ("103", "", "BLK-01", 1, "Classroom", 40, ["projector", "ac", "whiteboard"], "Active"),
    ("201", "", "BLK-01", 2, "Classroom", 50, ["projector", "ac", "smartboard"], "Active"),
    ("202", "", "BLK-01", 2, "Classroom", 45, ["ac", "whiteboard"], "Active"),
    ("Staff Room", "", "BLK-01", 2, "Staff Room", 20, ["ac", "fan"], "Active"),
    ("Physics Lab", "পদার্থ ল্যাব", "BLK-02", 0, "Lab", 30, ["computer", "cctv"], "Active"),
    ("Chemistry Lab", "রসায়ন ল্যাব", "BLK-02", 0, "Lab", 30, ["cctv", "fan"], "Active"),
    ("Computer Lab", "কম্পিউটার ল্যাব", "BLK-02", 1, "Lab", 40, ["computer", "ac", "multimedia"], "Active"),
    ("Library", "লাইব্রেরি", "BLK-02", 1, "Library", 60, ["fan", "cctv"], "Active"),
    ("Principal Office", "প্রধান শিক্ষকের কক্ষ", "BLK-03", 0, "Office", 5, ["ac", "computer"], "Active"),
    ("Auditorium", "অডিটোরিয়াম", "BLK-01", 3, "Auditorium", 300, ["ac", "multimedia", "cctv"], "Maintenance"),
    ("Store Room", "গোদাম", "BLK-01", 0, "Store", 0, ["fan"], "Active"),
]


def _seed_buildings_rooms(conn):
    """Seed the default BD buildings + rooms ONLY on empty tables."""
    try:
        b_count = conn.execute("SELECT COUNT(*) FROM buildings").fetchone()[0]
    except sqlite3.OperationalError:
        return  # tables not created yet
    if b_count == 0:
        for b in DEFAULT_BUILDINGS:
            conn.execute(
                "INSERT INTO buildings (building_name, building_name_bn, building_code,"
                " floor_count, is_active) VALUES (?, ?, ?, ?, 1)",
                (b["name"], b["bn"], b["code"], b["floors"]),
            )
            print(f"SQL: seeded default building — {b['name']} ({b['code']})")
    try:
        r_count = conn.execute("SELECT COUNT(*) FROM rooms").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if r_count == 0:
        for (no, no_bn, code, floor, rtype, capacity, facilities, status) in DEFAULT_ROOMS:
            bld = conn.execute(
                "SELECT id FROM buildings WHERE TRIM(building_code) = TRIM(?) COLLATE NOCASE",
                (code,),
            ).fetchone()
            building_id = bld["id"] if bld else 0
            conn.execute(
                "INSERT INTO rooms (room_no, room_no_bn, building_id, floor_no, room_type,"
                " capacity, facilities, status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
                (no, no_bn, building_id, floor, rtype, capacity,
                 json.dumps(facilities), status),
            )
            print(f"SQL: seeded default room — {no} ({rtype}, {code})")


# Default BD academic sessions & terms (one row per term of a session).
# Seeded ONLY on an empty table, so rows the user deletes stay deleted.
# Academic year resolved by name at seed time.
DEFAULT_SESSIONS = [
    # (session_name, session_name_bn, year_name, term_name, term_name_bn, order, start, end, is_current, result_type)
    ("2026 Session", "২০২৬ সেশন", "2026", "Term 1", "প্রথম সাময়িক", 1, "2026-01-01", "2026-04-30", 0, "Annual"),
    ("2026 Session", "২০২৬ সেশন", "2026", "Term 2", "দ্বিতীয় সাময়িক", 2, "2026-05-01", "2026-08-31", 1, "Annual"),
    ("2026 Session", "২০২৬ সেশন", "2026", "Term 3", "তৃতীয় সাময়িক", 3, "2026-09-01", "2026-12-31", 0, "Annual"),
]


def _seed_academic_sessions(conn):
    """Seed the default BD sessions & terms ONLY on an empty table."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM academic_sessions").fetchone()[0]
    except sqlite3.OperationalError:
        return  # table not created yet
    if count > 0:
        return
    for (sname, sbn, year_name, tname, tbn, order, start, end, current, rtype) in DEFAULT_SESSIONS:
        year = conn.execute(
            "SELECT id FROM academic_years WHERE TRIM(year_name) = TRIM(?) COLLATE NOCASE",
            (year_name,),
        ).fetchone()
        year_id = year["id"] if year else 0
        conn.execute(
            "INSERT INTO academic_sessions (session_name, session_name_bn, academic_year_id,"
            " term_name, term_name_bn, term_order, term_start, term_end,"
            " is_current, result_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
            (sname, sbn, year_id, tname, tbn, order, start, end, current, rtype),
        )
        print(f"SQL: seeded default session term — {sname} / {tname}")


DEFAULT_ENQUIRIES = [
    {
        "candidate_name": "Mehedi Hasan", "candidate_name_bn": "মেহেদী হাসান",
        "guardian_name": "Abul Hasan", "phone": "01712345678", "email": "mehedi@gmail.com",
        "desired_class": "Class 9", "version": "Bangla Version", "shift": "Morning",
        "previous_school": "Rajshahi Government Lab School", "nationality": "Bangladeshi",
        "country": "Bangladesh", "enquiry_date": "2026-08-01", "source": "Walk-in", "status": "New",
        "remarks": "Wants to enroll in Science group."
    },
    {
        "candidate_name": "Zarah Ahmed", "candidate_name_bn": "জারা আহমেদ",
        "guardian_name": "Dr. Imtiaz Ahmed", "phone": "01819876543", "email": "zarah@gmail.com",
        "desired_class": "Class 6", "version": "English Version", "shift": "Day",
        "previous_school": "Scholastica School", "nationality": "Bangladeshi",
        "country": "Bangladesh", "enquiry_date": "2026-08-03", "source": "Website", "status": "Follow-up",
        "remarks": "Inquired about Cambridge curriculum compatibility."
    },
    {
        "candidate_name": "Siddharth Sharma", "candidate_name_bn": "",
        "guardian_name": "Rajesh Sharma", "phone": "+919876543210", "email": "sharma@example.com",
        "desired_class": "Class 11", "version": "English Version", "shift": "Day",
        "previous_school": "Delhi Public School", "nationality": "Indian",
        "country": "India", "enquiry_date": "2026-08-05", "source": "Phone Call", "status": "New",
        "remarks": "Wants hostel and transport facilities."
    },
    {
        "candidate_name": "John Doe", "candidate_name_bn": "",
        "guardian_name": "Robert Doe", "phone": "+15550199", "email": "robert.doe@example.com",
        "desired_class": "Class 10", "version": "English Version", "shift": "Day",
        "previous_school": "Boston High School", "nationality": "American",
        "country": "United States", "enquiry_date": "2026-08-06", "source": "Website", "status": "Converted",
        "remarks": "Admitted in Class 10. Documents verified."
    }
]


def _seed_admission_enquiries(conn):
    """Seed default national and international enquiries ONLY on a fresh/empty table."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM admission_enquiries").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if count > 0:
        return
    # Resolve first available academic year
    year = conn.execute("SELECT id FROM academic_years ORDER BY id DESC LIMIT 1").fetchone()
    year_id = year["id"] if year else 0
    
    for eq in DEFAULT_ENQUIRIES:
        conn.execute(
            "INSERT INTO admission_enquiries (candidate_name, candidate_name_bn, guardian_name,"
            " phone, email, academic_year_id, desired_class, version, shift, previous_school,"
            " nationality, country, enquiry_date, source, status, remarks, is_active)"
            " VALUES (:candidate_name, :candidate_name_bn, :guardian_name,"
            " :phone, :email, :academic_year_id, :desired_class, :version, :shift, :previous_school,"
            " :nationality, :country, :enquiry_date, :source, :status, :remarks, 1)",
            {**eq, "academic_year_id": year_id}
        )
        print(f"SQL: seeded default admission enquiry — {eq['candidate_name']}")


DEFAULT_FIELDS_CONFIG = {
    "candidate_name": {"visible": True, "required": True},
    "candidate_name_bn": {"visible": True, "required": False},
    "guardian_name": {"visible": True, "required": True},
    "phone": {"visible": True, "required": True},
    "email": {"visible": True, "required": False},
    "desired_class": {"visible": True, "required": True},
    "version": {"visible": True, "required": False},
    "shift": {"visible": True, "required": False},
    "previous_school": {"visible": True, "required": False},
    "country": {"visible": True, "required": False},
    "nationality": {"visible": True, "required": False},
    "photo": {"visible": True, "required": True},
    "birth_certificate": {"visible": True, "required": True}
}

DEFAULT_CUSTOM_FIELDS = [
    {"label": "Sports or Extracurricular Achievements", "type": "text", "required": False}
]


def _seed_admission_forms(conn):
    """Seed a default Admission Form builder template ONLY on an empty table."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM admission_forms").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if count > 0:
        return
    # Resolve first available academic year
    year = conn.execute("SELECT id FROM academic_years ORDER BY id DESC LIMIT 1").fetchone()
    year_id = year["id"] if year else 0
    
    conn.execute(
        "INSERT INTO admission_forms (form_title, form_title_bn, academic_year_id, application_fee,"
        " open_date, close_date, fields_config, custom_fields, status, instructions, instructions_bn, is_active)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
        (
            "Online Admission Form - 2026",
            "অনলাইন ভর্তি ফরম - ২০২৬",
            year_id,
            200.0,
            "2026-01-01",
            "2026-12-31",
            json.dumps(DEFAULT_FIELDS_CONFIG),
            json.dumps(DEFAULT_CUSTOM_FIELDS),
            "Active",
            "Please fill out all the fields and upload candidate passport photo + birth certificate to submit your admission form. An application fee of 200 BDT applies.",
            "দয়া করে সবগুলো তথ্য পূরণ করুন এবং প্রার্থীর পাসপোর্ট সাইজের ছবি ও জন্ম নিবন্ধন সনদ আপলোড করে সাবমিট করুন। আবেদন ফি ২০০ টাকা প্রযোজ্য।"
        )
    )
    print("SQL: seeded default admission form template")


DEFAULT_APPLICATIONS = [
    {
        "application_no": "APP-2026-0001", "candidate_name": "Sadia Islam", "candidate_name_bn": "সাদিয়া ইসলাম",
        "guardian_name": "Rafiqul Islam", "phone": "01711122233", "email": "sadia@gmail.com",
        "desired_class": "Class 6", "version": "Bangla Version", "shift": "Morning",
        "previous_school": "Sofir Uddin High School", "country": "Bangladesh", "nationality": "Bangladeshi",
        "payment_status": "Paid", "payment_method": "bKash", "payment_transaction_id": "BKX9283JD0",
        "application_status": "Submitted", "remarks": "Documents uploaded are complete."
    },
    {
        "application_no": "APP-2026-0002", "candidate_name": "Abrar Fahim", "candidate_name_bn": "আবরার ফাহিম",
        "guardian_name": "Jahangir Alam", "phone": "01911223344", "email": "abrar@example.com",
        "desired_class": "Class 9", "version": "English Version", "shift": "Day",
        "previous_school": "Sylhet Cantonment Public School", "country": "Bangladesh", "nationality": "Bangladeshi",
        "payment_status": "Paid", "payment_method": "Nagad", "payment_transaction_id": "NGD10293J1",
        "application_status": "Screening", "remarks": "Screened. Ready for written test."
    },
    {
        "application_no": "APP-2026-0003", "candidate_name": "Yusuf Khan", "candidate_name_bn": "",
        "guardian_name": "Farhan Khan", "phone": "+447123456789", "email": "farhan.khan@example.co.uk",
        "desired_class": "Class 11", "version": "Cambridge (O/A-Level)", "shift": "Day",
        "previous_school": "London Secondary College", "country": "United Kingdom", "nationality": "British",
        "payment_status": "Paid", "payment_method": "SSLCommerz", "payment_transaction_id": "SSL91238KJ8",
        "application_status": "Selected", "remarks": "Selected. Awaiting final payment."
    }
]


def _seed_admission_applications(conn):
    """Seed default applicant forms ONLY on an empty table."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM admission_applications").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if count > 0:
        return
    # Resolve first available academic year
    year = conn.execute("SELECT id FROM academic_years ORDER BY id DESC LIMIT 1").fetchone()
    year_id = year["id"] if year else 0
    
    for ap in DEFAULT_APPLICATIONS:
        conn.execute(
            "INSERT INTO admission_applications (application_no, candidate_name, candidate_name_bn, guardian_name,"
            " phone, email, academic_year_id, desired_class, version, shift, previous_school,"
            " country, nationality, payment_status, payment_method, payment_transaction_id, application_status, remarks)"
            " VALUES (:application_no, :candidate_name, :candidate_name_bn, :guardian_name,"
            " :phone, :email, :academic_year_id, :desired_class, :version, :shift, :previous_school,"
            " :country, :nationality, :payment_status, :payment_method, :payment_transaction_id, :application_status, :remarks)",
            {**ap, "academic_year_id": year_id}
        )
        print(f"SQL: seeded default admission application — {ap['application_no']} ({ap['candidate_name']})")


DEFAULT_TESTS = [
    {
        "test_name": "Class 6 Intake Written Exam", "test_name_bn": "৬ষ্ঠ শ্রেণি ভর্তি লিখিত পরীক্ষা",
        "class_name": "Class 6", "test_date": "2026-10-15", "start_time": "10:00 AM", "end_time": "12:00 PM",
        "room_code": "BLK-01", "room_no": "101", "has_written": 1, "has_mcq": 1, "has_viva": 0,
        "max_written_marks": 100.0, "max_mcq_marks": 50.0, "max_viva_marks": 0.0
    },
    {
        "test_name": "Class 9 Science VIVA Interview", "test_name_bn": "৯ম শ্রেণি বিজ্ঞান ভাইভা সাক্ষাৎকার",
        "class_name": "Class 9", "test_date": "2026-10-18", "start_time": "11:00 AM", "end_time": "02:00 PM",
        "room_code": "BLK-01", "room_no": "102", "has_written": 0, "has_mcq": 0, "has_viva": 1,
        "max_written_marks": 0.0, "max_mcq_marks": 0.0, "max_viva_marks": 50.0
    }
]


def _seed_admission_tests(conn):
    """Seed default admission test schedules ONLY on an empty table."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM admission_tests").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if count > 0:
        return
    # Resolve first available academic year
    year = conn.execute("SELECT id FROM academic_years ORDER BY id DESC LIMIT 1").fetchone()
    year_id = year["id"] if year else 0
    
    for t in DEFAULT_TESTS:
        # Resolve room_id based on room_no and building code
        room_row = conn.execute(
            "SELECT r.id FROM rooms r JOIN buildings b ON r.building_id = b.id "
            "WHERE TRIM(r.room_no) = TRIM(?) AND TRIM(b.building_code) = TRIM(?)",
            (t["room_no"], t["room_code"])
        ).fetchone()
        room_id = room_row["id"] if room_row else 0
        
        conn.execute(
            "INSERT INTO admission_tests (test_name, test_name_bn, academic_year_id, class_name,"
            " test_date, start_time, end_time, room_id, has_written, has_mcq, has_viva,"
            " max_written_marks, max_mcq_marks, max_viva_marks, is_active)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
            (
                t["test_name"], t["test_name_bn"], year_id, t["class_name"],
                t["test_date"], t["start_time"], t["end_time"], room_id,
                t["has_written"], t["has_mcq"], t["has_viva"],
                t["max_written_marks"], t["max_mcq_marks"], t["max_viva_marks"]
            )
        )
        print(f"SQL: seeded default admission test — {t['test_name']}")


DEFAULT_QUOTA_CONFIG = {
    "general": 80, "freedom_fighter": 10, "disabled": 5, "staff": 5
}


def _seed_admission_lotteries(conn):
    """Seed a default Admission Lottery Draw result ONLY on an empty table."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM admission_lotteries").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if count > 0:
        return
    # Resolve first available academic year
    year = conn.execute("SELECT id FROM academic_years ORDER BY id DESC LIMIT 1").fetchone()
    year_id = year["id"] if year else 0
    
    conn.execute(
        "INSERT INTO admission_lotteries (academic_year_id, class_name, total_seats, quota_config,"
        " selected_applicant_ids, waiting_applicant_ids, draw_date, is_published, is_active)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)",
        (
            year_id,
            "Class 6",
            20,
            json.dumps(DEFAULT_QUOTA_CONFIG),
            json.dumps([1, 3]), # Applicants 1 & 3 selected
            json.dumps([2]),    # Applicant 2 waitlisted
            "2026-08-05"
        )
    )
    print("SQL: seeded default admission lottery draw result")


DEFAULT_AGE_LIMITS = {
    "Play": {"min": 3, "max": 4},
    "Nursery": {"min": 4, "max": 5},
    "KG": {"min": 5, "max": 6},
    "Class 1": {"min": 6, "max": 8},
    "Class 6": {"min": 11, "max": 13},
    "Class 9": {"min": 14, "max": 16}
}

DEFAULT_PAYMENT_CREDS = {
    "bkash_merchant_id": "BK_MER_928172",
    "bkash_app_key": "BK_APP_KEY_819273",
    "nagad_merchant_id": "NG_MER_102938",
    "nagad_signature_key": "NG_SIG_KEY_718293"
}


def _seed_admission_settings(conn):
    """Seed a default Admission Settings configuration ONLY on an empty table."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM admission_settings").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if count > 0:
        return
    # Resolve first available academic year
    year = conn.execute("SELECT id FROM academic_years ORDER BY id DESC LIMIT 1").fetchone()
    year_id = year["id"] if year else 0
    
    conn.execute(
        "INSERT INTO admission_settings (academic_year_id, open_date, close_date, application_fee,"
        " age_limits, payment_credentials, terms_en, terms_bn, is_active)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
        (
            year_id,
            "2026-10-01",
            "2026-12-31",
            200.0,
            json.dumps(DEFAULT_AGE_LIMITS),
            json.dumps(DEFAULT_PAYMENT_CREDS),
            "I certify that all details submitted are true and correct to the best of my knowledge.",
            "আমি প্রত্যয়ন করছি যে দাখিলকৃত সকল তথ্য আমার জ্ঞান ও বিশ্বাসমতে সত্য এবং সঠিক।"
        )
    )
    print("SQL: seeded default admission settings")


DEFAULT_STUDENTS = [
    {
        "student_id": "STD-2026-0001", "candidate_name": "Mehedi Hasan", "candidate_name_bn": "মেহেদী হাসান",
        "guardian_name": "Abul Hasan", "phone": "01712345678", "email": "mehedi@gmail.com",
        "class_name": "Class 6", "section_name": "A", "roll_no": 1, "gender": "Male",
        "date_of_birth": "2015-05-15", "blood_group": "O+", "religion": "Islam",
        "stipend_eligible": 1, "stipend_mfs_provider": "bKash", "stipend_mfs_number": "01712345678",
        "government_uid": "20158219381029381", "behavior_points": 105
    },
    {
        "student_id": "STD-2026-0002", "candidate_name": "Zarah Ahmed", "candidate_name_bn": "জারা আহমেদ",
        "guardian_name": "Dr. Imtiaz Ahmed", "phone": "01819876543", "email": "zarah@gmail.com",
        "class_name": "Class 6", "section_name": "A", "roll_no": 2, "gender": "Female",
        "date_of_birth": "2015-08-20", "blood_group": "A+", "religion": "Islam",
        "stipend_eligible": 0, "stipend_mfs_provider": "", "stipend_mfs_number": "",
        "government_uid": "20158219381029382", "behavior_points": 100
    },
    {
        "student_id": "STD-2026-0003", "candidate_name": "Sadia Islam", "candidate_name_bn": "সাদিয়া ইসলাম",
        "guardian_name": "Rafiqul Islam", "phone": "01711122233", "email": "sadia@gmail.com",
        "class_name": "Class 9", "section_name": "B", "roll_no": 1, "gender": "Female",
        "date_of_birth": "2012-03-10", "blood_group": "B+", "religion": "Islam",
        "stipend_eligible": 1, "stipend_mfs_provider": "Nagad", "stipend_mfs_number": "01711122233",
        "government_uid": "20128219381029383", "behavior_points": 95
    }
]


def _seed_students(conn):
    """Seed default student records ONLY on an empty table."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    except sqlite3.OperationalError:
        return
    if count > 0:
        return
    # Resolve first available academic year
    year = conn.execute("SELECT id FROM academic_years ORDER BY id DESC LIMIT 1").fetchone()
    year_id = year["id"] if year else 0
    
    for s in DEFAULT_STUDENTS:
        conn.execute(
            "INSERT INTO students (student_id, candidate_name, candidate_name_bn, guardian_name,"
            " phone, email, academic_year_id, class_name, section_name, roll_no, gender, date_of_birth,"
            " blood_group, religion, stipend_eligible, stipend_mfs_provider, stipend_mfs_number,"
            " government_uid, behavior_points, is_active)"
            " VALUES (:student_id, :candidate_name, :candidate_name_bn, :guardian_name,"
            " :phone, :email, :academic_year_id, :class_name, :section_name, :roll_no, :gender, :date_of_birth,"
            " :blood_group, :religion, :stipend_eligible, :stipend_mfs_provider, :stipend_mfs_number,"
            " :government_uid, :behavior_points, 1)",
            {**s, "academic_year_id": year_id}
        )
        print(f"SQL: seeded default student — {s['student_id']} ({s['candidate_name']})")


def _seed_exam_terms(conn):
    """Seed the default BD exam terms ONLY on a fresh/empty table, so terms
    the user deletes stay deleted (no resurrection on restart)."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM exam_terms").fetchone()[0]
    except sqlite3.OperationalError:
        return  # table not created yet
    if count > 0:
        return
    for e in BUILTIN_EXAMS:
        board = conn.execute(
            "SELECT id FROM boards WHERE TRIM(board_name) = TRIM(?) COLLATE NOCASE",
            (e["board"],),
        ).fetchone()
        board_id = board["id"] if board else 0
        conn.execute(
            "INSERT INTO exam_terms (exam_name, exam_name_bn, exam_type, board_id,"
            " term_id, class_ids, scheme_id, exam_start, exam_end,"
            " publish_to_portal, is_board_exam, is_builtin, is_active)"
            " VALUES (?, ?, ?, ?, 0, '[]', 0, '', '', 0, 0, 1, 1)",
            (e["name"], e["bn"], e["type"], board_id),
        )
        print(f"SQL: seeded default exam term — {e['name']}")


# Built-in Bangladesh subjects & curriculum (NCTB / BMEB / BTEB based).
# Seeded once on server start, marked is_builtin=1 so they can't be deleted
# from the UI (users may still edit them or add their own). `board` names
# are resolved to board ids at seed time (must match BUILTIN_BOARDS above).
BUILTIN_SUBJECTS = [
    # ── General stream (SSC / HSC — NCTB subject codes) ────────────────
    {"name": "Bangla", "code": "101", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Bangla 2nd Paper", "code": "102", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "English", "code": "107", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "English 2nd Paper", "code": "108", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Mathematics", "code": "109", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Higher Mathematics", "code": "110", "type": "Elective", "board": "Dhaka Board"},
    {"name": "General Science", "code": "117", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Bangladesh & Global Studies", "code": "129", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "ICT", "code": "134", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Physics", "code": "136", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Chemistry", "code": "137", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Biology", "code": "138", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Agricultural Studies", "code": "139", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Home Science", "code": "140", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Accounting", "code": "141", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Finance & Banking", "code": "142", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Business Studies", "code": "143", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Business Entrepreneurship", "code": "144", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Geography", "code": "145", "type": "Elective", "board": "Dhaka Board"},
    {"name": "History", "code": "146", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Civics & Citizenship", "code": "147", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Economics", "code": "148", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Islamic History & Culture", "code": "149", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Islamic Studies", "code": "150", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Hindu Religion", "code": "151", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Buddhist Religion", "code": "152", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Christian Religion", "code": "153", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Social Science", "code": "154", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Sociology", "code": "155", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Logic", "code": "156", "type": "Elective", "board": "Dhaka Board"},
    {"name": "Physical Education & Health", "code": "161", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Work & Life Oriented Education", "code": "165", "type": "Compulsory", "board": "Dhaka Board"},
    {"name": "Career Studies", "code": "167", "type": "Compulsory", "board": "Dhaka Board"},
    # ── Madrasah stream (Dakhil / Alim — BMEB) ──────────────────────────
    {"name": "Quran Majid & Tajweed", "code": "190", "type": "Madrasah Subject", "board": "Bangladesh Madrasah Education Board"},
    {"name": "Hadith & Usole Hadith", "code": "191", "type": "Madrasah Subject", "board": "Bangladesh Madrasah Education Board"},
    {"name": "Aqaid & Fiqh", "code": "192", "type": "Madrasah Subject", "board": "Bangladesh Madrasah Education Board"},
    {"name": "Islamic History", "code": "193", "type": "Madrasah Subject", "board": "Bangladesh Madrasah Education Board"},
    {"name": "Arabic", "code": "194", "type": "Madrasah Subject", "board": "Bangladesh Madrasah Education Board"},
    # ── Technical stream (SSC/HSC Vocational — BTEB) ────────────────────
    {"name": "Computer Office Application", "code": "175", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Electrical Works", "code": "176", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "General Mechanics", "code": "177", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Electronics", "code": "178", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Welding & Fabrication", "code": "179", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Garments & Tailoring", "code": "180", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Food & Nutrition", "code": "181", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Nursing & Midwifery", "code": "182", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Agricultural Science", "code": "183", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Fish Culture", "code": "184", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Dairy Farming", "code": "185", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Poultry Rearing", "code": "186", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Nursery & Horticulture", "code": "187", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
    {"name": "Engineering Drawing", "code": "188", "type": "Vocational Trade", "board": "Bangladesh Technical Education Board"},
]


def _seed_subjects(conn):
    """Seed the default BD subjects ONLY on a fresh/empty table, so subjects
    the user deletes stay deleted (no resurrection on restart)."""
    try:
        count = conn.execute("SELECT COUNT(*) FROM subjects").fetchone()[0]
    except sqlite3.OperationalError:
        return  # table not created yet
    if count > 0:
        return
    for s in BUILTIN_SUBJECTS:
        board = conn.execute(
            "SELECT id FROM boards WHERE TRIM(board_name) = TRIM(?) COLLATE NOCASE",
            (s["board"],),
        ).fetchone()
        board_id = board["id"] if board else 0
        found = conn.execute(
            "SELECT id FROM subjects WHERE TRIM(subject_name) = TRIM(?) COLLATE NOCASE AND board_id = ?",
            (s["name"], board_id),
        ).fetchone()
        if found:
            continue
        conn.execute(
            "INSERT INTO subjects (subject_name, subject_code, subject_type, board_id,"
            " group_id, version, class_level_ids, marks_distribution, is_builtin, is_active)"
            " VALUES (?, ?, ?, ?, 0, '', '[]', '[]', 1, 1)",
            (s["name"], s["code"], s["type"], board_id),
        )
        print(f"SQL: seeded built-in subject — {s['name']} ({s['board']})")


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
            intake_capacity INTEGER DEFAULT 40,
            quota_general INTEGER DEFAULT 80,
            quota_freedom_fighter INTEGER DEFAULT 10,
            quota_disabled INTEGER DEFAULT 5,
            quota_staff INTEGER DEFAULT 5,
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
            is_builtin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- Subjects & curriculum: the subject catalogue per board × class
        -- level × group × version, with per-class marks distribution rows.
        -- `marks_distribution` is a JSON array:
        --   [{ class_id, full_marks_theory, full_marks_practical,
        --      full_marks_ca, pass_marks, periods_week, book_names }]
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_name TEXT DEFAULT '', subject_code TEXT DEFAULT '',
            subject_type TEXT DEFAULT '',
            board_id INTEGER DEFAULT 0,
            group_id INTEGER DEFAULT 0,
            version TEXT DEFAULT '',
            class_level_ids TEXT DEFAULT '[]',
            marks_distribution TEXT DEFAULT '[]',
            is_builtin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- Exam terms & types: the exam calendar configuration — which exams
        -- happen when, for which classes, under which board's rules, with
        -- which grading scheme. The Exam & Result module consumes these.
        CREATE TABLE IF NOT EXISTS exam_terms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exam_name TEXT DEFAULT '', exam_name_bn TEXT DEFAULT '',
            exam_type TEXT DEFAULT '',
            board_id INTEGER DEFAULT 0,
            term_id INTEGER DEFAULT 0,
            class_ids TEXT DEFAULT '[]',
            scheme_id INTEGER DEFAULT 0,
            exam_start TEXT DEFAULT '', exam_end TEXT DEFAULT '',
            publish_to_portal INTEGER DEFAULT 0,
            is_board_exam INTEGER DEFAULT 0,
            is_builtin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- Physical infrastructure: buildings → floors → rooms. Timetable
        -- allocates rooms; sections may claim a home room.
        CREATE TABLE IF NOT EXISTS buildings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            building_name TEXT DEFAULT '', building_name_bn TEXT DEFAULT '',
            building_code TEXT DEFAULT '',
            floor_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_no TEXT DEFAULT '', room_no_bn TEXT DEFAULT '',
            building_id INTEGER DEFAULT 0,
            floor_no INTEGER DEFAULT 0,
            room_type TEXT DEFAULT '',
            capacity INTEGER DEFAULT 0,
            facilities TEXT DEFAULT '[]',
            status TEXT DEFAULT 'Active',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        -- Academic sessions & terms: splits an academic year into named
        -- terms used by exams, fees and promotion. One row per term of a
        -- session (e.g. "2026 Session" × Term 1/2/3).
        CREATE TABLE IF NOT EXISTS academic_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_name TEXT DEFAULT '', session_name_bn TEXT DEFAULT '',
            academic_year_id INTEGER DEFAULT 0,
            term_name TEXT DEFAULT '', term_name_bn TEXT DEFAULT '',
            term_order INTEGER DEFAULT 0,
            term_start TEXT DEFAULT '', term_end TEXT DEFAULT '',
            is_current INTEGER DEFAULT 0,
            result_type TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS admission_enquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_name TEXT DEFAULT '',
            candidate_name_bn TEXT DEFAULT '',
            guardian_name TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
            desired_class TEXT DEFAULT '',
            version TEXT DEFAULT '',
            shift TEXT DEFAULT '',
            previous_school TEXT DEFAULT '',
            nationality TEXT DEFAULT 'Bangladeshi',
            country TEXT DEFAULT 'Bangladesh',
            enquiry_date TEXT DEFAULT '',
            source TEXT DEFAULT 'Walk-in',
            status TEXT DEFAULT 'New',
            remarks TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS admission_forms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            form_title TEXT DEFAULT '',
            form_title_bn TEXT DEFAULT '',
            academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
            application_fee REAL DEFAULT 0.0,
            open_date TEXT DEFAULT '',
            close_date TEXT DEFAULT '',
            fields_config TEXT DEFAULT '{}',
            custom_fields TEXT DEFAULT '[]',
            status TEXT DEFAULT 'Draft',
            instructions TEXT DEFAULT '',
            instructions_bn TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS admission_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_no TEXT UNIQUE NOT NULL,
            candidate_name TEXT DEFAULT '',
            candidate_name_bn TEXT DEFAULT '',
            guardian_name TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
            desired_class TEXT DEFAULT '',
            version TEXT DEFAULT '',
            shift TEXT DEFAULT '',
            previous_school TEXT DEFAULT '',
            country TEXT DEFAULT 'Bangladesh',
            nationality TEXT DEFAULT 'Bangladeshi',
            photo TEXT DEFAULT '',
            birth_certificate TEXT DEFAULT '',
            payment_status TEXT DEFAULT 'Pending',
            payment_method TEXT DEFAULT '',
            payment_transaction_id TEXT DEFAULT '',
            application_status TEXT DEFAULT 'Submitted',
            viva_marks REAL DEFAULT 0.0,
            written_marks REAL DEFAULT 0.0,
            remarks TEXT DEFAULT '',
            verification_status TEXT DEFAULT 'Unverified',
            verification_checklist TEXT DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS admission_tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_name TEXT DEFAULT '',
            test_name_bn TEXT DEFAULT '',
            academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
            class_name TEXT DEFAULT '',
            test_date TEXT DEFAULT '',
            start_time TEXT DEFAULT '',
            end_time TEXT DEFAULT '',
            room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
            has_written INTEGER DEFAULT 1,
            has_mcq INTEGER DEFAULT 0,
            has_viva INTEGER DEFAULT 1,
            max_written_marks REAL DEFAULT 100.0,
            max_mcq_marks REAL DEFAULT 100.0,
            max_viva_marks REAL DEFAULT 50.0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS admission_lotteries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
            class_name TEXT DEFAULT '',
            total_seats INTEGER DEFAULT 0,
            quota_config TEXT DEFAULT '{}',
            selected_applicant_ids TEXT DEFAULT '[]',
            waiting_applicant_ids TEXT DEFAULT '[]',
            draw_date TEXT DEFAULT '',
            is_published INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS admission_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
            open_date TEXT DEFAULT '',
            close_date TEXT DEFAULT '',
            application_fee REAL DEFAULT 0.0,
            age_limits TEXT DEFAULT '{}',
            payment_credentials TEXT DEFAULT '{}',
            terms_en TEXT DEFAULT '',
            terms_bn TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            candidate_name TEXT DEFAULT '',
            candidate_name_bn TEXT DEFAULT '',
            guardian_name TEXT DEFAULT '',
            father_name TEXT DEFAULT '',
            father_nid TEXT DEFAULT '',
            mother_name TEXT DEFAULT '',
            mother_nid TEXT DEFAULT '',
            present_address TEXT DEFAULT '',
            permanent_address TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
            class_name TEXT DEFAULT '',
            section_name TEXT DEFAULT '',
            roll_no INTEGER DEFAULT 0,
            gender TEXT DEFAULT '',
            date_of_birth TEXT DEFAULT '',
            blood_group TEXT DEFAULT '',
            religion TEXT DEFAULT '',
            stipend_eligible INTEGER DEFAULT 0,
            stipend_mfs_provider TEXT DEFAULT '',
            stipend_mfs_number TEXT DEFAULT '',
            government_uid TEXT DEFAULT '',
            behavior_points INTEGER DEFAULT 100,
            is_active INTEGER DEFAULT 1,
            photo TEXT DEFAULT '',
            birth_certificate TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS promotion_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            candidate_name TEXT NOT NULL,
            source_class TEXT NOT NULL,
            target_class TEXT NOT NULL,
            source_year TEXT NOT NULL,
            target_year TEXT NOT NULL,
            promotion_type TEXT NOT NULL,
            roll_no INTEGER DEFAULT 0,
            destination_branch TEXT DEFAULT '',
            tc_no TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)

    _migrate(conn)
    _seed_academic_years(conn)
    _seed_boards(conn)
    _seed_subjects(conn)
    _seed_exam_terms(conn)
    _seed_buildings_rooms(conn)
    _seed_academic_sessions(conn)
    _seed_admission_enquiries(conn)
    _seed_admission_forms(conn)
    _seed_admission_applications(conn)
    _seed_admission_tests(conn)
    _seed_admission_lotteries(conn)
    _seed_admission_settings(conn)
    _seed_students(conn)

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
