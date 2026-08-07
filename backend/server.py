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
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from socketserver import ThreadingMixIn

# Allow running both `python3 backend/server.py` and `python3 server.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.api.v1.routes import branch_routes, profile_routes  # noqa: E402
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
