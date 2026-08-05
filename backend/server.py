"""
Local SQLite API for Shikkha ERP - Institute Profile.
Run: python backend/server.py
"""
import json, sqlite3, urllib.parse, threading
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

DB_PATH = Path(__file__).parent.parent / "school.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS institute_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            eiin TEXT UNIQUE NOT NULL,
            institute_name_bn TEXT DEFAULT '', institute_name_en TEXT DEFAULT '',
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
    """)
    if conn.execute("SELECT COUNT(*) FROM institute_profiles").fetchone()[0] == 0:
        conn.execute("INSERT INTO institute_profiles (eiin) VALUES ('130430')")
        pid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        for key in ['play_ground','electricity','tubewell','tap','transport',
                     'auditorium','gas','canteen','audio_sound','health_aid',
                     'gymnasium','audio_visual','television','boundary_wall','solar_panel']:
            conn.execute("INSERT INTO facilities (profile_id,facility_key,enabled) VALUES (?,?,0)",(pid,key))
        print("SQL: seeded blank profile (EIIN: 130430)")
    conn.commit()
    conn.close()

def profile_to_dict(row, conn):
    d = dict(row)
    d["committee_members"] = [dict(r) for r in conn.execute(
        "SELECT * FROM committee_members WHERE profile_id=? ORDER BY id", (d["id"],)).fetchall()]
    rows = conn.execute(
        "SELECT facility_key, enabled FROM facilities WHERE profile_id=?", (d["id"],)).fetchall()
    d["facilities"] = {r["facility_key"]: bool(r["enabled"]) for r in rows}
    del d["id"]
    return d

class Handler(BaseHTTPRequestHandler):
    def _reply(self, code, body=None):
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Type", "application/json")
        self.send_header("Connection", "close")
        self.end_headers()
        if body is not None:
            self.wfile.write(json.dumps(body, ensure_ascii=False).encode())

    def do_OPTIONS(self):
        self._reply(204)

    def do_GET(self):
        parts = urllib.parse.urlparse(self.path)
        if not parts.path.startswith("/api/profile"):
            return self._reply(404, {"error": "Not found"})
        eiin = urllib.parse.parse_qs(parts.query).get("eiin", ["130430"])[0]
        conn = get_db()
        row = conn.execute("SELECT * FROM institute_profiles WHERE eiin=?", (eiin,)).fetchone()
        if not row:
            conn.close()
            return self._reply(404, {"error": "Not found"})
        data = profile_to_dict(row, conn)
        conn.close()
        self._reply(200, data)

    def do_POST(self):
        parts = urllib.parse.urlparse(self.path)
        eiin = urllib.parse.parse_qs(parts.query).get("eiin", ["130430"])[0]
        clen = self.headers.get("Content-Length")
        body_str = self.rfile.read(int(clen)) if clen else b"{}"
        body = json.loads(body_str) if body_str else {}
        conn = get_db()
        vals = {f: body.get(f, "") for f in [
            "institute_name_bn","institute_name_en","founder_name",
            "establishment_date","parliamentary_constituency",
            "division_id","district_id","upazila_id","union_id",
            "village_road_holding_no","post_office","post_code",
            "institute_phone","institute_email","website",
            "institute_type","attached_technical_branch_type",
            "group_field","student_type","shift_count","management",
            "board_institute_code","technical_board_code",
            "mpo_code","technical_branch_mpo_code","stipend_code",
            "general_mpo_code","tech_mpo_code",
            "secondary_mpo_date","secondary_mpo_code",
            "higher_secondary_mpo_date","higher_secondary_mpo_code",
            "bank_name","bank_branch","bank_account_type",
            "bank_account_holder","bank_account_number","bank_account_purpose",
        ]}
        for b in ("has_english_version","general_mpo","tech_mpo"):
            vals[b] = 1 if body.get(b) else 0
        for n in ("staff_male","staff_female","staff_mpo_male","staff_mpo_female",
                  "staff_nonmpo_male","staff_nonmpo_female"):
            vals[n] = int(body.get(n) or 0)
        vals["eiin"] = eiin
        cols = ", ".join(vals)
        phs  = ", ".join(f":{k}" for k in vals)
        ups  = ", ".join(f"{k}=excluded.{k}" for k in vals)
        conn.execute(
            f"INSERT INTO institute_profiles ({cols}, updated_at) "
            f"VALUES ({phs}, datetime('now')) "
            f"ON CONFLICT(eiin) DO UPDATE SET {ups}, updated_at=datetime('now')",
            vals)
        pid = conn.execute("SELECT id FROM institute_profiles WHERE eiin=?", (eiin,)).fetchone()["id"]
        conn.execute("DELETE FROM committee_members WHERE profile_id=?", (pid,))
        for cm in body.get("committee_members") or []:
            conn.execute("""INSERT INTO committee_members
                (profile_id,member_name,joining_date,phone,gender,
                 committee_position,education_qualification,occupation,
                 left_committee,reason_for_leaving)
                VALUES (?,?,?,?,?,?,?,?,?,?)""", (pid,
                cm.get("member_name",""), cm.get("joining_date",""),
                cm.get("phone",""), cm.get("gender",""),
                cm.get("committee_position",""), cm.get("education_qualification",""),
                cm.get("occupation",""), 1 if cm.get("left_committee") else 0,
                cm.get("reason_for_leaving","")))
        conn.execute("DELETE FROM facilities WHERE profile_id=?", (pid,))
        for key, val in (body.get("facilities") or {}).items():
            conn.execute("INSERT INTO facilities (profile_id,facility_key,enabled) VALUES (?,?,?)",
                         (pid, key, 1 if val else 0))
        conn.commit()
        conn.close()
        self._reply(200, {"ok": True})

    def log_message(self, fmt, *args):
        print(f"  {args[0]}")

class ThreadedServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

if __name__ == "__main__":
    init_db()
    PORT = 5000
    print(f"SQL API: http://localhost:{PORT}/api/profile?eiin=130430")
    ThreadedServer(("0.0.0.0", PORT), Handler).serve_forever()
