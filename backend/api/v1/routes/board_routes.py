# backend/api/v1/routes/board_routes.py
"""Board & Regulatory Setup routes.

Endpoints:
  GET    /api/boards                → { boards: [...] }
  POST   /api/boards                → create → { ok, id }
  POST   /api/boards?id=N           → update → { ok, id }
  DELETE /api/boards?id=N           → delete → { ok }
  POST   /api/boards/import         → bulk upsert with cross-check
"""

import json
import urllib.parse

from backend.api.v1.controllers import board_controller
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
    res.ok(handler, {"boards": board_controller.list_boards()})


def handle_post(handler):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = board_controller.update_board(item_id, body)
            if not updated:
                res.error(handler, 404, "Board not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = board_controller.create_board(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    deleted = board_controller.delete_board(item_id)
    if not deleted:
        res.error(handler, 404, "Board not found")
        return
    res.ok(handler, {"ok": True})


def handle_import(handler):
    """POST /api/boards/import — bulk upsert with cross-check.

    Body: { "items": [...] } — boards whose name already exists are skipped;
    only new boards are inserted.
    """
    body = _read_json_body(handler)
    try:
        stats = board_controller.import_boards(body.get("items") or [])
        res.ok(handler, {
            "ok": True,
            "inserted": len(stats["inserted"]),
            "skipped": stats["skipped"],
        })
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Import failed: {err}")


def register_board_routes(handler, method, path):
    """Dispatch /api/boards requests to the right handler."""
    if not path.startswith("/api/boards"):
        return False
    if path == "/api/boards/import":
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
