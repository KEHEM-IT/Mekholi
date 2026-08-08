# backend/api/v1/routes/grading_scheme_routes.py
"""Grading scheme resource routes.

Endpoints:
  GET    /api/grading-schemes                  → { grading_schemes: [...] }
  POST   /api/grading-schemes                  → create → { ok, id }
  POST   /api/grading-schemes?id=N             → update → { ok, id }
  DELETE /api/grading-schemes?id=N             → delete → { ok }
  POST   /api/grading-schemes/import           → bulk upsert with cross-check
"""

import json
import urllib.parse

from backend.api.v1.controllers import grading_scheme_controller
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
    res.ok(handler, {"grading_schemes": grading_scheme_controller.list_schemes()})


def handle_post(handler):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = grading_scheme_controller.update_scheme(item_id, body)
            if not updated:
                res.error(handler, 404, "Scheme not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = grading_scheme_controller.create_scheme(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    deleted = grading_scheme_controller.delete_scheme(item_id)
    if not deleted:
        res.error(handler, 404, "Scheme not found")
        return
    res.ok(handler, {"ok": True})


def handle_import(handler):
    """POST /api/grading-schemes/import — bulk upsert with cross-check.

    Body: { "items": [...] } — schemes whose name already exists are skipped;
    only new schemes are inserted.
    """
    body = _read_json_body(handler)
    try:
        stats = grading_scheme_controller.import_schemes(body.get("items") or [])
        res.ok(handler, {
            "ok": True,
            "inserted": len(stats["inserted"]),
            "skipped": stats["skipped"],
        })
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Import failed: {err}")


def register_grading_scheme_routes(handler, method, path):
    """Dispatch /api/grading-schemes requests to the right handler."""
    if not path.startswith("/api/grading-schemes"):
        return False
    if path == "/api/grading-schemes/import":
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
