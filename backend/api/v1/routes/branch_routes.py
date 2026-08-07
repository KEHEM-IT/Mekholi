# backend/api/v1/routes/branch_routes.py
"""Branches/campus resource routes — GET list, POST create/update, DELETE."""

import json
import urllib.parse

from backend.api.v1.controllers import branch_controller
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
    res.ok(handler, {"branches": branch_controller.list_branches()})


def handle_post(handler):
    body = _read_json_body(handler)
    branch_id = _get_id(handler)
    try:
        if branch_id:
            updated = branch_controller.update_branch(branch_id, body)
            if not updated:
                res.error(handler, 404, "Branch not found")
                return
            res.ok(handler, {"ok": True, "id": branch_id})
        else:
            new_id = branch_controller.create_branch(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    branch_id = _get_id(handler)
    if not branch_id:
        res.error(handler, 400, "Branch id is required")
        return
    deleted = branch_controller.delete_branch(branch_id)
    if not deleted:
        res.error(handler, 404, "Branch not found")
        return
    res.ok(handler, {"ok": True})


def register_branch_routes(handler, method, path):
    """Dispatch /api/branches requests to the right handler."""
    if not path.startswith("/api/branches"):
        return False
    if method == "GET":
        handle_get(handler)
    elif method == "POST":
        handle_post(handler)
    elif method == "DELETE":
        handle_delete(handler)
    else:
        res.error(handler, 405, "Method not allowed")
    return True
