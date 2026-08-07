# backend/api/v1/routes/academic_year_routes.py
"""Academic year resource routes — GET list, POST create/update, DELETE."""

import json
import urllib.parse

from backend.api.v1.controllers import academic_year_controller
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
    res.ok(handler, {"academic_years": academic_year_controller.list_years()})


def handle_post(handler):
    body = _read_json_body(handler)
    year_id = _get_id(handler)
    try:
        if year_id:
            updated = academic_year_controller.update_year(year_id, body)
            if not updated:
                res.error(handler, 404, "Academic year not found")
                return
            res.ok(handler, {"ok": True, "id": year_id})
        else:
            new_id = academic_year_controller.create_year(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    year_id = _get_id(handler)
    if not year_id:
        res.error(handler, 400, "Academic year id is required")
        return
    deleted = academic_year_controller.delete_year(year_id)
    if not deleted:
        res.error(handler, 404, "Academic year not found")
        return
    res.ok(handler, {"ok": True})


def handle_import(handler):
    """POST /api/academic-years/import — bulk upsert with cross-check.

    Body: { "items": [...] } — rows whose year_name already exists are
    skipped; only new years are inserted.
    """
    body = _read_json_body(handler)
    try:
        stats = academic_year_controller.import_years(body.get("items") or [])
        res.ok(handler, {
            "ok": True,
            "inserted": len(stats["inserted"]),
            "skipped": stats["skipped"],
        })
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Import failed: {err}")


def register_academic_year_routes(handler, method, path):
    """Dispatch /api/academic-years requests to the right handler."""
    if not path.startswith("/api/academic-years"):
        return False
    if path == "/api/academic-years/import":
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
