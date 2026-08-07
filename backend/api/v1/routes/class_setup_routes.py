# backend/api/v1/routes/class_setup_routes.py
"""Class / Section / Group / Shift resource routes — shared CRUD dispatch.

Endpoints:
  GET    /api/classes|sections|groups|shifts       → { <entity>: [...] }
  POST   /api/classes|sections|groups|shifts       → create → { ok, id }
  POST   /api/classes|sections|groups|shifts?id=N  → update → { ok, id }
  DELETE /api/classes|sections|groups|shifts?id=N  → delete → { ok }
"""

import json
import urllib.parse

from backend.api.v1.controllers import class_setup_controller
from backend.utils import response as res

ENTITY_PATHS = {"/api/classes": "classes", "/api/sections": "sections",
                "/api/groups": "groups", "/api/shifts": "shifts"}


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
    res.ok(handler, {entity: class_setup_controller.list_items(entity)})


def _handle_post(handler, entity):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = class_setup_controller.update_item(entity, item_id, body)
            if not updated:
                res.error(handler, 404, "Item not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = class_setup_controller.create_item(entity, body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def _handle_delete(handler, entity):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    deleted = class_setup_controller.delete_item(entity, item_id)
    if not deleted:
        res.error(handler, 404, "Item not found")
        return
    res.ok(handler, {"ok": True})


def _handle_import(handler):
    """POST /api/class-setup/import — bulk upsert with cross-check.

    Body: { "classes": [...], "sections": [...], "groups": [...], "shifts": [...] }
    Existing matches (by natural key) are kept, only new rows are inserted.
    """
    body = _read_json_body(handler)
    try:
        result = {"inserted": {}, "skipped": {}}
        for entity in ("classes", "sections", "groups", "shifts"):
            items = body.get(entity) or []
            if not items:
                result["inserted"][entity] = 0
                result["skipped"][entity] = []
                continue
            stats = class_setup_controller.import_items(entity, items)
            result["inserted"][entity] = len(stats["inserted"])
            result["skipped"][entity] = stats["skipped"]
        res.ok(handler, {"ok": True, **result})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Import failed: {err}")


def register_class_setup_routes(handler, method, path):
    """Dispatch /api/classes|sections|groups|shifts and /api/class-setup/import."""
    if path == "/api/class-setup/import":
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
