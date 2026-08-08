# backend/api/v1/routes/exam_term_routes.py
"""Exam Terms & Types routes.

Endpoints:
  GET    /api/exam-terms              → { exam_terms: [...] }
  POST   /api/exam-terms              → create → { ok, id }
  POST   /api/exam-terms?id=N         → update → { ok, id }
  DELETE /api/exam-terms?id=N         → delete → { ok }
  POST   /api/exam-terms/import       → bulk upsert with cross-check
"""

import json
import urllib.parse

from backend.api.v1.controllers import exam_term_controller
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
    res.ok(handler, {"exam_terms": exam_term_controller.list_exams()})


def handle_post(handler):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = exam_term_controller.update_exam(item_id, body)
            if not updated:
                res.error(handler, 404, "Exam term not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = exam_term_controller.create_exam(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    try:
        deleted = exam_term_controller.delete_exam(item_id)
    except PermissionError:
        res.error(handler, 400, "Built-in exam terms cannot be deleted")
        return
    if not deleted:
        res.error(handler, 404, "Exam term not found")
        return
    res.ok(handler, {"ok": True})


def handle_import(handler):
    """POST /api/exam-terms/import — bulk upsert with cross-check."""
    body = _read_json_body(handler)
    try:
        stats = exam_term_controller.import_exams(body.get("items") or [])
        res.ok(handler, {
            "ok": True,
            "inserted": len(stats["inserted"]),
            "skipped": stats["skipped"],
        })
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Import failed: {err}")


def register_exam_term_routes(handler, method, path):
    """Dispatch /api/exam-terms requests to the right handler."""
    if not path.startswith("/api/exam-terms"):
        return False
    if path == "/api/exam-terms/import":
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
