#!/usr/bin/env python3
# backend/server.py
"""Mekholi local SQL API server (entry point).

Serves the Institute Profile CRUD API used by the Vite dev frontend:

    GET  /api/profile?eiin=130430  → profile document (or 404)
    POST /api/profile?eiin=130430  → upsert profile document

Architecture:
    server.py                  – entry point + HTTP plumbing
    core/db.py                 – SQLite connection, schema, migrations
    api/v1/controllers/        – business logic per resource
    api/v1/routes/             – URL routing & method dispatch
    utils/response.py          – consistent JSON + CORS responses

Run:
    python3 backend/server.py
"""

import sys
import subprocess
import shutil

# ── Self-healing dependency installer ─────────────────────────────────
try:
    import pytesseract
except ImportError:
    print("pytesseract python package not found. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pytesseract"])

if not shutil.which("tesseract"):
    print("tesseract system binary not found. Installing via apt-get...")
    try:
        subprocess.check_call(["sudo", "apt-get", "update", "-y"])
        subprocess.check_call(["sudo", "apt-get", "install", "-y", "tesseract-ocr", "tesseract-ocr-ben", "tesseract-ocr-eng"])
        print("Tesseract system binaries successfully installed!")
    except Exception as e:
        print(f"Warning: Failed to install system tesseract via apt: {e}")

from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from socketserver import ThreadingMixIn

# Allow running both `python3 backend/server.py` and `python3 server.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.api.v1.routes import academic_session_routes, academic_year_routes, admission_application_routes, admission_enquiry_routes, admission_form_routes, admission_lottery_routes, admission_setting_routes, admission_test_routes, board_routes, branch_routes, class_setup_routes, exam_term_routes, grading_scheme_routes, holiday_routes, profile_routes, room_routes, student_routes, subject_routes, nid_scanner_routes  # noqa: E402
from backend.core.db import init_db  # noqa: E402
from backend.utils import response as res  # noqa: E402


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    # ── helpers ────────────────────────────────────────────────────────

    def _dispatch(self):
        method = self.command
        path = self.path.split("?")[0]

        if method == "OPTIONS":
            res.no_content(self)
            return True

        # Versioned route registry — new resources register here.
        if profile_routes.register_profile_routes(self, method, path):
            return True
        if branch_routes.register_branch_routes(self, method, path):
            return True
        if academic_year_routes.register_academic_year_routes(self, method, path):
            return True
        if class_setup_routes.register_class_setup_routes(self, method, path):
            return True
        if holiday_routes.register_holiday_routes(self, method, path):
            return True
        if grading_scheme_routes.register_grading_scheme_routes(self, method, path):
            return True
        if board_routes.register_board_routes(self, method, path):
            return True
        if subject_routes.register_subject_routes(self, method, path):
            return True
        if exam_term_routes.register_exam_term_routes(self, method, path):
            return True
        if room_routes.register_room_routes(self, method, path):
            return True
        if academic_session_routes.register_academic_session_routes(self, method, path):
            return True
        if admission_enquiry_routes.register_admission_enquiry_routes(self, method, path):
            return True
        if admission_form_routes.register_admission_form_routes(self, method, path):
            return True
        if admission_application_routes.register_admission_application_routes(self, method, path):
            return True
        if admission_test_routes.register_admission_test_routes(self, method, path):
            return True
        if admission_lottery_routes.register_admission_lottery_routes(self, method, path):
            return True
        if admission_setting_routes.register_admission_setting_routes(self, method, path):
            return True
        if student_routes.register_student_routes(self, method, path):
            return True
        if nid_scanner_routes.register_nid_scanner_routes(self, method, path):
            return True

        res.error(self, 404, "Not found")
        return True

    # ── HTTP verbs ─────────────────────────────────────────────────────

    def do_GET(self):
        self._dispatch()

    def do_POST(self):
        self._dispatch()

    def do_DELETE(self):
        self._dispatch()

    def do_OPTIONS(self):
        self._dispatch()

    # ── logging ────────────────────────────────────────────────────────

    def log_message(self, fmt, *args):
        print(f"  {args[0]}")


class ThreadedServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    init_db()
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    print(f"SQL API: http://localhost:{port}/api/profile?eiin=130430")
    ThreadedServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
