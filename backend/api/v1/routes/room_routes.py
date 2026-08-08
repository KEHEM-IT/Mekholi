# backend/api/v1/routes/room_routes.py
"""Classrooms / Rooms / Buildings routes — shared CRUD dispatch.

Endpoints:
  GET    /api/buildings|rooms                 → { <entity>: [...] }
  POST   /api/buildings|rooms                 → create → { ok, id }
  POST   /api/buildings|rooms?id=N            → update → { ok, id }
  DELETE /api/buildings|rooms?id=N            → delete → { ok }
  POST   /api/rooms/import                    → bulk upsert with cross-check
"""

import json
import urllib.parse

from backend.api.v1.controllers import room_controller
from backend.utils import response as res

ENTITY_PATHS = {
    "/api/buildings": "buildings",
    "/api/rooms": "rooms",
}


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


def _handle_get(handler, entity):
    res.ok(handler, {entity: room_controller.list_items(entity)})


def _handle_post(handler, entity):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = room_controller.update_item(entity, item_id, body)
            if not updated:
                res.error(handler, 404, "Item not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = room_controller.create_item(entity, body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def _handle_delete(handler, entity):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    deleted = room_controller.delete_item(entity, item_id)
    if not deleted:
        res.error(handler, 404, "Item not found")
        return
    res.ok(handler, {"ok": True})


def _handle_import(handler):
    """POST /api/rooms/import — bulk upsert with cross-check.

    Body: { "buildings": [...], "rooms": [...] }
    Existing matches (by natural key) are kept, only new rows are inserted.
    """
    body = _read_json_body(handler)
    try:
        result = {"inserted": {}, "skipped": {}}
        for entity in ("buildings", "rooms"):
            items = body.get(entity) or []
            if not items:
                result["inserted"][entity] = 0
                result["skipped"][entity] = []
                continue
            stats = room_controller.import_items(entity, items)
            result["inserted"][entity] = len(stats["inserted"])
            result["skipped"][entity] = stats["skipped"]
        res.ok(handler, {"ok": True, **result})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Import failed: {err}")


def register_room_routes(handler, method, path):
    """Dispatch /api/buildings and /api/rooms requests."""
    if path == "/api/rooms/import":
        if method == "POST":
            _handle_import(handler)
        else:
            res.error(handler, 405, "Method not allowed")
        return True
    entity = ENTITY_PATHS.get(path)
    if not entity:
        return False
    if method == "GET":
        _handle_get(handler, entity)
    elif method == "POST":
        _handle_post(handler, entity)
    elif method == "DELETE":
        _handle_delete(handler, entity)
    else:
        res.error(handler, 405, "Method not allowed")
    return True
