# backend/api/v1/routes/student_routes.py
"""Students routes.

Endpoints:
  GET    /api/students              → { students: [...] }
  POST   /api/students              → create → { ok, id }
  POST   /api/students?id=N         → update → { ok, id }
  DELETE /api/students?id=N         → delete → { ok }
  POST   /api/students/import       → bulk upsert with cross-check
"""

import json
import urllib.parse

from backend.api.v1.controllers import student_controller
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
    res.ok(handler, {"students": student_controller.list_students()})


def handle_post(handler):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = student_controller.update_student(item_id, body)
            if not updated:
                res.error(handler, 404, "Student not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = student_controller.create_student(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    deleted = student_controller.delete_student(item_id)
    if not deleted:
        res.error(handler, 404, "Student not found")
        return
    res.ok(handler, {"ok": True})


def handle_import(handler):
    """POST /api/students/import — bulk upsert with cross-check."""
    body = _read_json_body(handler)
    try:
        stats = student_controller.import_students(body.get("items") or [])
        res.ok(handler, {
            "ok": True,
            "inserted": len(stats["inserted"]),
            "skipped": stats["skipped"],
        })
    except Exception as err:
        res.error(handler, 500, f"Import failed: {err}")


def handle_get_history(handler):
    """GET /api/students/promotion-history — retrieve audit trails."""
    try:
        res.ok(handler, {"history": student_controller.list_promotion_history()})
    except Exception as err:
        res.error(handler, 500, f"Failed to retrieve history: {err}")


def handle_post_history(handler):
    """POST /api/students/promotion-history — create a history entry."""
    body = _read_json_body(handler)
    try:
        student_controller.create_promotion_history(body)
        res.created(handler, {"ok": True})
    except Exception as err:
        res.error(handler, 500, f"Failed to create log entry: {err}")


def register_student_routes(handler, method, path):
    """Dispatch /api/students requests to the right handler."""
    if not path.startswith("/api/students"):
        return False
    if path == "/api/students/import":
        if method == "POST":
            handle_import(handler)
        else:
            res.error(handler, 405, "Method not allowed")
        return True
    if path == "/api/students/promotion-history":
        if method == "GET":
            handle_get_history(handler)
        elif method == "POST":
            handle_post_history(handler)
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
