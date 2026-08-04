"""
Local SQLite API for Shikkha ERP.
Zero dependencies — uses only Python stdlib (sqlite3 + http.server).
Run: python server.py
"""
import json, sqlite3, urllib.parse
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

DB_PATH = Path(__file__).parent / "school.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS institute_profiles (
            eiin TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    count = conn.execute("SELECT COUNT(*) FROM institute_profiles").fetchone()[0]
    if count == 0:
        suhsc_path = Path(__file__).parent / "src" / "assets" / "school" / "suhsc_generated.json"
        if suhsc_path.exists():
            raw = json.loads(suhsc_path.read_text(encoding="utf-8"))["school_data"][0]
            keys = [
                "institute_name_bn","institute_name_en","founder_name",
                "head_of_institute_name","parliamentary_constituency",
                "establishment_date","income_total","expense_total","student_fee_amount",
                "address","contact","classification","identifiers",
                "mpo_status","location_details",
                "recognition_history","mpo_info","bank_accounts",
                "committee_members","staff_positions","staff_positions_total",
                "former_committee_members","development_projects",
                "committee_formation_history","committee_meetings",
                "facilities","inspection_visits","income_sources",
                "expense_sources","disasters","trainings",
                "academic_result_tables","other_tables",
                "institute_photos","institute_contacts",
            ]
            profile = {k: raw.get(k) for k in keys}
            eiin = (raw.get("identifiers") or {}).get("eiin", "130430")
            conn.execute(
                "INSERT INTO institute_profiles (eiin, data) VALUES (?, ?)",
                (eiin, json.dumps(profile, ensure_ascii=False)),
            )
            print(f"SQL: seeded {eiin}")
    conn.commit()
    conn.close()

class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        eiin = params.get("eiin", ["130430"])[0]
        conn = get_db()
        row = conn.execute("SELECT data FROM institute_profiles WHERE eiin = ?", (eiin,)).fetchone()
        conn.close()
        if row:
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(row["data"].encode())
        else:
            self.send_response(404)
            self._cors()
            self.end_headers()

    def do_POST(self):
        self.do_PUT()

    def do_PUT(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        eiin = params.get("eiin", ["130430"])[0]
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        conn = get_db()
        conn.execute(
            """INSERT INTO institute_profiles (eiin, data, updated_at)
               VALUES (?, ?, datetime('now'))
               ON CONFLICT(eiin) DO UPDATE SET
               data = excluded.data, updated_at = datetime('now')""",
            (eiin, json.dumps(body, ensure_ascii=False)),
        )
        conn.commit()
        conn.close()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, fmt, *args):
        print(f"  {args[0]}")

if __name__ == "__main__":
    init_db()
    PORT = 5000
    print(f"SQL API: http://localhost:{PORT}/api/profile?eiin=130430")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
