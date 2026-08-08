# backend/api/v1/routes/academic_session_routes.py
"""Academic Sessions & Terms routes.

Endpoints:
  GET    /api/academic-sessions              → { academic_sessions: [...] }
  POST   /api/academic-sessions              → create → { ok, id }
  POST   /api/academic-sessions?id=N         → update → { ok, id }
  DELETE /api/academic-sessions?id=N         → delete → { ok }
  POST   /api/academic-sessions/import       → bulk upsert with cross-check
"""

import json
import urllib.parse

from backend.api.v1.controllers import academic_session_controller
from backend.utils import response as res


def _read_json_body(handler):
    clen = handler.headers.get("Content-Length")
    body_str = handler.rfile.read(int(clen)) if clen else b"{}"
    return json.loads(body_str) if body_str else {}


def _get_id(handler):
    parts = urllib.parse.urlparse(handler.path)
    query = urllib.parse.parse_qs(parts.query)
    try:
        return int(query.get("id", ["0"])[0]) or None
    except ValueError:
        return None


def handle_get(handler):
    res.ok(handler, {"academic_sessions": academic_session_controller.list_sessions()})


def handle_post(handler):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = academic_session_controller.update_session(item_id, body)
            if not updated:
                res.error(handler, 404, "Session term not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = academic_session_controller.create_session(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    deleted = academic_session_controller.delete_session(item_id)
    if not deleted:
        res.error(handler, 404, "Session term not found")
        return
    res.ok(handler, {"ok": True})


def handle_import(handler):
    """POST /api/academic-sessions/import — bulk upsert with cross-check."""
    body = _read_json_body(handler)
    try:
        stats = academic_session_controller.import_sessions(body.get("items") or [])
        res.ok(handler, {
            "ok": True,
            "inserted": len(stats["inserted"]),
            "skipped": stats["skipped"],
        })
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Import failed: {err}")


def register_academic_session_routes(handler, method, path):
    """Dispatch /api/academic-sessions requests to the right handler."""
    if not path.startswith("/api/academic-sessions"):
        return False
    if path == "/api/academic-sessions/import":
        if method == "POST":
            handle_import(handler)
        else:
            res.error(handler, 405, "Method not allowed")
        return True
    if method == "GET":
        handle_get(handler)
    elif method == "POST":
        handle_post(handler)
    elif method == "DELETE":
        handle_delete(handler)
    else:
        res.error(handler, 405, "Method not allowed")
    return True
