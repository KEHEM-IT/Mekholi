# backend/api/v1/routes/subject_routes.py
"""Subjects & Curriculum routes.

Endpoints:
  GET    /api/subjects              → { subjects: [...] }
  POST   /api/subjects              → create → { ok, id }
  POST   /api/subjects?id=N         → update → { ok, id }
  DELETE /api/subjects?id=N         → delete → { ok }
  POST   /api/subjects/import       → bulk upsert with cross-check
"""

import json
import urllib.parse

from backend.api.v1.controllers import subject_controller
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
    res.ok(handler, {"subjects": subject_controller.list_subjects()})


def handle_post(handler):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = subject_controller.update_subject(item_id, body)
            if not updated:
                res.error(handler, 404, "Subject not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = subject_controller.create_subject(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    try:
        deleted = subject_controller.delete_subject(item_id)
    except PermissionError:
        res.error(handler, 400, "Built-in subjects cannot be deleted")
        return
    if not deleted:
        res.error(handler, 404, "Subject not found")
        return
    res.ok(handler, {"ok": True})


def handle_import(handler):
    """POST /api/subjects/import — bulk upsert with cross-check.

    Body: { "items": [...] } — subjects whose name already exists for the
    same board are skipped; only new rows are inserted.
    """
    body = _read_json_body(handler)
    try:
        stats = subject_controller.import_subjects(body.get("items") or [])
        res.ok(handler, {
            "ok": True,
            "inserted": len(stats["inserted"]),
            "skipped": stats["skipped"],
        })
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Import failed: {err}")


def register_subject_routes(handler, method, path):
    """Dispatch /api/subjects requests to the right handler."""
    if not path.startswith("/api/subjects"):
        return False
    if path == "/api/subjects/import":
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
