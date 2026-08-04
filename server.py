"""
Local Python API server for Shikkha ERP Institute Profile.
Run with: pip install flask && python server.py
Reads/writes a local SQLite database (school.db).
"""

import json
import sqlite3
from pathlib import Path
from flask import Flask, request, jsonify

app = Flask(__name__)
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
            with open(suhsc_path, encoding="utf-8") as f:
                suhsc = json.load(f)
            raw = suhsc["school_data"][0]
            keys = [
                "institute_name_bn", "institute_name_en", "founder_name",
                "head_of_institute_name", "parliamentary_constituency",
                "establishment_date", "income_total", "expense_total",
                "student_fee_amount",
                "address", "contact", "classification", "identifiers",
                "mpo_status", "location_details",
                "recognition_history", "mpo_info", "bank_accounts",
                "committee_members", "staff_positions", "staff_positions_total",
                "former_committee_members", "development_projects",
                "committee_formation_history", "committee_meetings",
                "facilities", "inspection_visits", "income_sources",
                "expense_sources", "disasters", "trainings",
                "academic_result_tables", "other_tables",
                "institute_photos", "institute_contacts",
            ]
            profile = {k: raw.get(k) for k in keys}
            eiin = (raw.get("identifiers") or {}).get("eiin", "130430")
            conn.execute(
                "INSERT INTO institute_profiles (eiin, data) VALUES (?, ?)",
                (eiin, json.dumps(profile, ensure_ascii=False)),
            )
            print(f"Seeded SUHSC data (EIIN: {eiin})")
    conn.commit()
    conn.close()

@app.route("/api/profile", methods=["GET"])
def get_profile():
    eiin = request.args.get("eiin", "130430")
    conn = get_db()
    row = conn.execute(
        "SELECT data FROM institute_profiles WHERE eiin = ?", (eiin,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(json.loads(row["data"]))

@app.route("/api/profile", methods=["POST", "PUT"])
def save_profile():
    eiin = request.args.get("eiin", "130430")
    data = request.get_json()
    conn = get_db()
    conn.execute(
        """INSERT INTO institute_profiles (eiin, data, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(eiin) DO UPDATE SET
           data = excluded.data, updated_at = datetime('now')""",
        (eiin, json.dumps(data, ensure_ascii=False)),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

if __name__ == "__main__":
    init_db()
    print("Local API running at http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
