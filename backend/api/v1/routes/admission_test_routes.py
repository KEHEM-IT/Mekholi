# backend/api/v1/routes/admission_test_routes.py
"""Admission Tests routes.

Endpoints:
  GET    /api/admission-tests              → { admission_tests: [...] }
  POST   /api/admission-tests              → create → { ok, id }
  POST   /api/admission-tests?id=N         → update → { ok, id }
  DELETE /api/admission-tests?id=N         → delete → { ok }
  POST   /api/admission-tests/import       → bulk upsert with cross-check
"""

import json
import urllib.parse

from backend.api.v1.controllers import admission_test_controller
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
    res.ok(handler, {"admission_tests": admission_test_controller.list_tests()})


def handle_post(handler):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = admission_test_controller.update_test(item_id, body)
            if not updated:
                res.error(handler, 404, "Admission test not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = admission_test_controller.create_test(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    deleted = admission_test_controller.delete_test(item_id)
    if not deleted:
        res.error(handler, 404, "Admission test not found")
        return
    res.ok(handler, {"ok": True})


def handle_import(handler):
    """POST /api/admission-tests/import — bulk upsert with cross-check."""
    body = _read_json_body(handler)
    try:
        stats = admission_test_controller.import_tests(body.get("items") or [])
        res.ok(handler, {
            "ok": True,
            "inserted": len(stats["inserted"]),
            "skipped": stats["skipped"],
        })
    except Exception as err:
        res.error(handler, 500, f"Import failed: {err}")


def register_admission_test_routes(handler, method, path):
    """Dispatch /api/admission-tests requests to the right handler."""
    if not path.startswith("/api/admission-tests"):
        return False
    if path == "/api/admission-tests/import":
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
